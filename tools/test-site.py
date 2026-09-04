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
        self.assertEqual(
            [attrs.get("src") for attrs in scripts],
            [
                "js/manifest.js", "js/substrate.js", "js/claims.js",
                "js/ledger.js", "js/instrument.js", "js/site.js",
            ],
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

        fingerprint = "".join(expected_sri[resource] for resource in RESOURCES)
        build_hash = hashlib.sha256(fingerprint.encode("utf-8")).hexdigest()[:16].upper()
        for page in HTML_FILES:
            metas = [attrs for tag, attrs in parse_page(page).tags
                     if tag == "meta" and attrs.get("name") == "build-hash"]
            self.assertEqual([attrs.get("content") for attrs in metas], [build_hash], page)
        cache = re.search(r"var CACHE = 'cytherai-substrate-([0-9A-F]+)(?:-r\d+)?'", SW_SOURCE)
        self.assertIsNotNone(cache)
        self.assertEqual(cache.group(1), build_hash)

    def test_deploy_allowlist_and_service_worker_cannot_drift(self) -> None:
        self.assertEqual(len(DEPLOY_FILES), len(set(DEPLOY_FILES)), "deploy allowlist contains duplicates")
        for relative in DEPLOY_FILES:
            self.assertTrue((ROOT / relative).is_file(), f"allowlisted file missing: {relative}")
        for forbidden in ("backup/", "newC3/", "trajectory-engine/", "docs/", "awc-os/"):
            self.assertFalse(any(path.startswith(forbidden) for path in DEPLOY_FILES), forbidden)

        assets_block = re.search(r"var ASSETS = \[(.*?)\n\];", SW_SOURCE, re.DOTALL)
        self.assertIsNotNone(assets_block)
        sw_assets = re.findall(r"'([^']+)'", assets_block.group(1))
        self.assertEqual(len(sw_assets), len(set(sw_assets)), "service-worker assets contain duplicates")
        self.assertTrue(set(sw_assets).issubset(DEPLOY_FILES))
        self.assertTrue(set(HTML_FILES).issubset(DEPLOY_FILES))

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

    def test_performance_and_mobile_clearance_contract(self) -> None:
        jsc = "/System/Library/Frameworks/JavaScriptCore.framework/Versions/A/Helpers/jsc"
        probe = (
            'load("js/manifest.js");load("js/substrate.js");'
            'print(JSON.stringify({d:[390,720,1280].map(CytherSubstrate.dprCapFor),'
            'b:[390,720,1280].map(CytherSubstrate.binTargetFor)}))'
        )
        policy = json.loads(subprocess.run(
            [jsc, "-e", probe], cwd=ROOT, check=True, capture_output=True, text=True
        ).stdout)
        self.assertEqual(policy, {"d": [1.25, 1.5, 2], "b": [360000, 520000, 720000]})

        substrate = (ROOT / "js/substrate.js").read_text(encoding="utf-8")
        manifest = (ROOT / "js/manifest.js").read_text(encoding="utf-8")
        site = (ROOT / "js/site.js").read_text(encoding="utf-8")
        index = (ROOT / "index.html").read_text(encoding="utf-8")
        self.assertIn("function admissionMetrics", manifest)
        self.assertIn("return admissionMetrics(p).richness", manifest)
        self.assertIn("return admissionMetrics(p).legibility", manifest)
        self.assertIn("fields[plateDev.i] = summarizeField(plateDev)", substrate)
        self.assertIn("const toneNow = done || (!reduced", substrate)
        self.assertIn('style.setProperty("--stripH"', site)
        self.assertIn("footer{padding-bottom:calc(var(--stripH", index)

        awc = ROOT / "awc-os/index.html"
        if awc.exists():
            awc_source = awc.read_text(encoding="utf-8")
            self.assertNotIn('fetch("media/AWC_OS_film_ar.mp4", {method:"HEAD"})', awc_source)
            self.assertIn('addEventListener("error"', awc_source)

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
        corpus = VAIC.load_json(ROOT / "vaic/cytherai-obligations.v0.json")
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

    def test_viewport_change_never_displays_a_geometrically_false_world(self) -> None:
        """A plate may be stale in coverage; it may never be stale in geometry.

        The camera centre must land at the viewport centre through every visible
        tile immediately after a viewport change — before any redevelopment — and
        again once a redeveloped backing matches the current frame. The previous
        contract asserted the opposite (that the height branch must never call
        developAll), which preserved the defect it was meant to guard.
        """
        jsc = "/System/Library/Frameworks/JavaScriptCore.framework/Versions/A/Helpers/jsc"
        probe = """
load("js/manifest.js"); load("js/substrate.js");
var S = CytherSubstrate, CM = CytherManifest, Z = S.ZOOMS;
var c0 = S.deriveAnchors(CM.CANON), ANCH = c0.ANCH, span = c0.bounds.span;
function Ufor(W, H) { return Math.min(W, H) / span * 0.92; }
function err(rW, rH, W, H, mode) {
  var r = { W: rW, H: rH, U: Ufor(rW, rH) }, U = Ufor(W, H), worst = 0;
  for (var i = 1; i <= 299; i++) {
    var p = i / 300, cam = S.cameraAt(p, ANCH, U, W, H);
    for (var k = 0; k < 4; k++) {
      var raw = cam.tiles[k];
      if (raw.o <= 0) continue;
      var t = mode === "stretched" ? raw : S.composeTile(raw, W, H, U, r);
      var X = r.W / 2 + (cam.cx - ANCH[k][0]) * Z[k] * r.U;
      var Y = r.H / 2 + (cam.cy - ANCH[k][1]) * Z[k] * r.U;
      if (mode === "stretched") Y *= H / r.H;
      worst = Math.max(worst, Math.hypot(t.tx + t.A * X - W / 2, t.ty + t.A * Y - H / 2));
    }
  }
  return worst;
}
var settled = { W: 390, H: 664, U: Ufor(390, 664) };
var one = S.cameraAt(0.5, ANCH, settled.U, 390, 664).tiles[1];
print(JSON.stringify({
  composed: [err(390, 664, 390, 750, "c"), err(1200, 1000, 1200, 600, "c")],
  healed: err(390, 750, 390, 750, "c"),
  stretched: [err(390, 664, 390, 750, "stretched"), err(1200, 1000, 1200, 600, "stretched")],
  scaleMoves: [Ufor(390, 664) !== Ufor(390, 750), Ufor(1200, 1000) !== Ufor(1200, 600)],
  uncompensated: S.composeTile(one, 390, 664, settled.U, settled) === one
}));
"""
        frame = json.loads(subprocess.run(
            [jsc, "-e", probe], cwd=ROOT, check=True, capture_output=True, text=True
        ).stdout)

        # before any redevelopment, both a chrome-height change and a scale-changing
        # window resize compose exactly; sub-nanometre residue is float noise only
        self.assertLess(max(frame["composed"]), 1e-9, "composition is not frame-exact")
        # after redevelopment the backing frame is the current frame, and an
        # identity frame returns the camera's own tile with no compensation applied
        self.assertLess(frame["healed"], 1e-9)
        self.assertTrue(frame["uncompensated"], "a settled frame must not be recomposed")
        # the desktop case must remain in the fixture: it is the one where the world
        # scale itself moves, so a mobile-only test could pass on a broken build
        self.assertEqual(frame["scaleMoves"], [False, True])
        # control — the discarded stretch-to-fit behaviour is caught by this test
        self.assertGreater(min(frame["stretched"]), 60)


if __name__ == "__main__":
    unittest.main(verbosity=2)
