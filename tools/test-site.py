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
import posixpath
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
# the deployable set is DECLARED ONCE and read here, by deploy.sh, by generate-integrity.sh (its pages) and by
# the artifact identity in tools/vaic_validate.py — never transcribed a second time: a page added to deploy.paths
# is stamped and held to every per-page law below, because no second list exists for it to be missing from
DEPLOY_FILES = [line.strip() for line in
                (ROOT / "deploy.paths").read_text(encoding="utf-8").splitlines() if line.strip()]
DEPLOYED = set(DEPLOY_FILES)
HTML_FILES = [path for path in DEPLOY_FILES if path.endswith(".html")]
HOST = (ROOT / "CNAME").read_text(encoding="utf-8").strip()
# the register rules in CLAUDE.md: the retired gold register, the document register, fake meters and the retired
# ledger's vocabulary may not reach a served file
BANNED = re.compile(r"--brass|--gold|DOC-2026-001|CONDUCT RECEIPT|[Aa]ppend-only|1e-12|−\d+\s?M\b")
# ADII keeps every URL its first publication served (the CVs included); AWC-OS ships its room and its films with their
# posters — not the live-MVP tunnel redirect, not the competition deck (the cancelled Alinma plan, withdrawn 2026-10-19 to
# backup/awc-os-v1/), and not the gateway's language toggle, retired with it to backup/before-rooms/awc-os/ (2026-10-21);
# CytherCAD's record is a page of its own
# the rooms: the pages a visitor reaches from the front door, drawn with css/room.css (2026-10-21)
ROOMS = ("adii/index.html", "ar/adii.html", "awc-os/index.html", "ar/awc-os.html", "cythercad/index.html", "ar/cythercad.html",
         "contact.html", "ar/contact.html")
# each evidence room and the front door it returns to
EVIDENCE = (("adii/index.html", "index.html"), ("ar/adii.html", "ar/index.html"), ("awc-os/index.html", "index.html"),
            ("ar/awc-os.html", "ar/index.html"), ("cythercad/index.html", "index.html"), ("ar/cythercad.html", "ar/index.html"))
REVIEWED_PUBLICATION = {
    "adii/": {"adii/index.html", "adii/favicon.svg", "adii/fonts/OFL.txt", "adii/fonts/ibm-plex-mono-400.woff2",
              "adii/fonts/newsreader-variable.woff2", "adii/fonts/public-sans-variable.woff2", "adii/poster.jpg",
              "adii/replay.mp4", "adii/cv/ibrahem.pdf", "adii/cv/jorie.pdf", "adii/cv/malek.pdf", "adii/cv/nasser.pdf"},
    "awc-os/": {"awc-os/index.html", "awc-os/media/AWC_OS_film_ar.mp4", "awc-os/media/AWC_OS_film_en.mp4",
                "awc-os/media/poster-ar.jpg", "awc-os/media/poster-en.jpg"},
    "cythercad/": {"cythercad/index.html"},
}


class PageParser(HTMLParser):
    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self.tags: list[tuple[str, dict[str, str]]] = []
        self.ids: set[str] = set()
        self.nav_links: list[tuple[str, dict[str, str]]] = []
        self.styles: list[str] = []      # the text of each <style>, whose url()s are fetched too
        self._in_nav = False
        self._in_style = False
        self._anchor_attrs: dict[str, str] | None = None
        self._anchor_text: list[str] = []

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        values = {key: value or "" for key, value in attrs}
        self.tags.append((tag, values))
        self._in_style = tag == "style"
        if values.get("id"):
            self.ids.add(values["id"])
        if tag == "nav" and "nav" in values.get("class", "").split():
            self._in_nav = True
        if tag == "a" and self._in_nav:
            self._anchor_attrs = values
            self._anchor_text = []

    def handle_data(self, data: str) -> None:
        if self._in_style:
            self.styles.append(data)
        if self._anchor_attrs is not None:
            self._anchor_text.append(data)

    def handle_endtag(self, tag: str) -> None:
        self._in_style = False
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


def local_target(page: str, raw_url: str) -> str | None:
    """The served path a same-origin URL on `page` names, resolved as a browser resolves it (a directory serves
    its index; ".." stops at the site's root), or None for another origin. Judged against deploy.paths, never
    against the source tree: a file in the repository that is not shipped 404s in production."""
    parts = urlsplit(raw_url)
    if parts.scheme or parts.netloc:
        return None
    if not parts.path:
        return page
    resolved = posixpath.normpath(posixpath.join("/" + posixpath.dirname(page), parts.path))
    if parts.path.endswith("/"):
        resolved = posixpath.join(resolved, "index.html")
    return resolved.lstrip("/")


def references(page: str) -> list[tuple[str, str]]:
    """(kind, url) for every URL `page` names: "fetch" for what a browser requests on its own (src, poster,
    data-src, srcset, a <link> other than alternate or canonical, a url() in its <style>), "link" for what a
    reader follows (<a>, alternate, canonical), "site" for the absolute URLs it gives others (og:url, og:image)."""
    parsed = parse_page(page)
    found = []
    for tag, attrs in parsed.tags:
        found += [("fetch", attrs[key]) for key in ("src", "poster", "data-src") if attrs.get(key)]
        found += [("fetch", item.split()[0]) for item in attrs.get("srcset", "").split(",") if item.strip()]
        if tag == "link" and attrs.get("href"):
            found.append(("link" if set(attrs.get("rel", "").split()) & {"alternate", "canonical"} else "fetch", attrs["href"]))
        if tag == "a" and attrs.get("href") and not attrs["href"].startswith("#"):
            found.append(("link", attrs["href"]))
        if tag == "meta" and attrs.get("property") in ("og:url", "og:image"):
            found.append(("site", attrs["content"]))
    found += [("fetch", url) for style in parsed.styles for url in css_urls(style)]
    return found


def css_urls(css: str) -> list[str]:
    return [m.group(2) for m in re.finditer(r"""url\((['"]?)([^'")]+)\1\)""", css) if not m.group(2).startswith("data:")]


def wcag(a: str, b: str) -> float:
    """WCAG 2.1 contrast of two #rrggbb colours"""
    def rel(h):
        f = [(v / 255) / 12.92 if v / 255 <= 0.03928 else ((v / 255 + 0.055) / 1.055) ** 2.4
             for v in (int(h[k:k + 2], 16) for k in (1, 3, 5))]
        return 0.2126 * f[0] + 0.7152 * f[1] + 0.0722 * f[2]
    la, lb = rel(a), rel(b)
    return (max(la, lb) + 0.05) / (min(la, lb) + 0.05)


def sri_for(relative: str) -> str:
    digest = hashlib.sha384((ROOT / relative).read_bytes()).digest()
    return "sha384-" + base64.b64encode(digest).decode("ascii")


class SiteContractTests(unittest.TestCase):
    maxDiff = None

    def test_public_navigation_is_complete_and_marks_current_page(self) -> None:
        """The cold-paper subpages' bar (the contact pages left it for the rooms on 2026-10-21: test_the_rooms_are_of_the_front_door)."""
        pages = {
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
            "pages/brief.html": "Brief",
            "pages/security.html": "Security", "pages/privacy.html": "Privacy",
            "pages/terms.html": "Terms",
        }
        for page, expected in pages.items():
            with self.subTest(page=page):
                links = parse_page(page).nav_links
                brand = [(text, attrs) for text, attrs in links if text == "CYTHERAI"]
                self.assertEqual(len(brand), 1)
                self.assertEqual(brand[0][1].get("aria-label"), "الصفحة الرئيسية لـ CytherAI" if page.startswith("ar/") else "CytherAI home")
                content_links = [(text, attrs) for text, attrs in links if text != "CYTHERAI"]
                self.assertEqual({text: attrs.get("href") for text, attrs in content_links}, expected)
                marked = [text for text, attrs in content_links if attrs.get("aria-current") == "page"]
                self.assertEqual(marked, [current[page]])

    def test_every_page_reference_resolves_into_the_shipped_set_and_nothing_is_fetched_elsewhere(self) -> None:
        """Zero external requests, ever: everything a page or a stylesheet makes the browser fetch is a shipped file
        of this origin. A link a reader follows may leave the site; one that stays must land on a shipped file, and on
        an element of it when it names one (the front door's route to ADII's recorded run is adii/#run), as must the
        absolute URLs a page gives others (its og:url and og:image name this host)."""
        for page in HTML_FILES:
            for kind, url in references(page):
                parts = urlsplit(url)
                if kind == "fetch":
                    self.assertFalse(parts.scheme or parts.netloc, f"{page} fetches {url} from another origin")
                if kind == "site":
                    self.assertEqual((parts.scheme, parts.netloc), ("https", HOST), f"{page}: {url}")
                if parts.netloc == HOST or not (parts.scheme or parts.netloc):
                    target = local_target(page, parts.path if parts.netloc else url)
                    self.assertIn(target, DEPLOYED, f"{page}: {url} names a file that is not shipped")
                    if parts.fragment and target.endswith(".html"):
                        self.assertIn(parts.fragment, {a.get("id") for t, a in parse_page(target).tags}, f"{page}: {url}")
        for sheet in (p for p in DEPLOY_FILES if p.endswith(".css")):
            for url in css_urls((ROOT / sheet).read_text(encoding="utf-8")):
                self.assertIn(local_target(sheet, url), DEPLOYED, f"{sheet}: url({url})")

    def test_every_page_pins_a_least_privilege_csp(self) -> None:
        """Each page's CSP admits its own origin and nothing else (data: images and inline style where named), and
        its script-src is exactly what the page runs: 'self' if it loads same-origin scripts, a hash per inline
        script, 'none' if it runs nothing. A widened policy ('unsafe-inline' scripts, a scheme, a host) fails."""
        for page in HTML_FILES:
            parsed = parse_page(page)
            csps = [a["content"] for t, a in parsed.tags if t == "meta" and a.get("http-equiv") == "Content-Security-Policy"]
            self.assertEqual(len(csps), 1, page)
            policy = {d.split()[0]: d.split()[1:] for d in csps[0].split(";") if d.strip()}
            source = (ROOT / page).read_text(encoding="utf-8")
            inline = re.findall(r"<script>(.*?)</script>", source, re.S)
            script = (["'self'"] if any(t == "script" and a.get("src") for t, a in parsed.tags) else []) + \
                ["'sha256-%s'" % base64.b64encode(hashlib.sha256(body.encode("utf-8")).digest()).decode() for body in inline]
            self.assertEqual(policy.get("script-src"), script or ["'none'"], page)
            for directive, expected in (("default-src", ["'self'"]), ("object-src", ["'none'"]), ("base-uri", ["'self'"]),
                                        ("connect-src", ["'none'"]), ("frame-src", ["'none'"])):
                self.assertEqual(policy.get(directive), expected, f"{page} {directive}")
            extra = {"style-src": {"'unsafe-inline'"}, "img-src": {"data:"}, "script-src": set(script)}
            for directive, sources in policy.items():
                self.assertLessEqual(set(sources), {"'self'", "'none'"} | extra.get(directive, set()), f"{page} {directive}")

    def test_the_privacy_policy_names_exactly_what_the_site_stores(self) -> None:
        """From light mode's release (2026-10-14) to 2026-10-18 the policy described a retired build's sessionStorage
        key and omitted the localStorage key the front door writes. Every key a served script stores is
        named in the policy with its storage, and a storage no served script uses is not described there. Since light
        mode retired (2026-10-20) no served script stores anything."""
        found = lambda text: set(re.findall(r'\b(localStorage|sessionStorage)\.(?:get|set|remove)Item\("([^"]+)"', text))
        self.assertEqual(found('try { chosen = localStorage.getItem("theme"); }'), {("localStorage", "theme")}, "the scan has teeth")
        stored = set()
        for path in DEPLOY_FILES:
            if path.endswith((".js", ".html")):
                stored |= found((ROOT / path).read_text(encoding="utf-8"))
        policy = (ROOT / "pages/privacy.html").read_text(encoding="utf-8")
        for storage, key in stored:
            self.assertIn(f"<b>{key}</b>", policy, key)
            self.assertIn(storage, policy, storage)
        for storage in {"localStorage", "sessionStorage"} - {s for s, _ in stored}:
            self.assertNotIn(storage, policy, storage)

    def test_no_served_file_carries_a_retired_register(self) -> None:
        """CLAUDE.md's register rules, which nothing grepped until 2026-10-18."""
        for path in DEPLOY_FILES:
            if path.endswith((".html", ".css", ".js", ".webmanifest", ".svg", ".txt")):
                found = BANNED.findall((ROOT / path).read_text(encoding="utf-8"))
                self.assertEqual(found, [], path)
        self.assertTrue(BANNED.search("color:var(--brass)") and BANNED.search("−540 M"), "the pattern has teeth")

    def test_homepage_module_order_and_script_posture(self) -> None:
        # each front door reads no module and runs one script: the film, its sentences, the passage and the worker are
        # js/film.js, deferred (js/theme.js retired with light mode, 2026-10-20). Their CSP forbids inline script.
        for page, up in (("index.html", ""), ("ar/index.html", "../")):
            scripts = [attrs for tag, attrs in parse_page(page).tags if tag == "script"]
            self.assertEqual([urlsplit(attrs.get("src")).path for attrs in scripts], [up + "js/film.js"], page)
            self.assertEqual([attrs.get("defer") for attrs in scripts], [""], page)

        for page in ("contact.html", "ar/contact.html"):
            contact_scripts = [attrs for tag, attrs in parse_page(page).tags if tag == "script"]
            self.assertEqual(len(contact_scripts), 1, page)
            self.assertFalse(contact_scripts[0].get("src"), f"{page} keeps exactly one inline form script")

        for page in ("pages/brief.html", "pages/privacy.html", "pages/security.html", "pages/terms.html"):
            self.assertFalse([attrs for tag, attrs in parse_page(page).tags if tag == "script"], page)

    def test_sri_build_hash_and_cache_identity_are_exact(self) -> None:
        expected_sri = {resource: sri_for(resource) for resource in RESOURCES}
        referenced: set[str] = set()
        for page in HTML_FILES:
            parsed = parse_page(page)
            for tag, attrs in parsed.tags:
                raw_url = attrs.get("src") if tag == "script" else attrs.get("href") if tag == "link" else None
                if not raw_url:
                    continue
                relative = local_target(page, raw_url)
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

    def test_every_module_url_names_its_bytes(self) -> None:
        """A worker answers from its cache by URL. When a page its build never cached (the Arabic front door, on its first
        visit) came new from the network, an English-only build's worker answered its stylesheet and script with the old
        bytes, which the page's integrity refused: no style, Times, 1288 px wide at 390 (docs/deploy.md §5r). So every
        integrity-checked URL names its bytes (?v= the first 12 hex of their SHA-256), in the pages and in the precache
        alike, and no older worker has ever cached a newer one."""
        version = {r: "v=" + hashlib.sha256((ROOT / r).read_bytes()).hexdigest()[:12] for r in RESOURCES}
        for page in HTML_FILES:
            for tag, attrs in parse_page(page).tags:
                raw = attrs.get("src") if tag == "script" else attrs.get("href") if tag == "link" else None
                if not raw or "integrity" not in attrs:
                    continue
                resource = local_target(page, raw)
                self.assertEqual(urlsplit(raw).query, version[resource], f"{page}: {raw}")
        assets = re.findall(r"'([^']+)'", re.search(r"var ASSETS = \[(.*?)\n\];", SW_SOURCE, re.DOTALL).group(1))
        for asset in assets:
            path, _, query = asset.partition("?")
            self.assertEqual(query, version.get(path, ""), f"sw.js precaches {asset}")

    def test_every_page_withholds_the_referrer_itself(self) -> None:
        """docs/deploy.md §1 requires Referrer-Policy: no-referrer; GitHub Pages cannot send it (§7), and a page can."""
        for page in HTML_FILES:
            policies = [attrs.get("content") for tag, attrs in parse_page(page).tags if tag == "meta" and attrs.get("name") == "referrer"]
            self.assertEqual(policies, ["no-referrer"], page)

    def test_build_identity_commits_to_every_served_byte(self) -> None:
        """Same identity ⇒ same served candidate.

        A semantic HTML change, a worker change and an asset change must each move
        the stamped identity, and the shell projection must equal the Python one.
        What is not served — verifiers, docs, the receipt corpus — never moves it.
        """
        baseline = VAIC.build_identity(ROOT)
        self.assertEqual(baseline, VAIC.current_build(ROOT), "the stamp is the projection")
        mutations = {
            "index.html": lambda b: b.replace(b"Keep control of what changes.", b"Keep control of what changes (counterfactual).", 1),
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
        for forbidden in ("backup/", "docs/", "awc-os/live/"):   # awc-os/live/ redirects to an ephemeral tunnel
            self.assertFalse(any(path.startswith(forbidden) for path in DEPLOY_FILES), forbidden)
        self.assertFalse(any(path.endswith(".DS_Store") for path in DEPLOY_FILES))
        # the project pages ship only their reviewed publication set: a new file under
        # either directory is served after it is reviewed and named here, never before
        for directory, reviewed in REVIEWED_PUBLICATION.items():
            served = {path for path in DEPLOY_FILES if path.startswith(directory)}
            self.assertEqual(served, reviewed, directory)

        assets_block = re.search(r"var ASSETS = \[(.*?)\n\];", SW_SOURCE, re.DOTALL)
        self.assertIsNotNone(assets_block)
        sw_assets = [a.split("?")[0] for a in re.findall(r"'([^']+)'", assets_block.group(1))]   # ?v= names the bytes, not the path
        self.assertEqual(len(sw_assets), len(set(sw_assets)), "service-worker assets contain duplicates")
        self.assertTrue(set(sw_assets).issubset(DEPLOY_FILES))

    def test_service_worker_installs_one_build_or_nothing(self) -> None:
        """A build is atomic only if install cannot precache the previous build's bytes.

        Reproduced in Chrome 151 under docs/deploy.md's headers (index.html and sw.js
        no-cache, modules max-age): addAll's default fetch took the old module from
        the HTTP cache, paired it with the new index.html whose SRI names the new
        one, and every load failed until the HTTP cache expired. Install therefore
        fetches past the HTTP cache, commits only when index.html's build stamp is
        this cache's own, and the fetch handler reads this build's cache alone.
        """
        install = SW_SOURCE[SW_SOURCE.index("addEventListener('install'"):SW_SOURCE.index("addEventListener('message'")]
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
        # a navigation to a directory reads its precached index: "/" is index.html, "/ar/" is ar/index.html (offline, an Arabic
        # visitor whose worker was installed from the English page reached an error page before this; docs/deploy.md §5q)
        self.assertIn("path.slice(SCOPE.length) + 'index.html'", fetch_handler)
        # a page it did not precache stays the network's, and nothing is cached from the HTTP cache's copy (SW-1, SW-2)
        self.assertIn("if (e.request.mode === 'navigate') return fetch(e.request);", fetch_handler)
        self.assertIn("fetch(new Request(e.request, { cache: 'no-cache' }))", fetch_handler)
        # A new build never takes over a page that may still be loading: in Safari (iOS 26.5 simulator) a worker that skipped
        # waiting answered a returning reader's previous-build page mid-load with this build's modules, and it died of its own
        # SRI check. It waits until a page whose modules have all run asks it in.
        self.assertNotIn("skipWaiting", install, "install must not take over open pages")
        self.assertIn("if (e.data === 'take-over') self.skipWaiting();", SW_SOURCE)
        self.assertIn('postMessage("take-over")', (ROOT / "js/film.js").read_text(encoding="utf-8"),
                      "the page that has loaded is the one that lets the new build in")

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

    def test_every_film_the_front_door_names_ships(self) -> None:
        """The page names its media in three places no resolver above reads: a <video>'s poster, a
        sequence's data-src (assigned when it comes into view) and the paths js/film.js picks by orientation (the
        film, the passage, and the stills that stand in for them). Each must be a deployed file, or the page shows a
        black frame where the film was. The three systems are the passage (their sequences retired on 2026-10-20:
        backup/system-sequences-v1/).
        (THE UNHAPPENED's scene/section parity law retired with it: backup/unhappened-v1/.)"""
        named = set(re.findall(r'"(film/[^"]+)"', (ROOT / "js/film.js").read_text(encoding="utf-8")))   # resolved at the site's root
        for page in ("index.html", "ar/index.html"):
            index = parse_page(page)
            named |= {posixpath.normpath(posixpath.join(posixpath.dirname(page), attrs[key]))
                      for tag, attrs in index.tags if tag == "video" for key in ("poster", "data-src") if attrs.get(key)}
            self.assertEqual([attrs.get("id") or attrs.get("class") for tag, attrs in index.tags if tag == "video"],
                             ["film", "passage"], f"{page}: the film and the passage")
        self.assertTrue(named, "the page names no film")
        self.assertEqual(sorted(named - set(DEPLOY_FILES)), [], "named but not shipped")
        self.assertEqual(sorted(p for p in DEPLOY_FILES if p.startswith("film/") and p not in named), [],
                         "shipped but named by nothing")

    def test_every_seal_is_the_computed_one(self) -> None:
        """The Cyther Seal is computed from the company's name, and its identity forbids redrawing the path. Every seal
        inline on a served page, and on the social card's composition, must be exactly the pixel-fitted seal
        tools/render-seal.py computes at its size, in the colours its surface owns: the identity's own (render-seal's
        INK and GROUND) on the front door and the cards, the subpages' ink and paper (css/cytherai.css) on the cold
        subpages. Warm is never the seal's colour; a hand-edited cell, a mirrored path or another colour fails."""
        spec = importlib.util.spec_from_file_location("render_seal", ROOT / "tools/render-seal.py")
        seal = importlib.util.module_from_spec(spec); spec.loader.exec_module(seal)
        paper = dict(re.findall(r"--([\w-]+):(#[0-9A-Fa-f]{6})", (ROOT / "css/cytherai.css").read_text(encoding="utf-8")))
        dark = ("index.html", "ar/index.html", "tools/og-card.html", "tools/og-card-ar.html") + ROOMS
        def defect(page: str, svg: str) -> str | None:
            size = int(re.search(r'viewBox="0 0 (\d+) \1"', svg).group(1))
            ink, ground = (seal.INK, seal.GROUND) if page in dark else (paper["ink"], paper["paper"])
            return None if svg == seal.fitted_svg(size, ink, ground, ' class="seal"') else f"{page}: not the computed seal"
        found = 0
        for page in HTML_FILES + ["tools/og-card.html", "tools/og-card-ar.html"]:
            for svg in re.findall(r'<svg class="seal".*?</svg>', (ROOT / page).read_text(encoding="utf-8"), re.S):
                self.assertIsNone(defect(page, svg))
                found += 1
        self.assertGreaterEqual(found, 13, "both front doors, the four rooms, five subpages and both cards carry the seal")
        # the law has teeth on a real page: a mirrored path, and the seal in the film's warm, each fail
        svg = re.search(r'<svg class="seal".*?</svg>', (ROOT / "index.html").read_text(encoding="utf-8"), re.S).group(0)
        self.assertIsNotNone(defect("index.html", svg.replace('d="M', 'd="m', 1)))
        self.assertIsNotNone(defect("index.html", svg.replace(f'fill="{seal.INK}"', 'fill="#FFAD57"')))

    def test_subpage_inks_hold_aa_on_every_subpage_ground(self) -> None:
        """css/cytherai.css had no ink law until its quiet ink shipped at 4.01:1 on paper.

        Every subpage ink on every subpage ground, tokens read from the stylesheet and
        never restated here; the two quiet aliases must agree. (Formerly MOT-001 A10 in
        tools/test-motion.py, which retired with the world; this law is the subpages'.)
        """
        css = (ROOT / "css/cytherai.css").read_text(encoding="utf-8")
        tok = dict(re.findall(r"--([\w-]+):(#[0-9A-Fa-f]{6})", css))
        grounds = {k: tok[k] for k in ("paper", "paper-lifted", "paper-dense", "panel")}
        inks = {k: tok[k] for k in ("ink", "ink-mid", "ink-quiet", "accent", "refuse")}
        worst = min((wcag(i, g), ik, gk) for ik, i in inks.items() for gk, g in grounds.items())
        self.assertGreaterEqual(worst[0], 4.5, f"{worst[1]} on {worst[2]} is {worst[0]:.2f}:1")
        # a form field's edge is a component boundary: 3:1 on the field and on the page (WCAG 1.4.11; --rule read 1.33:1)
        edge = re.search(r"\.form-input,\.form-textarea\{[^}]*border:1px solid var\(--([\w-]+)\)", css).group(1)
        for ground in ("paper", "paper-lifted"):
            self.assertGreaterEqual(wcag(tok[edge], tok[ground]), 3, f"the field edge --{edge} on --{ground}")
        self.assertEqual(tok["quiet"], tok["ink-quiet"])
        self.assertEqual(tok["label"], tok["ink-mid"])

    def test_the_front_door_is_one_dark_environment(self) -> None:
        """The front door keeps one deliberately lit environment whatever the device's theme (the owner, 2026-10-20: light
        mode re-tokened only the footer by then, a promise the page did not keep, and retired): no switch, no theme on the
        root, no light tokens and no colour-scheme query in css/film.css. Every ink holds 4.5:1 on its ground, tokens read
        from css/film.css and never restated here. (Text over the film itself is measured in a browser: CY-SEM-003.)"""
        css = (ROOT / "css/film.css").read_text(encoding="utf-8")
        for absent in ("data-theme", "prefers-color-scheme", "#theme"):
            self.assertNotIn(absent, css, absent)
        for page in ("index.html", "ar/index.html"):
            self.assertNotIn('id="theme"', (ROOT / page).read_text(encoding="utf-8"), page)
        self.assertNotIn("data-theme", (ROOT / "js/film.js").read_text(encoding="utf-8"))
        tok = {name: value if len(value) == 7 else "#" + "".join(c * 2 for c in value[1:])
               for name, value in re.findall(r"--([\w-]+):(#[0-9a-fA-F]{6}|#[0-9a-fA-F]{3})\b", re.search(r":root\{([^}]*)\}", css).group(1))}
        for ink in ("ink", "soft", "dim", "warm"):
            with self.subTest(ink=ink):
                self.assertGreaterEqual(wcag(tok[ink], tok["ground"]), 4.5, f"--{ink} on --ground")

    def test_the_rooms_are_of_the_front_door(self) -> None:
        """The pages a visitor reaches from the front door (2026-10-21) are rooms of it: each draws with css/room.css, opens
        with the front door's lockup going home, and ends with its footer; the room's tokens are the front door's, and
        every ink holds 4.5:1 on the ground and on the lifted ground under a field or an artifact, a field's edge 3:1."""
        film = (ROOT / "css/film.css").read_text(encoding="utf-8")
        room = (ROOT / "css/room.css").read_text(encoding="utf-8")
        hexes = lambda css: dict(re.findall(r"--([\w-]+):(#[0-9a-fA-F]{6})\b", re.search(r":root\{([^}]*)\}", css).group(1)))
        tok, front = hexes(room), hexes(film)
        self.assertEqual({k: v for k, v in tok.items() if k in front}, front, "the front door's tokens, unchanged")
        for ground in ("ground", "lift"):
            for ink in ("ink", "soft", "dim", "warm"):
                with self.subTest(ink=ink, ground=ground):
                    self.assertGreaterEqual(wcag(tok[ink], tok[ground]), 4.5, f"--{ink} on --{ground}")
            self.assertGreaterEqual(wcag(tok["edge"], tok[ground]), 3, f"a field's edge on --{ground}")
        for page in ROOMS:
            tags, base = parse_page(page).tags, posixpath.dirname(page)
            at = lambda u: posixpath.normpath(posixpath.join(base, urlsplit(u).path))
            sheets = [at(a["href"]) for t, a in tags if t == "link" and a.get("rel") == "stylesheet"]
            self.assertEqual(sheets, ["css/room.css"], page)
            home = next(a for t, a in tags if t == "a" and "wordmark" in a.get("class", "").split())
            self.assertEqual(local_target(page, home["href"]), "ar/index.html" if page.startswith("ar/") else "index.html", page)
            self.assertIn(("footer", {}), tags, page)

    def test_each_evidence_room_returns_to_the_words_that_led_to_it(self) -> None:
        """An evidence room's way back to the passage returns to the evidence moment: every link from the room to its front
        door names the passage's words (a .say, by id) that hold the route to this room, and js/film.js brings their moment,
        the middle of their window (not the exact scroll the visitor left from). It landed on its stretch's first second,
        before any words, until 2026-10-21 (the owner: restore the ADII position)."""
        for room, door in EVIDENCE:
            words = dict(re.findall(r'<div class="say" id="([\w-]+)"[^>]*>(.*?)</div>', (ROOT / door).read_text(encoding="utf-8"), re.S))
            backs = [a["href"] for t, a in parse_page(room).tags
                     if t == "a" and "wordmark" not in a.get("class", "") and local_target(room, a["href"]) == door]
            self.assertTrue(backs, f"{room} has a way back to the passage")
            for href in backs:
                fragment = urlsplit(href).fragment
                self.assertIn(fragment, words, f"{room}: {href} names the passage's words")
                routes = [local_target(door, u) for u in re.findall(r'<a class="route" href="([^"]+)"', words[fragment])]
                self.assertIn(room, routes, f"{room}: {href} lands on the words whose route leads to it")

    def test_the_passage_moves_evenly(self) -> None:
        """The scroll moves the passage at the stage's own pace, 2 s of it a viewport: each stretch is as tall as its seconds
        at 50svh a second (css/film.css, vh first), and the stretches run on from one another, so no second is held or
        skipped. The owner found a passage that held, then rushed, lagging (2026-10-20)."""
        css = (ROOT / "css/film.css").read_text(encoding="utf-8")
        stretches = [(a["id"], *map(float, a["data-t"].split())) for t, a in parse_page("index.html").tags
                     if "passage" in a.get("class", "").split()]
        self.assertEqual([i for i, _, _ in stretches], ["systems", "adii", "awc-os", "cythercad", "return"])
        self.assertEqual([b for _, _, b in stretches[:-1]], [a for _, a, _ in stretches[1:]], "each begins where the last ended")
        for i, a, b in stretches:
            h = round(50 * (b - a))
            self.assertIn(f"#{i}{{height:{h}vh;height:{h}svh}}", css, f"#{i}: {b - a:g} s, {h}svh")

    def test_no_stretch_holds_its_words_beneath_the_next(self) -> None:
        """The passage's words are fixed at the foot of the frame inside their stretch, with a z-index of their own. A
        stretch that makes a stacking context holds them inside it, and the next stretch, transparent and later in the
        page, lies over them: from 2026-10-20 to 2026-10-21 no system's link took a click or a tap, though keyboard focus
        reached each one. So no rule for a stretch, by its class or its id, may make one."""
        css = (ROOT / "css/film.css").read_text(encoding="utf-8")
        ids = [a["id"] for t, a in parse_page("index.html").tags if "passage" in a.get("class", "").split()]
        stacking = re.compile(r"(?<![\w-])(z-index|transform|filter|opacity|isolation|contain|will-change|mix-blend-mode|perspective|clip-path|mask)\s*:")
        rules = re.findall(r"(?<![\w#-])(\.passage|#(?:%s))\{([^}]*)\}" % "|".join(map(re.escape, ids)), css)
        self.assertEqual({s for s, _ in rules}, {".passage"} | {"#" + i for i in ids}, "every stretch's rules are read")
        for selector, body in rules:
            self.assertIsNone(stacking.search(body), f"{selector}{{{body}}} makes a stacking context")
        say = re.search(r"(?<![\w-])\.say\{([^}]*)\}", css).group(1)
        self.assertTrue("position:fixed" in say and re.search(r"z-index:\d", say), "the words stand above the scene on their own")

    def test_the_arabic_front_door_is_the_english_one_in_arabic(self) -> None:
        """ar/index.html carries index.html's film, cues, the passage's seconds, sections and projected figures, only in
        Arabic; one added to one page and not the other fails. Each Arabic page is lang=ar, dir=rtl."""
        def shape(page: str):
            tags = parse_page(page).tags
            return ([(a.get("data-from"), a.get("data-to")) for t, a in tags if {"line", "landing"} & set(a.get("class", "").split())],
                    [(t, a.get("id"), a["data-t"]) for t, a in tags if a.get("data-t")],   # the passage's stretches and its words' windows
                    [a["id"] for t, a in tags if t == "section" and a.get("id")],
                    [a["data-m"] for t, a in tags if a.get("data-m")])
        self.assertEqual(shape("ar/index.html"), shape("index.html"))
        for page, lang, direction in (("index.html", "en", None), ("ar/index.html", "ar", "rtl"),
                                      ("contact.html", "en", None), ("ar/contact.html", "ar", "rtl"),
                                      ("adii/index.html", "en", None), ("ar/adii.html", "ar", "rtl"),
                                      ("awc-os/index.html", "en", None), ("ar/awc-os.html", "ar", "rtl"),
                                      ("cythercad/index.html", "en", None), ("ar/cythercad.html", "ar", "rtl")):
            html = next(a for t, a in parse_page(page).tags if t == "html")
            self.assertEqual((html.get("lang"), html.get("dir")), (lang, direction), page)

    def test_each_language_names_the_other(self) -> None:
        """Each page and its Arabic counterpart declare both as alternates (hreflang) and link each other visibly, the link
        marked with the language it leads to."""
        for en, ar in (("index.html", "ar/index.html"), ("contact.html", "ar/contact.html"), ("adii/index.html", "ar/adii.html"),
                       ("awc-os/index.html", "ar/awc-os.html"), ("cythercad/index.html", "ar/cythercad.html")):
            for page, other, lang in ((en, ar, "ar"), (ar, en, "en")):
                tags = parse_page(page).tags
                alternates = {a["hreflang"]: local_target(page, urlsplit(a["href"]).path)
                              for t, a in tags if t == "link" and a.get("rel") == "alternate"}
                self.assertEqual((alternates.get("en"), alternates.get("ar")), (en, ar), page)
                visible = [a for t, a in tags if t == "a" and a.get("hreflang") == lang and a.get("lang") == lang
                           and local_target(page, a["href"]) == other]
                self.assertEqual(len(visible), 1, f"{page} links {other} once, marked {lang}")

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
        # a current FAIL is disposed by a decision that it stands open or is accepted, never by one that calls it resolved
        disposed = {entry["subject"] for entry in register["dispositions"]
                    if entry["kind"] == "OBLIGATION" and entry["disposition"] in ("OPEN_DEFECT", "ACCEPTED_LIMITATION")}
        corpus = VAIC.load_json(ROOT / "vaic/cytherai-obligations.v3.json")
        matrix = VAIC.load_json(ROOT / "vaic/evaluator-matrix.v0.json")
        summary = VAIC.validate(corpus, matrix, ROOT)
        self.assertEqual(summary["structure"], "VALID")
        failing = self.effective_failures(corpus, matrix)
        self.assertEqual(sorted(failing - disposed), [], "a current FAIL with no disposition")

        # the gate must actually fire, whatever the live corpus holds: a regression appended to CY-ART-001 (its current
        # receipt observed again as FAIL, the PASS moved into history) is exactly one new current FAIL, and no entry names it
        mutated = copy.deepcopy(corpus)
        row = next(r for r in mutated["obligations"] if r["id"] == "CY-ART-001")
        current = next(r for r in row["evaluation"]["receipts"]
                       if r["artifact_build"] == corpus["candidate"]["build_identity"]
                       and r["verification_identity"] == corpus["candidate"]["verification_identity"])
        row["evaluation"]["receipts"].append({**copy.deepcopy(current), "result": "FAIL"})
        current["artifact_build"] = "0000000000000000"
        row["evaluation"]["result"] = "FAIL"
        self.assertEqual(self.effective_failures(mutated, matrix) - failing, {"CY-ART-001"})
        self.assertNotIn("CY-ART-001", disposed)

    @staticmethod
    def effective_failures(corpus, matrix) -> set[str]:
        return {oid for oid, verdict in VAIC.validate(corpus, matrix, ROOT)["effective"].items() if verdict == "FAIL"}

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
