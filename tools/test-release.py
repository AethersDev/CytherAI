#!/usr/bin/env python3
"""test-release.py — the two commands a release trusts, deploy.sh and publish.sh, against what goes wrong round them (the audit of
2026-11-24: a failed build erased the last artifact, an inherited DIST named what was erased, a publish went ahead on expired browser
observations, and two publishers could replace each other unseen).

Each test runs the scripts as they stand in this tree, copied into a three-file site of its own under a temporary directory.
deploy.sh reads the allowlist beside itself, so there it builds that site. publish.sh pushes to that site's own bare remote, with
./verify.sh and the validator as stubs: what publish.sh does with their answers is tested here, what they answer is
tools/test-vaic.py's. Nothing here touches this repository, its dist/ or its origin.

Run: python3 tools/test-release.py   ·   one: python3 tools/test-release.py PublishTests.test_<name>
"""
import json, os, shutil, subprocess, tempfile, unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OLD, NEW, OTHER = "00000000000000A1", "00000000000000B2", "00000000000000C3"
SERVED = ("index.html", "js/film.js", "sw.js")
# no hook, signing key or template of the machine's enters a fixture
ENV = {**os.environ, "GIT_CONFIG_GLOBAL": os.devnull, "GIT_CONFIG_NOSYSTEM": "1"}


def page(build: str) -> str:
    return f'<!doctype html><meta name="build-hash" content="{build}">\n'


def git(cwd: Path, *args: str) -> str:
    return subprocess.run(["git", *args], cwd=cwd, env=ENV, capture_output=True, text=True, check=True).stdout.strip()


def site(root: Path) -> Path:
    (root / "js").mkdir(parents=True)
    (root / "index.html").write_text(page(NEW), encoding="utf-8")
    (root / "js/film.js").write_text("// the film\n", encoding="utf-8")
    (root / "sw.js").write_text("var ASSETS = [\n  'index.html',\n  'js/film.js?v=0123456789ab'\n];\n", encoding="utf-8")
    (root / "deploy.paths").write_text("".join(path + "\n" for path in SERVED), encoding="utf-8")
    for script in ("deploy.sh", "publish.sh"):
        shutil.copy2(ROOT / script, root / script)
    return root


def files(directory: Path) -> dict[str, bytes]:
    return {path.relative_to(directory).as_posix(): path.read_bytes() for path in sorted(directory.rglob("*")) if path.is_file()}


class Fixture(unittest.TestCase):
    def setUp(self) -> None:
        tmp = tempfile.TemporaryDirectory()
        self.addCleanup(tmp.cleanup)
        self.tmp = Path(tmp.name).resolve()
        self.root = site(self.tmp / "site")


class DeployTests(Fixture):
    def deploy(self, *args: str, **env: str) -> subprocess.CompletedProcess:
        return subprocess.run(["./deploy.sh", *args], cwd=self.root, env={**ENV, **env}, capture_output=True, text=True)

    def built(self) -> dict[str, bytes]:
        run = self.deploy()
        self.assertEqual(run.returncode, 0, run.stderr)
        self.assertEqual(sorted(files(self.root / "dist")), sorted(SERVED))
        return files(self.root / "dist")

    def leftovers(self) -> list[str]:
        return sorted(path.name for path in self.root.iterdir() if path.name.startswith("dist."))

    def test_a_missing_source_keeps_the_last_artifact(self) -> None:
        good = self.built()
        (self.root / "js/film.js").unlink()
        run = self.deploy()
        self.assertNotEqual(run.returncode, 0)
        self.assertIn("allowlisted js/film.js not found", run.stderr)
        self.assertEqual(files(self.root / "dist"), good, "the last good artifact stands")
        self.assertEqual(self.leftovers(), [])

    def test_a_build_that_fails_its_own_check_keeps_the_last_artifact(self) -> None:
        """A failure after the copying has begun: the worker precaches a file the allowlist does not ship."""
        good = self.built()
        (self.root / "sw.js").write_text("var ASSETS = [\n  'index.html',\n  'js/gone.js'\n];\n", encoding="utf-8")
        run = self.deploy()
        self.assertNotEqual(run.returncode, 0)
        self.assertIn("sw.js precaches js/gone.js", run.stderr)
        self.assertEqual(files(self.root / "dist"), good)
        self.assertEqual(self.leftovers(), [], "the half-built artifact is cleared away")

    def test_an_artifact_is_replaced_whole(self) -> None:
        self.built()
        (self.root / "dist/js/.DS_Store").write_bytes(b"the Finder was here")   # opening the artifact in the Finder does not make it another's
        (self.root / "index.html").write_text(page(OTHER), encoding="utf-8")
        self.assertEqual(self.built()["index.html"].decode(), page(OTHER))
        self.assertEqual(self.leftovers(), [])

    def test_a_destination_that_is_not_an_artifact_is_left_whole(self) -> None:
        notes = self.tmp / "notes"
        notes.mkdir()
        (notes / "thesis.txt").write_text("not the site's", encoding="utf-8")
        (notes / "index.html").write_text("nor this", encoding="utf-8")
        link = self.tmp / "link"
        link.symlink_to(notes, target_is_directory=True)
        a_file = self.tmp / "a-file"
        a_file.write_text("a file", encoding="utf-8")
        before = {target: files(target) for target in (notes, self.root)}
        for target, said in ((notes, "thesis.txt"), (self.root, "deploy.paths"), (link, "not a directory"), (a_file, "not a directory")):
            with self.subTest(target.name):
                run = self.deploy(str(target))
                self.assertNotEqual(run.returncode, 0)
                self.assertIn(said, run.stderr)
        self.assertEqual({target: files(target) for target in (notes, self.root)}, before)
        self.assertEqual(a_file.read_text(encoding="utf-8"), "a file")

    def test_the_environment_names_no_destination(self) -> None:
        """Until 2026-11-24 the destination was $DIST, removed before anything was checked."""
        elsewhere = self.tmp / "elsewhere"
        elsewhere.mkdir()
        (elsewhere / "keep.txt").write_text("kept", encoding="utf-8")
        run = self.deploy(DIST=str(elsewhere))
        self.assertEqual(run.returncode, 0, run.stderr)
        self.assertEqual(files(elsewhere), {"keep.txt": b"kept"})
        self.assertEqual(sorted(files(self.root / "dist")), sorted(SERVED))


class PublishTests(Fixture):
    def setUp(self) -> None:
        super().setUp()
        (self.root / "CNAME").write_text("example.invalid\n", encoding="utf-8")
        (self.root / "verify.sh").write_text("#!/bin/sh\nexit 0\n", encoding="utf-8")
        (self.root / "verify.sh").chmod(0o755)
        (self.root / "tools").mkdir()
        self.verdict("VALID")
        self.origin = self.tmp / "origin.git"
        git(self.tmp, "init", "-q", "--bare", str(self.origin))
        self.old = self.artifact("old", OLD)                    # what is live before the test
        git(self.tmp / "old", "push", "-q", str(self.origin), "gh-pages:gh-pages")
        git(self.root, "init", "-q")
        git(self.root, "symbolic-ref", "HEAD", "refs/heads/master")
        git(self.root, "config", "user.name", "a publisher")
        git(self.root, "config", "user.email", "publisher@example.invalid")
        git(self.root, "remote", "add", "origin", str(self.origin))
        self.commit("the release")
        self.scratch = self.tmp / "scratch"                     # the run's TMPDIR: its output directory must be gone afterwards
        self.scratch.mkdir()

    def verdict(self, projection: str, *open_ids: str) -> None:
        """The validator's answer, as publish.sh asks for it (--json)."""
        (self.root / "tools/vaic_validate.py").write_text(
            f"import json\nprint(json.dumps({{'projection': {projection!r}, 'projection_open': {list(open_ids)!r}}}))\n", encoding="utf-8")

    def commit(self, message: str) -> None:
        git(self.root, "add", "-A")
        git(self.root, "commit", "-q", "-m", message)

    def artifact(self, name: str, build: str) -> str:
        """Another publisher's artifact: a single commit on gh-pages naming its build."""
        repo = self.tmp / name
        repo.mkdir()
        (repo / "index.html").write_text(page(build), encoding="utf-8")
        git(repo, "init", "-q")
        git(repo, "symbolic-ref", "HEAD", "refs/heads/gh-pages")
        git(repo, "add", "-A")
        git(repo, "-c", "user.name=t", "-c", "user.email=t@example.invalid", "commit", "-q", "-m", f"publish {build}")
        return git(repo, "rev-parse", "HEAD")

    def publish(self, *args: str, cwd: Path | None = None, **env: str) -> subprocess.CompletedProcess:
        return subprocess.run(["./publish.sh", *args], cwd=cwd or self.root, env={**ENV, "TMPDIR": str(self.scratch), **env},
                              capture_output=True, text=True)

    def remote(self, ref: str) -> str | None:
        found = subprocess.run(["git", "rev-parse", "--verify", "--quiet", ref], cwd=self.origin, env=ENV, capture_output=True, text=True)
        return found.stdout.strip() or None

    def live(self) -> str:
        return git(self.origin, "show", "gh-pages:index.html")

    def test_expired_browser_observations_stop_the_publish_before_any_push(self) -> None:
        self.verdict("INVALID", "CY-SEM-003", "CY-TEMP-001")
        self.commit("a build nobody has observed in a browser")
        run = self.publish()
        self.assertNotEqual(run.returncode, 0)
        self.assertIn("no current PASS for: CY-SEM-003 CY-TEMP-001", run.stdout)
        self.assertEqual(self.remote("gh-pages"), self.old, "nothing was pushed")
        self.assertIsNone(self.remote(f"rollback/{OLD}"))

    def test_a_complete_projection_publishes_with_the_origin_still_to_observe(self) -> None:
        run = self.publish()
        self.assertEqual(run.returncode, 0, run.stdout + run.stderr)
        listing = git(self.origin, "ls-tree", "-r", "--name-only", "gh-pages").split("\n")
        self.assertEqual(sorted(listing), sorted(SERVED))
        self.assertEqual(self.live(), page(NEW).strip())
        self.assertEqual(git(self.origin, "log", "-1", "--format=%s", "gh-pages"),
                         f"publish {NEW} ({git(self.root, 'rev-parse', '--short', 'HEAD')}), replacing {OLD}")
        self.assertEqual(self.remote(f"rollback/{OLD}"), self.old, "origin keeps the artifact it replaced")
        self.assertEqual(git(self.root, "rev-parse", f"rollback/{OLD}"), self.old)
        self.assertFalse((self.root / "dist").exists(), "a publish builds in a directory of its own")
        self.assertEqual(list(self.scratch.iterdir()), [], "and clears it away")

    def test_the_second_of_two_publishers_stops(self) -> None:
        """Both fetched the same live artifact. The other one pushes after this run has fetched and before it pushes
        (here: as this run commits its artifact). This run must stop, and the other's artifact stay live."""
        other = self.artifact("other", OTHER)
        hooks = self.tmp / "template/hooks"
        hooks.mkdir(parents=True)
        (hooks / "post-commit").write_text(
            f'#!/bin/sh\nenv -i PATH="$PATH" GIT_CONFIG_GLOBAL={os.devnull} git -C "{self.tmp / "other"}" push -q --force "{self.origin}" gh-pages:gh-pages\n',
            encoding="utf-8")
        (hooks / "post-commit").chmod(0o755)
        run = self.publish(GIT_TEMPLATE_DIR=str(hooks.parent))
        self.assertNotEqual(run.returncode, 0, run.stdout + run.stderr)
        self.assertIn("someone published since", run.stdout)
        self.assertEqual(self.remote("gh-pages"), other, "the newer artifact was not replaced")
        self.assertEqual(self.live(), page(OTHER).strip())

    def test_another_checkout_restores_the_artifact_that_was_replaced(self) -> None:
        self.assertEqual(self.publish().returncode, 0)
        second = self.tmp / "second"                            # a second machine: a clone that never saw the first publish
        git(self.tmp, "clone", "-q", "--no-checkout", str(self.origin), str(second))
        shutil.copy2(ROOT / "publish.sh", second / "publish.sh")
        self.assertIsNone(subprocess.run(["git", "rev-parse", "--verify", "--quiet", f"refs/heads/rollback/{OLD}"],
                                         cwd=second, env=ENV, capture_output=True, text=True).stdout.strip() or None)
        published = self.remote("gh-pages")
        run = self.publish("--restore", OLD, cwd=second)
        self.assertEqual(run.returncode, 0, run.stdout + run.stderr)
        self.assertEqual(self.remote("gh-pages"), self.old, "the very commit that was served")
        self.assertEqual(self.live(), page(OLD).strip())
        self.assertEqual(self.remote(f"rollback/{NEW}"), published, "and the artifact it replaced is kept in its turn")
        missing = self.publish("--restore", OTHER, cwd=second)
        self.assertNotEqual(missing.returncode, 0)
        self.assertIn(f"no rollback/{OTHER}", missing.stdout)
        self.assertEqual(self.remote("gh-pages"), self.old)


if __name__ == "__main__":
    unittest.main(verbosity=2)
