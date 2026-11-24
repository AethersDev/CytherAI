#!/usr/bin/env python3
"""probe-origin.py — CY-ORIGIN-001: the live origin against the artifact and docs/deploy.md §1–§4 as amended in §7.

Every served path over http (301 to the same https path) and over https (sha256 against the local deploy.sh build of
the admitted commit, the URL cache-busted so the CDN cannot answer with an older build); / against index.html; the
declared hidden paths (404 with the styled body); MIME; a byte range of every MP4 shipped (the interval and total it names, its
bytes against the artifact's); the worker's generation; TLS; the www host; the headers on the root; the referrer meta on every page
as served. PASS only if nothing above is missing.

    ./deploy.sh && python3 tools/probe-origin.py dist <out.json> [--record]     exit 0 PASS, 1 FAIL

Its receipts are EXTERNAL (it is not run by ./verify.sh: it needs the network); the ledger records the harness and
this file's digest as harness_version. Until 2026-10-18 it was an untracked scratch script, originprobe.py.
--record, after a PASS of the stamped candidate, appends the observation to the evidence ledger, its CY-ORIGIN-001
receipt to the corpus (append only) and its line to the build record in docs/deploy.md that names the build
(tools/vaic_record.py, origin: run again, it finishes an append that was interrupted); commit them on master.
"""
import hashlib, json, subprocess, sys, time
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DIST, OUT = Path(sys.argv[1]), Path(sys.argv[2])
HOST = (ROOT / "CNAME").read_text(encoding="utf-8").strip()
BUST = f"origin-check-{int(time.time())}"
paths = [p.strip() for p in (ROOT / "deploy.paths").read_text(encoding="utf-8").splitlines() if p.strip()]
# what must never be served: the record, the retired front doors and their modules, the tools, the studies, what was withdrawn
HIDDEN = ("film/film-landscape.mp4", "film/film-portrait.mp4", "film/final-landscape.jpg", "film/final-portrait.jpg",
          "backup/front-door-film-v1/film/film-landscape.mp4", "backup/newC3/epoch04-preimage.txt", "backup/graphite-v2/index.html", "backup/drawing-set-v1/index.html",
          "backup/unhappened-v1/index.html", "backup/exception-v1/exception/index.html", "backup/PRODUCTION_PLAN.md",
          "backup/trajectory-engine/pages/runner.html", "backup/og-card-v1/og-card.png", "backup/icon-v1/icon.svg",
          "newC3/epoch04-preimage.txt", "PRODUCTION_PLAN.md", "prototype/unhappened-4/index.html", "prototype/exception/index.html",
          "exception/", "exception/index.html", "exception/exception.js", "js/manifest.js", "js/instrument.js",
          "js/drawing-set.js", "js/unhappened.js", "js/trace.js", "tools/render-film.py", "tools/render-seal.py",
          "tools/probe-origin.py", "vaic/cytherai-obligations.v3.json", "docs/deploy.md", "cyther-film/index.html",
          "cyther-seal-identity.html", "awc-os/live/", "awc-os/media/AWC_OS_AMAD2026_deck.pptx", "adii/cv/malek.pdf", "adii/cv/jorie.pdf",
          "adii/cv/ibrahem.pdf", "adii/cv/nasser.pdf", "README.md", "CLAUDE.md",
          "definitely-missing")


def curl(*args):
    return subprocess.run(["curl", "-s", "--max-time", "60", *args], capture_output=True)


def head(url):
    r = curl("-o", "/dev/null", "-w", "%{http_code} %{redirect_url} %{content_type}", url).stdout.decode().split(" ", 2)
    return r[0], r[1] if len(r) > 1 else "", r[2] if len(r) > 2 else ""


def body(url):
    return curl(url).stdout


sha = lambda data: hashlib.sha256(data).hexdigest()
build = (DIST / "index.html").read_text(encoding="utf-8").split('name="build-hash" content="')[1][:16]
closure = {"served_files": len(paths), "http_301_to_same_https_path": 0, "https_bytes_identical_to_artifact": 0}
defects = []
for p in paths:
    code, loc, _ = head(f"http://{HOST}/{p}")
    if code == "301" and loc == f"https://{HOST}/{p}":
        closure["http_301_to_same_https_path"] += 1
    else:
        defects.append(f"http {p}: {code} {loc}")
    got = body(f"https://{HOST}/{p}?{BUST}")
    if sha(got) == sha((DIST / p).read_bytes()):
        closure["https_bytes_identical_to_artifact"] += 1
    else:
        defects.append(f"https {p}: bytes differ ({len(got)} vs {(DIST / p).stat().st_size})")
closure["root_serves_index"] = sha(body(f"https://{HOST}/?{BUST}")) == sha((DIST / "index.html").read_bytes())
if not closure["root_serves_index"]:
    defects.append("/ is not index.html")

hidden = {p: head(f"https://{HOST}/{p}?{BUST}")[0] for p in HIDDEN}
defects += [f"hidden {p}: {code}" for p, code in hidden.items() if code != "404"]
styled_404 = sha(body(f"https://{HOST}/definitely-missing?{BUST}")) == sha((DIST / "404.html").read_bytes())
if not styled_404:
    defects.append("404 body is not the styled 404.html")

mime = {p: head(f"https://{HOST}/{p}?{BUST}")[2] for p in
        ("index.html", "manifest.webmanifest", "js/film.js", "css/film.css", "film/nightfall-landscape.mp4", "film/nightfall-portrait.jpg", "sw.js")}
for p, want in (("film/nightfall-landscape.mp4", "video/mp4"), ("js/film.js", "javascript"), ("css/film.css", "text/css"),
                ("manifest.webmanifest", "manifest+json")):
    if want not in mime[p]:
        defects.append(f"mime {p}: {mime[p]}")
# every MP4 the site ships, wherever it lives, and the answer judged whole: the status, the interval and total it names, and the
# bytes themselves against the artifact's. Until the audit of 2026-11-24 this asked the four under film/ of nine, and judged the status.
ranges, (first, last) = {}, (100, 199)
for p in (p for p in paths if p.endswith(".mp4")):
    local = (DIST / p).read_bytes()
    answer, _, got = curl("-i", "-H", f"Range: bytes={first}-{last}", f"https://{HOST}/{p}?{BUST}").stdout.partition(b"\r\n\r\n")
    lines = answer.decode("latin-1").split("\r\n")
    cr = next((l.split(":", 1)[1].strip() for l in lines if l.lower().startswith("content-range:")), None)
    ranges[p] = {"status": lines[0], "content_range": cr, "bytes_are_the_artifacts": got == local[first:last + 1]}
    if " 206" not in lines[0] or cr != f"bytes {first}-{last}/{len(local)}" or got != local[first:last + 1]:
        defects.append(f"range {p}: {ranges[p]} (the artifact's file is {len(local)} bytes)")
# a fetch that failed outright answers nothing: a defect of this run, not a crash of the probe (as on 2026-11-24, once)
worker_cache = body(f"https://{HOST}/sw.js?{BUST}").decode("utf-8", "replace").partition("var CACHE = '")[2].partition("'")[0]
if build not in worker_cache:
    defects.append(f"worker {worker_cache!r} is not build {build}")

tls = [l.strip("* ").strip() for l in subprocess.run(["curl", "-sv", "-o", "/dev/null", f"https://{HOST}/"],
                                                      capture_output=True).stderr.decode().splitlines()
       if any(k in l for k in ("SSL connection", "subject:", "expire date:", "issuer:"))]
www = {"http": list(head(f"http://www.{HOST}/")[:2]), "https": list(head(f"https://www.{HOST}/")[:2])}
defects += [f"www {k}: {code} {loc}" for k, (code, loc) in www.items() if code != "301" or loc != f"https://{HOST}/"]
hdr = curl("-D", "-", "-o", "/dev/null", f"https://{HOST}/?{BUST}").stdout.decode().lower().split("\r\n")
header = lambda name: next((l.split(":", 1)[1].strip() for l in hdr if l.startswith(name + ":")), None)
headers = {n: header(n) for n in ("content-type", "cache-control", "strict-transport-security", "x-content-type-options",
                                  "referrer-policy", "permissions-policy", "content-security-policy")}
pages = [p for p in paths if p.endswith(".html")]
referrer = sum('<meta name="referrer" content="no-referrer">' in body(f"https://{HOST}/{p}?{BUST}").decode("utf-8", "replace")
               for p in pages)
if referrer != len(pages):
    defects.append(f"referrer meta on {referrer} of {len(pages)} pages")

report = {"artifact_build": build, "observed_at": time.strftime("%Y-%m-%d"), "origin": f"https://{HOST}/ (GitHub Pages, 'Enforce HTTPS' on)",
          "harness_version": sha(Path(__file__).read_bytes())[:12], "curl": subprocess.run(["curl", "--version"], capture_output=True, text=True).stdout.split()[1],
          "result": "PASS" if not defects else "FAIL", "defects": defects,
          "closure": closure, "hidden_paths": hidden, "styled_404_body": styled_404, "mime": mime, "byte_ranges": ranges,
          "worker_cache": worker_cache, "tls": tls, "www": www, "headers_on_root": headers, "referrer_meta_pages": [referrer, len(pages)]}
OUT.write_text(json.dumps(report, indent=1), encoding="utf-8")
print(json.dumps({k: report[k] for k in ("artifact_build", "result", "defects", "closure", "styled_404_body", "worker_cache")}, indent=1))


if "--record" in sys.argv[3:] and not defects:
    sys.path.insert(0, str(ROOT / "tools"))
    import vaic_record
    print("recorded", vaic_record.origin(ROOT, report))
sys.exit(0 if not defects else 1)
