#!/usr/bin/env python3
"""test-record.py — tools/vaic_record.py, the one way an observation enters the record, against the audit of 2026-11-24: a result
is recorded under the probe, the day and the machine it says it came from; what is not a PASS of the stamped candidate is refused
whether or not Python is optimizing; an append interrupted between two files is finished by running it again; another observation
under a recorded name is refused; two appends at once both land.

Each test works on a copy of the ledger and the corpus under a temporary directory, stamped for a build nothing has observed.
The results are made here, in the shape the probes write: what the recorder does with a result is tested, not a browser.

Run: python3 tools/test-record.py   ·   one: python3 tools/test-record.py RecordTests.test_<name>
"""
import importlib.util, json, shutil, subprocess, sys, tempfile, threading, time, unittest
from pathlib import Path
from unittest import mock

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location("vaic_record", ROOT / "tools/vaic_record.py")
RECORD = importlib.util.module_from_spec(spec); spec.loader.exec_module(RECORD)
BUILD = "F00DF00DF00DF00D"


def ink(**over) -> dict:
    profile = {"elements_measured": 3, "below_4_5": 0, "worst": {"min": 5.5, "of": "a span"}, "samples": {"t0.0": {}, "t15.1": {}, "still": {}}}
    return {"artifact_build": BUILD, "chrome": "Chrome/1.2.3", "result": "PASS", "harness_version": "abcdef012345",
            "observed_at": "2031-02-03", "host": "macOS 99.0, Apple Silicon", "/ · dark · 1x1": profile, "/ar/ · light · 1x1": profile, **over}


def settle(**over) -> dict:
    page = {"1440x900": {"pass": True}, "worker": {"caches": [f"cytherai-substrate-{BUILD}"]}}
    return {"artifact_build": BUILD, "chrome": "Chrome/1.2.3", "result": "PASS", "harness_version": "0123456789ab",
            "observed_at": "2031-02-04", "host": "macOS 99.0, Apple Silicon", "/": page, "/ar/": page, **over}


def origin(**over) -> dict:
    return {"artifact_build": BUILD, "result": "PASS", "harness_version": "00112233aabb", "observed_at": "2031-02-05", "curl": "9.9.9",
            "origin": "https://example.invalid/ (a host)", "closure": {"served_files": 3}, "hidden_paths": {}, "styled_404_body": True, "mime": {},
            "byte_ranges": {}, "worker_cache": f"cytherai-substrate-{BUILD}", "tls": [], "www": {}, "headers_on_root": {}, "referrer_meta_pages": [1, 1], **over}


class RecordTests(unittest.TestCase):
    def setUp(self) -> None:
        tmp = tempfile.TemporaryDirectory()
        self.addCleanup(tmp.cleanup)
        self.tmp = Path(tmp.name)
        self.root = self.fresh("record")

    def fresh(self, name: str) -> Path:
        """A record of its own: this tree's ledger and corpus, the corpus stamped for a build nothing has observed, and a build
        record for the origin's line to close. No probe is in it: nothing on disk can be taken for the probe that ran."""
        root = self.tmp / name
        (root / "vaic/evidence").mkdir(parents=True)
        (root / "tools").mkdir()
        (root / "docs").mkdir()
        shutil.copy2(ROOT / "tools/vaic_record.py", root / "tools/vaic_record.py")
        shutil.copy2(ROOT / RECORD.LEDGER, root / RECORD.LEDGER)
        corpus = json.loads((ROOT / RECORD.CORPUS).read_text(encoding="utf-8"))
        corpus["candidate"]["build_identity"] = BUILD
        (root / RECORD.CORPUS).write_text(json.dumps(corpus, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
        (root / "docs/deploy.md").write_text(f"## 1. A build\n\nBuild `{BUILD}`. What it changed.\n\n## 2. The next section\n", encoding="utf-8")
        return root

    def state(self, root: Path | None = None) -> dict[str, str]:
        root = root or self.root
        return {path.relative_to(root).as_posix(): path.read_text(encoding="utf-8") for path in sorted(root.rglob("*")) if path.is_file()}

    def ledger(self) -> dict:
        return json.loads((self.root / RECORD.LEDGER).read_text(encoding="utf-8"))

    def receipts(self, oid: str) -> list[dict]:
        corpus = json.loads((self.root / RECORD.CORPUS).read_text(encoding="utf-8"))
        return [r for r in next(row for row in corpus["obligations"] if row["id"] == oid)["evaluation"]["receipts"] if r["artifact_build"] == BUILD]

    def test_a_result_is_recorded_as_its_probe_said(self) -> None:
        RECORD.browser(self.root, ink(), settle(), "what changed")
        seen = self.ledger()["observations"]
        for name, result in ((f"reading_ink_{BUILD}", ink()), (f"film_settle_{BUILD}", settle())):
            self.assertEqual(seen[name]["observed_at"], result["observed_at"])
            self.assertIn("Headless Chrome/1.2.3 (macOS 99.0, Apple Silicon) driven over", seen[name]["runtime"])
            self.assertIn(f"sha256 {result['harness_version']}", seen[name]["harness"])
            self.assertEqual(seen[name]["history"], "what changed")
        for oid, name, result in (("CY-SEM-003", f"reading_ink_{BUILD}", ink()), ("CY-TEMP-001", f"film_settle_{BUILD}", settle())):
            (receipt,) = self.receipts(oid)
            self.assertEqual((receipt["harness_version"], receipt["observed_at"], receipt["result"]), (result["harness_version"], result["observed_at"], "PASS"))
            self.assertEqual(receipt["evidence"], [f"{RECORD.LEDGER}#{name}"])
            self.assertIn("(macOS 99.0, Apple Silicon)", receipt["environment"]["runtime"])
        self.assertEqual(self.ledger()["artifact_builds"].count(BUILD), 1)

    def test_what_is_not_a_pass_of_the_candidate_is_refused_optimized_or_not(self) -> None:
        """python -O drops an assert, and until 2026-11-24 these refusals were asserts."""
        before = self.state()
        cases = {"another build's": (ink(artifact_build="0" * 16), settle()), "a FAIL": (ink(), settle(result="FAIL")),
                 "an older probe's, which says no digest": ({k: v for k, v in ink().items() if k != "harness_version"}, settle()),
                 "one that says no day": (ink(), {k: v for k, v in settle().items() if k != "observed_at"})}
        for label, results in cases.items():
            for name, result in zip(("ink.json", "settle.json"), results):
                (self.tmp / name).write_text(json.dumps(result), encoding="utf-8")
            for flags in ([], ["-O"]):
                with self.subTest(label, flags=flags):
                    run = subprocess.run([sys.executable, *flags, "tools/vaic_record.py", str(self.tmp / "ink.json"), str(self.tmp / "settle.json"), "why"],
                                         cwd=self.root, capture_output=True, text=True)
                    self.assertNotEqual(run.returncode, 0)
                    self.assertIn("nothing recorded:", run.stderr)
                    self.assertEqual(self.state(), before)

    def test_an_interrupted_append_is_finished_by_running_it_again(self) -> None:
        whole = self.fresh("whole")
        RECORD.browser(whole, ink(), settle(), "why")
        RECORD.origin(whole, origin())
        replace = RECORD.os.replace
        for put_in_place in (0, 1, 2):          # interrupted before any file is in place, after the ledger, after the corpus
            with self.subTest(put_in_place=put_in_place):
                root = self.fresh(f"interrupted-{put_in_place}")
                RECORD.browser(root, ink(), settle(), "why")
                calls = iter(range(3))
                def interrupted(source, target):
                    if next(calls) == put_in_place: raise OSError("the power went")
                    replace(source, target)
                with mock.patch.object(RECORD.os, "replace", interrupted), self.assertRaises(OSError):
                    RECORD.origin(root, origin())
                self.assertNotEqual(self.state(root), self.state(whole))
                RECORD.origin(root, origin())
                self.assertEqual(self.state(root), self.state(whole), "the second run left exactly what an uninterrupted one leaves")

    def test_what_is_recorded_is_passed_over_when_the_same_and_refused_when_not(self) -> None:
        RECORD.browser(self.root, ink(), settle(), "why")
        RECORD.origin(self.root, origin())
        recorded = self.state()
        self.assertEqual(recorded["docs/deploy.md"].count("The live origin: CY-ORIGIN-001 PASS"), 1)
        self.assertLess(recorded["docs/deploy.md"].index("The live origin"), recorded["docs/deploy.md"].index("## 2. The next section"))
        RECORD.browser(self.root, ink(), settle(), "why")
        RECORD.origin(self.root, origin())
        self.assertEqual(self.state(), recorded, "the same again changes nothing: one observation, one receipt, one line")
        for label, again in (("another reading", lambda: RECORD.browser(self.root, ink(observed_at="2031-03-01"), settle(), "why")),
                             ("another account of it", lambda: RECORD.browser(self.root, ink(), settle(), "another story")),
                             ("another origin run", lambda: RECORD.origin(self.root, origin(curl="1.0.0")))):
            with self.subTest(label), self.assertRaisesRegex(SystemExit, "nothing recorded: .* already"):
                again()
            self.assertEqual(self.state(), recorded)

    def test_two_appends_at_once_both_land(self) -> None:
        """The second writer reads only once the first has put its files in place. Without the lock it reads the record the first
        is about to replace, and one of the two observations is lost."""
        inside = threading.Event()
        def first() -> None:
            with RECORD.record(self.root) as (ledger, _, _):
                ledger["observations"]["first"] = {"result": "PASS"}
                inside.set()
                time.sleep(0.3)
        def second() -> None:
            inside.wait()
            with RECORD.record(self.root) as (ledger, _, _):
                ledger["observations"]["second"] = {"result": "PASS"}
        threads = [threading.Thread(target=first), threading.Thread(target=second)]
        for thread in threads: thread.start()
        for thread in threads: thread.join()
        self.assertLessEqual({"first", "second"}, set(self.ledger()["observations"]))


if __name__ == "__main__":
    unittest.main(verbosity=2)
