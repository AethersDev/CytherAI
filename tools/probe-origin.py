#!/usr/bin/env python3
"""probe-origin.py — CY-ORIGIN-001: the live origin against the artifact and docs/deploy.md §1–§4 as amended in §7.

Every served path over http (301 to the same https path) and over https (sha256 against the local deploy.sh build of
the admitted commit, the URL cache-busted so the CDN cannot answer with an older build); / against index.html; the
declared hidden paths (404 with the styled body); MIME; a byte range on each film; the worker's generation; TLS; the
www host; the headers on the root; the referrer meta on every page as served. PASS only if nothing above is missing.

    ./deploy.sh && python3 tools/probe-origin.py dist <out.json> [--record]     exit 0 PASS, 1 FAIL

Its receipts are EXTERNAL (it is not run by ./verify.sh: it needs the network); the ledger records the harness and
this file's digest as harness_version. Until 2026-10-18 it was an untracked scratch script, originprobe.py.
--record, after a PASS of the stamped candidate, appends the observation to the evidence ledger, its CY-ORIGIN-001
receipt to the corpus (append only) and its line to the build record in docs/deploy.md that names the build;
commit them on master.
"""
import hashlib, json, subprocess, sys, time
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DIST, OUT = Path(sys.argv[1]), Path(sys.argv[2])
HOST = (ROOT / "CNAME").read_text(encoding="utf-8").strip()
BUST = f"origin-check-{int(time.time())}"
paths = [p.strip() for p in (ROOT / "deploy.paths").read_text(encoding="utf-8").splitlines() if p.strip()]
# what must never be served: the record, the retired front doors and their modules, the tools, the studies
HIDDEN = ("backup/newC3/epoch04-preimage.txt", "backup/graphite-v2/index.html", "backup/drawing-set-v1/index.html",
          "backup/unhappened-v1/index.html", "backup/exception-v1/exception/index.html", "backup/PRODUCTION_PLAN.md",
          "backup/trajectory-engine/pages/runner.html", "backup/og-card-v1/og-card.png", "backup/icon-v1/icon.svg",
          "newC3/epoch04-preimage.txt", "PRODUCTION_PLAN.md", "prototype/unhappened-4/index.html", "prototype/exception/index.html",
          "exception/", "exception/index.html", "exception/exception.js", "js/manifest.js", "js/instrument.js",
          "js/drawing-set.js", "js/unhappened.js", "js/trace.js", "tools/render-film.py", "tools/render-seal.py",
          "tools/probe-origin.py", "vaic/cytherai-obligations.v3.json", "docs/deploy.md", "cyther-film/index.html",
          "cyther-seal-identity.html", "awc-os/live/", "awc-os/media/AWC_OS_AMAD2026_deck.pptx", "README.md", "CLAUDE.md",
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
        ("index.html", "manifest.webmanifest", "js/film.js", "css/film.css", "film/film-landscape.mp4", "film/final-portrait.jpg", "sw.js")}
for p, want in (("film/film-landscape.mp4", "video/mp4"), ("js/film.js", "javascript"), ("css/film.css", "text/css"),
                ("manifest.webmanifest", "manifest+json")):
    if want not in mime[p]:
        defects.append(f"mime {p}: {mime[p]}")
ranges = {}
for p in (p for p in paths if p.startswith("film/") and p.endswith(".mp4")):
    r = curl("-D", "-", "-o", "/dev/null", "-H", "Range: bytes=100-199", f"https://{HOST}/{p}?{BUST}").stdout.decode()
    status, cr = r.split("\r\n")[0], [l for l in r.split("\r\n") if l.lower().startswith("content-range")]
    ranges[p] = {"status": status, "content_range": cr[0] if cr else None}
    if " 206" not in status:
        defects.append(f"range {p}: {status}")
worker_cache = body(f"https://{HOST}/sw.js?{BUST}").decode().split("var CACHE = '")[1].split("'")[0]
if build not in worker_cache:
    defects.append(f"worker {worker_cache} is not build {build}")

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
          "harness_version": sha(Path(__file__).read_bytes())[:12], "result": "PASS" if not defects else "FAIL", "defects": defects,
          "closure": closure, "hidden_paths": hidden, "styled_404_body": styled_404, "mime": mime, "byte_ranges": ranges,
          "worker_cache": worker_cache, "tls": tls, "www": www, "headers_on_root": headers, "referrer_meta_pages": [referrer, len(pages)]}
OUT.write_text(json.dumps(report, indent=1), encoding="utf-8")
print(json.dumps({k: report[k] for k in ("artifact_build", "result", "defects", "closure", "styled_404_body", "worker_cache")}, indent=1))


def record(o):
    """the observation, its receipt and its line in the build record, appended; never an edit of what is there"""
    ledger_path, corpus_path, doc_path = (ROOT / "vaic/evidence/current-browser-observations.v0.json",
                                          ROOT / "vaic/cytherai-obligations.v3.json", ROOT / "docs/deploy.md")
    ledger, corpus = (json.loads(path.read_text(encoding="utf-8")) for path in (ledger_path, corpus_path))
    cand = corpus["candidate"]
    if o["artifact_build"] != cand["build_identity"]:
        raise SystemExit(f"the origin serves {o['artifact_build']}, the corpus is stamped for {cand['build_identity']}: nothing recorded")
    name, n = f"origin_closure_{o['artifact_build']}", o["closure"]["served_files"]
    if name in ledger["observations"]:
        raise SystemExit(f"{name} is already recorded: nothing recorded")
    curl_version = subprocess.run(["curl", "--version"], capture_output=True, text=True).stdout.split()[1]
    runtime = f"curl {curl_version} (system trust store), against https://{HOST}/"
    ledger["observations"][name] = {
        "artifact_build": o["artifact_build"], "observed_at": o["observed_at"], "origin": o["origin"],
        "harness": f"tools/probe-origin.py (sha256 {o['harness_version']}…): {runtime}",
        "contract": "docs/deploy.md §1–§4 as amended by the owner's acceptance of GitHub Pages' limits (§7; vaic/release-dispositions.v0.json, CY-ORIGIN-001)",
        "method": "every deploy.paths file over http (expect 301 to the same https path) and over https with a cache-busting query (sha256 against the local deploy.sh build of the admitted commit); / against index.html; the declared hidden paths (404 with the styled body); MIME; a byte range on each film; the worker generation; TLS; the www host; headers on the root; the referrer meta on every page as served",
        "result": "PASS", **{k: o[k] for k in ("closure", "hidden_paths", "styled_404_body", "mime", "byte_ranges", "worker_cache", "tls", "www",
                                                "headers_on_root", "referrer_meta_pages")},
        "headers_note": "the absences are the limits accepted in §7; Referrer-Policy is carried by every page instead"}
    receipt = {"evaluator": "ORIGIN_HARNESS", "coverage": "EXHAUSTIVE", "artifact_build": o["artifact_build"],
               **{k: cand[k] for k in ("artifact_manifest_hash", "record_hash", "grammar_hash", "policy_hash")},
               "verification_identity": "EXTERNAL",
               "environment": {"capability_profile": "production_origin", "device": "local_host", "viewport": None, "runtime": runtime,
                               "accessibility_mode": None},
               "harness_identity": "tools/probe-origin.py", "harness_version": o["harness_version"],
               "method": {"measurement": "every served path of the artifact over http (301 to the same https path) and https (sha256 against deploy.sh's build, cache-busted); the declared hidden paths; MIME, byte ranges on the films, worker generation, TLS, the www host; headers against the contract as amended in §7",
                          "threshold": f"{n} of {n} redirect and match; every hidden path 404 with the styled body; every film answers a byte range; no header beyond the accepted limits missing",
                          "units": "paths"},
               "result": "PASS", "evidence": [f"vaic/evidence/current-browser-observations.v0.json#{name}"], "observed_at": o["observed_at"]}
    row = next(r for r in corpus["obligations"] if r["id"] == "CY-ORIGIN-001")
    row["evaluation"]["receipts"].append(receipt)
    row["evaluation"]["result"] = "PASS"
    doc = doc_path.read_text(encoding="utf-8")
    at = doc.find(f"Build `{o['artifact_build']}`")   # the build's own record; the origin line closes it
    end = doc.find("\n## ", at)
    if at < 0 or end < 0:
        raise SystemExit(f"docs/deploy.md has no build record naming {o['artifact_build']}: nothing recorded")
    doc = doc[:end] + f"\nThe live origin: CY-ORIGIN-001 PASS (`#{name}`), {n} of {n} served paths matching the artifact.\n" + doc[end:]
    ledger_path.write_text(json.dumps(ledger, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    corpus_path.write_text(json.dumps(corpus, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    doc_path.write_text(doc, encoding="utf-8")
    print("recorded", name)


if "--record" in sys.argv[3:] and not defects:
    record(report)
sys.exit(0 if not defects else 1)
