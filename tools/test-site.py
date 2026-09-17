#!/usr/bin/env python3
"""Zero-dependency integration tests for the shipped static-site contract.

These tests cover the recent cross-page and release-integration changes that
cannot be exercised by the pure jsc suites: navigation completeness, local
resource closure, module order, SRI/build identity, deploy/service-worker
parity, CSP script posture, and manifest icon integrity.

Run: python3 tools/test-site.py
"""

from __future__ import annotations

import base64
import copy
import hashlib
import importlib.util
import json
import os
import re
import shutil
import struct
import subprocess
import sys
import tempfile
import unittest
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import urlsplit


ROOT = Path(__file__).resolve().parents[1]
INTEGRITY_SCRIPT = (ROOT / "generate-integrity.sh").read_text(encoding="utf-8")
SW_SOURCE = (ROOT / "sw.js").read_text(encoding="utf-8")

sys.dont_write_bytecode = True
_SPEC = importlib.util.spec_from_file_location("vaic_validate", ROOT / "tools/vaic_validate.py")
assert _SPEC and _SPEC.loader
VAIC = importlib.util.module_from_spec(_SPEC)
_SPEC.loader.exec_module(VAIC)


def shell_list(source: str, name: str) -> list[str]:
    match = re.search(rf"^{re.escape(name)}=\"(.*?)\"", source, re.MULTILINE | re.DOTALL)
    if not match:
        raise AssertionError(f"{name} list not found")
    return match.group(1).split()


RESOURCES = shell_list(INTEGRITY_SCRIPT, "RESOURCES")
HTML_FILES = shell_list(INTEGRITY_SCRIPT, "HTML_FILES")
# the deployable set is DECLARED ONCE and read here, by deploy.sh, and by the
# artifact identity in tools/vaic_validate.py — never transcribed a second time
DEPLOY_FILES = [line.strip() for line in
                (ROOT / "deploy.paths").read_text(encoding="utf-8").splitlines() if line.strip()]


class PageParser(HTMLParser):
    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self.tags: list[tuple[str, dict[str, str]]] = []
        self.ids: set[str] = set()
        self.nav_links: list[tuple[str, dict[str, str]]] = []
        self._in_nav = False
        self._anchor_attrs: dict[str, str] | None = None
        self._anchor_text: list[str] = []

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        values = {key: value or "" for key, value in attrs}
        self.tags.append((tag, values))
        if values.get("id"):
            self.ids.add(values["id"])
        if tag == "nav" and "nav" in values.get("class", "").split():
            self._in_nav = True
        if tag == "a" and self._in_nav:
            self._anchor_attrs = values
            self._anchor_text = []

    def handle_data(self, data: str) -> None:
        if self._anchor_attrs is not None:
            self._anchor_text.append(data)

    def handle_endtag(self, tag: str) -> None:
        if tag == "a" and self._anchor_attrs is not None:
            text = " ".join("".join(self._anchor_text).split())
            self.nav_links.append((text, self._anchor_attrs))
            self._anchor_attrs = None
            self._anchor_text = []
        if tag == "nav":
            self._in_nav = False


def parse_page(relative: str) -> PageParser:
    parser = PageParser()
    parser.feed((ROOT / relative).read_text(encoding="utf-8"))
    return parser


def local_target(page: str, raw_url: str) -> Path | None:
    parts = urlsplit(raw_url)
    if parts.scheme or parts.netloc or not parts.path:
        return None
    if parts.path == "/":
        return ROOT / "index.html"
    if parts.path.startswith("/"):
        return ROOT / parts.path.lstrip("/")
    return (ROOT / page).parent / parts.path


def sri_for(relative: str) -> str:
    digest = hashlib.sha384((ROOT / relative).read_bytes()).digest()
    return "sha384-" + base64.b64encode(digest).decode("ascii")


class SiteContractTests(unittest.TestCase):
    maxDiff = None

    def test_public_navigation_is_complete_and_marks_current_page(self) -> None:
        pages = {
            "contact.html": {
                "Brief": "pages/brief.html", "Contact": "contact.html",
                "Security": "pages/security.html", "Privacy": "pages/privacy.html",
                "Terms": "pages/terms.html",
            },
            "pages/brief.html": {
                "Brief": "brief.html", "Contact": "../contact.html",
                "Security": "security.html", "Privacy": "privacy.html", "Terms": "terms.html",
            },
            "pages/security.html": {
                "Brief": "brief.html", "Contact": "../contact.html",
                "Security": "security.html", "Privacy": "privacy.html", "Terms": "terms.html",
            },
            "pages/privacy.html": {
                "Brief": "brief.html", "Contact": "../contact.html",
                "Security": "security.html", "Privacy": "privacy.html", "Terms": "terms.html",
            },
            "pages/terms.html": {
                "Brief": "brief.html", "Contact": "../contact.html",
                "Security": "security.html", "Privacy": "privacy.html", "Terms": "terms.html",
            },
        }
        current = {
            "contact.html": "Contact", "pages/brief.html": "Brief",
            "pages/security.html": "Security", "pages/privacy.html": "Privacy",
            "pages/terms.html": "Terms",
        }
        for page, expected in pages.items():
            with self.subTest(page=page):
                links = parse_page(page).nav_links
                brand = [(text, attrs) for text, attrs in links if text == "CYTHERAI"]
                self.assertEqual(len(brand), 1)
                self.assertEqual(brand[0][1].get("aria-label"), "CytherAI home")
                content_links = [(text, attrs) for text, attrs in links if text != "CYTHERAI"]
                self.assertEqual({text: attrs.get("href") for text, attrs in content_links}, expected)
                marked = [text for text, attrs in content_links if attrs.get("aria-current") == "page"]
                self.assertEqual(marked, [current[page]])

    def test_every_local_page_resource_and_link_resolves(self) -> None:
        fetchable = {("script", "src"), ("img", "src"), ("source", "src")}
        for page in HTML_FILES:
            parsed = parse_page(page)
            for tag, attrs in parsed.tags:
                candidates: list[str] = []
                if (tag, "src") in fetchable and attrs.get("src"):
                    candidates.append(attrs["src"])
                if tag == "link" and attrs.get("href"):
                    rel = set(attrs.get("rel", "").split())
                    if rel & {"stylesheet", "icon", "manifest", "apple-touch-icon"}:
                        candidates.append(attrs["href"])
                if tag == "a" and attrs.get("href") and not attrs["href"].startswith("#"):
                    candidates.append(attrs["href"])
                for raw_url in candidates:
                    target = local_target(page, raw_url)
                    if target is not None:
                        self.assertTrue(target.is_file(), f"{page}: unresolved local target {raw_url}")

    def test_homepage_module_order_and_script_posture(self) -> None:
        index = parse_page("index.html")
        scripts = [attrs for tag, attrs in index.tags if tag == "script"]
        # load order is a contract: the record, the boundary engine, the claims (which read
        # CytherSubstrate's absence at load), then the set that registers its predicates
        self.assertEqual(
            [attrs.get("src") for attrs in scripts],
            ["js/manifest.js", "js/instrument.js", "js/claims.js", "js/drawing-set.js"],
        )
        self.assertTrue(all(attrs.get("defer") == "" for attrs in scripts))
        self.assertFalse(any(not attrs.get("src") for attrs in scripts), "index CSP forbids inline script")

        contact_scripts = [attrs for tag, attrs in parse_page("contact.html").tags if tag == "script"]
        self.assertEqual(len(contact_scripts), 1)
        self.assertFalse(contact_scripts[0].get("src"), "contact keeps exactly one inline form script")

        for page in ("pages/brief.html", "pages/privacy.html", "pages/security.html", "pages/terms.html"):
            source = (ROOT / page).read_text(encoding="utf-8")
            self.assertFalse([attrs for tag, attrs in parse_page(page).tags if tag == "script"], page)
            self.assertIn("script-src 'none'", source, page)

    def test_sri_build_hash_and_cache_identity_are_exact(self) -> None:
        expected_sri = {resource: sri_for(resource) for resource in RESOURCES}
        referenced: set[str] = set()
        for page in HTML_FILES:
            parsed = parse_page(page)
            for tag, attrs in parsed.tags:
                raw_url = attrs.get("src") if tag == "script" else attrs.get("href") if tag == "link" else None
                if not raw_url:
                    continue
                target = local_target(page, raw_url)
                if target is None:
                    continue
                try:
                    relative = target.resolve().relative_to(ROOT).as_posix()
                except ValueError:
                    continue
                if relative in expected_sri:
                    referenced.add(relative)
                    self.assertEqual(attrs.get("integrity"), expected_sri[relative], f"{page}: {relative}")
                    self.assertEqual(attrs.get("crossorigin"), "anonymous", f"{page}: {relative}")
        self.assertEqual(referenced, set(RESOURCES))

        build_hash = VAIC.build_identity(ROOT)
        for page in HTML_FILES:
            metas = [attrs for tag, attrs in parse_page(page).tags
                     if tag == "meta" and attrs.get("name") == "build-hash"]
            self.assertEqual([attrs.get("content") for attrs in metas], [build_hash], page)
        cache = re.search(r"var CACHE = 'cytherai-substrate-([0-9A-F]+)(?:-r\d+)?'", SW_SOURCE)
        self.assertIsNotNone(cache)
        self.assertEqual(cache.group(1), build_hash)

    def test_build_identity_commits_to_every_served_byte(self) -> None:
        """Same identity ⇒ same served candidate.

        A semantic HTML change, a worker change and an asset change must each move
        the stamped identity, and the shell projection must equal the Python one.
        What is not served — verifiers, docs, the receipt corpus — never moves it.
        """
        baseline = VAIC.build_identity(ROOT)
        self.assertEqual(baseline, VAIC.current_build(ROOT), "the stamp is the projection")
        mutations = {
            "index.html": lambda b: b.replace(b'aria-label="Sheet 1 \xe2\x80\x94 the statement"', b'aria-label="Sheet 1 \xe2\x80\x94 the statement (counterfactual)"', 1),
            "sw.js": lambda b: b.replace(b"var ASSETS = [", b"var ASSETS = [ /* counterfactual */", 1),
            "assets/og/og-card.png": lambda b: b[:-1] + bytes([b[-1] ^ 1]),
        }
        for relative, mutate in mutations.items():
            with tempfile.TemporaryDirectory() as tmp:
                root = Path(tmp)
                for path in DEPLOY_FILES + ["deploy.paths", "generate-integrity.sh"]:
                    (root / path).parent.mkdir(parents=True, exist_ok=True)
                    shutil.copy(ROOT / path, root / path)
                original = (root / relative).read_bytes()
                mutated = mutate(original)
                self.assertNotEqual(original, mutated, relative)
                (root / relative).write_bytes(mutated)
                run = subprocess.run(["bash", "generate-integrity.sh"], cwd=root, capture_output=True, text=True)
                self.assertEqual(run.returncode, 0, run.stderr)
                stamped = VAIC.current_build(root)
                self.assertNotEqual(stamped, baseline, relative)
                self.assertEqual(stamped, VAIC.build_identity(root), relative)
        served = set(DEPLOY_FILES)
        for relative in (*VAIC.IDENTITY_COVERAGE["verification_identity"],
                         "vaic/cytherai-obligations.v0.json", "docs/deploy.md", "CLAUDE.md"):
            self.assertNotIn(relative, served, relative)

    def test_deploy_allowlist_and_service_worker_cannot_drift(self) -> None:
        self.assertEqual(len(DEPLOY_FILES), len(set(DEPLOY_FILES)), "deploy allowlist contains duplicates")
        for relative in DEPLOY_FILES:
            self.assertTrue((ROOT / relative).is_file(), f"allowlisted file missing: {relative}")
        for forbidden in ("backup/", "newC3/", "docs/", "awc-os/"):
            self.assertFalse(any(path.startswith(forbidden) for path in DEPLOY_FILES), forbidden)

        assets_block = re.search(r"var ASSETS = \[(.*?)\n\];", SW_SOURCE, re.DOTALL)
        self.assertIsNotNone(assets_block)
        sw_assets = re.findall(r"'([^']+)'", assets_block.group(1))
        self.assertEqual(len(sw_assets), len(set(sw_assets)), "service-worker assets contain duplicates")
        self.assertTrue(set(sw_assets).issubset(DEPLOY_FILES))
        self.assertTrue(set(HTML_FILES).issubset(DEPLOY_FILES))

    def test_service_worker_installs_one_build_or_nothing(self) -> None:
        """A build is atomic only if install cannot precache the previous build's bytes.

        Reproduced in Chrome 151 under docs/deploy.md's headers (index.html and sw.js
        no-cache, modules max-age): addAll's default fetch took the old module from
        the HTTP cache, paired it with the new index.html whose SRI names the new
        one, and every load failed until the HTTP cache expired. Install therefore
        fetches past the HTTP cache, commits only when index.html's build stamp is
        this cache's own, and the fetch handler reads this build's cache alone.
        """
        install = SW_SOURCE[SW_SOURCE.index("addEventListener('install'"):SW_SOURCE.index("addEventListener('activate'")]
        self.assertIn("new Request(a, { cache: 'reload' })", install, "install must bypass the HTTP cache")
        self.assertNotIn("addAll", install, "addAll consults the HTTP cache")
        self.assertIn('/<meta name="build-hash" content="([0-9A-F]+)">/', install)
        self.assertLess(install.index("CACHE.indexOf(m[1]) < 0"), install.index("caches.open(CACHE)"),
                        "the stamp is checked before any byte is committed to the cache")
        self.assertEqual(re.findall(r"'([^']+)'", re.search(r"var ASSETS = \[(.*?)\n\];", SW_SOURCE, re.DOTALL).group(1))[0],
                         "index.html", "the stamp is read from ASSETS[0]")
        fetch_handler = SW_SOURCE[SW_SOURCE.index("addEventListener('fetch'"):]
        self.assertIn("caches.open(CACHE).then(function (cache) {\n      return cache.match(key)", fetch_handler,
                      "the handler reads this build's cache only, never a sibling's")
        self.assertNotIn("caches.match(", fetch_handler)

    def test_manifest_icons_are_valid_and_deployed(self) -> None:
        manifest = json.loads((ROOT / "manifest.webmanifest").read_text(encoding="utf-8"))
        for icon in manifest["icons"]:
            relative = icon["src"]
            self.assertIn(relative, DEPLOY_FILES)
            data = (ROOT / relative).read_bytes()
            if icon["type"] == "image/png":
                self.assertEqual(data[:8], b"\x89PNG\r\n\x1a\n")
                width, height = struct.unpack(">II", data[16:24])
                declared = tuple(map(int, icon["sizes"].split("x")))
                self.assertEqual((width, height), declared, relative)

    def test_every_sheet_is_addressable_and_the_edge_handle_meets_its_target(self) -> None:
        """The title block's sheet index (js/drawing-set.js) links #s1..#s7 — every sheet must
        carry that id, in order, or a visitor landing mid-set has no way across it. The FIG. 1
        handle draws a 14 px mark; its hit area is the ::after box, and must reach 24 px."""
        index = (ROOT / "index.html").read_text(encoding="utf-8")
        ids = re.findall(r'<section class="sheet[^"]*" id="(s\d)"', index)
        self.assertEqual(ids, [f"s{n}" for n in range(1, 8)])
        self.assertEqual(index.count('<section class="sheet'), 7)
        mark = re.search(r"\.handle\{[^}]*width:(\d+)px;height:(\d+)px[^}]*border:([\d.]+)px", index)
        hit = re.search(r"\.handle::after\{[^}]*inset:-(\d+)px", index)
        self.assertIsNotNone(mark); self.assertIsNotNone(hit)
        w, h, border, pad = int(mark.group(1)), int(mark.group(2)), float(mark.group(3)), int(hit.group(1))
        self.assertEqual((w, h), (14, 14), "the mark is the owner's: 14 px")
        # the pseudo-element is anchored to the padding box, inside the border
        self.assertGreaterEqual(min(w, h) - 2 * border + 2 * pad, 24, "the hit area must meet WCAG 2.5.8")
        for rule in (".counters button", ".proposal button", ".tb .idx a"):
            self.assertRegex(index, re.escape(rule) + r"\{[^}]*min-height:24px", rule)

    def test_subpage_inks_hold_aa_on_every_subpage_ground(self) -> None:
        """css/cytherai.css had no ink law until its quiet ink shipped at 4.01:1 on paper.

        Every subpage ink on every subpage ground, tokens read from the stylesheet and
        never restated here; the two quiet aliases must agree. (Formerly MOT-001 A10 in
        tools/test-motion.py, which retired with the world; this law is the subpages'.)
        """
        css = (ROOT / "css/cytherai.css").read_text(encoding="utf-8")
        tok = dict(re.findall(r"--([\w-]+):(#[0-9A-Fa-f]{6})", css))
        def rel(h):
            f = [(v / 255) / 12.92 if v / 255 <= 0.03928 else ((v / 255 + 0.055) / 1.055) ** 2.4
                 for v in (int(h[k:k + 2], 16) for k in (1, 3, 5))]
            return 0.2126 * f[0] + 0.7152 * f[1] + 0.0722 * f[2]
        def wcag(a, b):
            la, lb = rel(a), rel(b)
            return (max(la, lb) + 0.05) / (min(la, lb) + 0.05)
        grounds = {k: tok[k] for k in ("paper", "paper-lifted", "paper-dense", "panel")}
        inks = {k: tok[k] for k in ("ink", "ink-mid", "ink-quiet", "accent", "refuse")}
        worst = min((wcag(i, g), ik, gk) for ik, i in inks.items() for gk, g in grounds.items())
        self.assertGreaterEqual(worst[0], 4.5, f"{worst[1]} on {worst[2]} is {worst[0]:.2f}:1")
        self.assertEqual(tok["quiet"], tok["ink-quiet"])
        self.assertEqual(tok["label"], tok["ink-mid"])

    @staticmethod
    def synthetic_tree(paths: dict[str, str]):
        """A throwaway root declaring `paths`, for identity properties in isolation."""
        tmp = tempfile.TemporaryDirectory()
        root = Path(tmp.name)
        (root / "deploy.paths").write_text("".join(f"{name}\n" for name in paths), encoding="utf-8")
        for name, body in paths.items():
            target = root / name
            target.parent.mkdir(parents=True, exist_ok=True)
            target.write_text(body, encoding="utf-8")
        return tmp, root

    def test_artifact_identity_is_a_projection_of_tracked_source(self) -> None:
        """It describes what is deployable, not what happens to sit in dist/."""
        tmp, root = self.synthetic_tree({"index.html": "a", "js/site.js": "b"})
        with tmp:
            baseline, missing = VAIC.artifact_identity(root)
            self.assertEqual(missing, [])

            # build residue cannot move it, and it is computable with no dist/ at all
            (root / "dist").mkdir()
            (root / "dist" / ".DS_Store").write_text("junk", encoding="utf-8")
            (root / "dist" / "index.html").write_text("a", encoding="utf-8")
            self.assertEqual(VAIC.artifact_identity(root)[0], baseline)
            shutil.rmtree(root / "dist")
            self.assertEqual(VAIC.artifact_identity(root)[0], baseline)

            # an untracked, undeclared file cannot move it either
            (root / "scratch.txt").write_text("noise", encoding="utf-8")
            self.assertEqual(VAIC.artifact_identity(root)[0], baseline)

            # tracked content moves it
            (root / "js/site.js").write_text("changed", encoding="utf-8")
            self.assertNotEqual(VAIC.artifact_identity(root)[0], baseline)
            (root / "js/site.js").write_text("b", encoding="utf-8")
            self.assertEqual(VAIC.artifact_identity(root)[0], baseline)

            # so does topology: identical bytes at a different path is a different artifact
            (root / "js/runtime").mkdir()
            (root / "js/runtime/site.js").write_text("b", encoding="utf-8")
            (root / "deploy.paths").write_text("index.html\njs/runtime/site.js\n", encoding="utf-8")
            self.assertNotEqual(VAIC.artifact_identity(root)[0], baseline)

            # and a declared path that is not in the tree is reported, never raised
            (root / "deploy.paths").write_text("index.html\nabsent.js\n", encoding="utf-8")
            self.assertEqual(VAIC.artifact_identity(root)[1], ["absent.js"])

    def test_declared_deploy_set_is_exactly_what_deploy_ships(self) -> None:
        """One declaration feeds both operations, so the two cannot drift apart."""
        with tempfile.TemporaryDirectory() as tmp:
            dist = Path(tmp) / "artifact"
            run = subprocess.run(["./deploy.sh"], cwd=ROOT, capture_output=True, text=True,
                                 env={**os.environ, "DIST": str(dist)})
            self.assertEqual(run.returncode, 0, run.stderr)
            shipped = sorted(path.relative_to(dist).as_posix()
                             for path in dist.rglob("*") if path.is_file())
            self.assertEqual(shipped, sorted(DEPLOY_FILES))
            # the identity hashes exactly the bytes that were shipped
            for relative in shipped:
                self.assertEqual((dist / relative).read_bytes(), (ROOT / relative).read_bytes())

    def test_identities_represent_roles_not_merely_several_hashes(self) -> None:
        verification = set(VAIC.IDENTITY_COVERAGE["verification_identity"])
        artifact = set(VAIC.deploy_paths(ROOT))
        grammar = set(VAIC.IDENTITY_COVERAGE["grammar_hash"])
        # editing a harness must move verification identity and NOT artifact identity
        self.assertEqual(verification & artifact, set(),
                         "a verification file must never be shipped")
        self.assertEqual(verification & grammar, set())
        # the grammar is shipped, so editing it legitimately moves both
        self.assertTrue(grammar <= artifact, "the public grammar must be in the artifact")

    def test_every_current_failure_carries_an_open_disposition(self) -> None:
        """Policy consumes EFFECTIVE verdicts; the validator never reads this register.

        The validator says what a verdict is. This gate says what the institution has
        decided about it. Documentation may explain a failure differently; it may not
        make the failure disappear.
        """
        register = json.loads((ROOT / "vaic/release-dispositions.v0.json").read_text(encoding="utf-8"))
        disposed = {entry["subject"] for entry in register["dispositions"]}
        corpus = VAIC.load_json(ROOT / "vaic/cytherai-obligations.v1.json")
        matrix = VAIC.load_json(ROOT / "vaic/evaluator-matrix.v0.json")
        summary = VAIC.validate(corpus, matrix, ROOT)
        self.assertEqual(summary["structure"], "VALID")

        failing = self.effective_failures(corpus, matrix)
        self.assertEqual(sorted(failing - disposed), [], "a current FAIL with no disposition")

        # the gate must actually fire: a synthetic current FAIL with no entry is caught
        mutated = copy.deepcopy(corpus)
        row = next(r for r in mutated["obligations"] if r["id"] == "CY-ART-001")
        row["evaluation"]["result"] = "FAIL"
        for receipt in row["evaluation"]["receipts"]:
            receipt["result"] = "FAIL"
        self.assertEqual(self.effective_failures(mutated, matrix), {"CY-ART-001"})
        self.assertNotIn("CY-ART-001", disposed)

    @staticmethod
    def effective_failures(corpus, matrix) -> set[str]:
        summary = VAIC.validate(corpus, matrix, ROOT)
        distribution = summary["effective_distribution"]
        if distribution["status"] != "LICENSED" or not distribution["counts"]["FAIL"]:
            return set()
        build = corpus["candidate"]["build_identity"]
        verifier = corpus["candidate"]["verification_identity"]
        failing = set()
        for row in corpus["obligations"]:
            receipts = row["evaluation"].get("receipts") or []
            current = any(r.get("artifact_build") == build
                          and r.get("verification_identity") in (verifier, VAIC.EXTERNAL)
                          for r in receipts)
            if current and row["evaluation"]["result"] == "FAIL":
                failing.add(row["id"])
        return failing

    def test_every_recorded_failure_is_named_even_when_its_binding_expired(self) -> None:
        """A distinct rule from the current-FAIL gate, and the one with teeth today.

        An expired FAIL does not condemn this candidate, but it is a known defect,
        and a certification block must not become more optimistic by omission.
        """
        register = json.loads((ROOT / "vaic/release-dispositions.v0.json").read_text(encoding="utf-8"))
        disposed = {entry["subject"] for entry in register["dispositions"]}
        ledger_path = "vaic/evidence/current-browser-observations.v0.json"
        ledger = json.loads((ROOT / ledger_path).read_text(encoding="utf-8"))
        recorded = {f"{ledger_path}#{name}" for name, observation in ledger["observations"].items()
                    if isinstance(observation, dict) and observation.get("result") == "FAIL"}
        self.assertTrue(recorded, "the ledger records no FAIL; this gate would be vacuous")
        self.assertEqual(sorted(recorded - disposed), [],
                         "a recorded FAIL that the release register does not name")


if __name__ == "__main__":
    unittest.main(verbosity=2)
