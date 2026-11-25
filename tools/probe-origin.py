#!/usr/bin/env python3
"""probe-origin.py — CY-ORIGIN-001: the live origin against the artifact and docs/deploy.md §1–§4 as amended in §7.

Every served path over http (301 to the same https path) and over https (sha256 against the local deploy.sh build of
the admitted commit, the URL cache-busted so the CDN cannot answer with an older build); / against index.html; the
declared hidden paths (404 with the styled body); MIME; a byte range of every MP4 shipped (the interval and total it names, its
bytes against the artifact's); the worker's generation; TLS; the www host; the headers on the root; the referrer meta on every page
as served. PASS only if nothing above is missing.

    ./deploy.sh && python3 tools/probe-origin.py dist <out.json> [--record]     exit 0 PASS, 1 FAIL

For each failed request, the probe saves metadata.json, headers.bin and body.bin in a unique directory beside <out.json>.
The JSON report lists those directories under failed_responses. The files contain the response from the original request,
including any partial body received before a transport failure. Reusing the report path preserves earlier captures.

Its receipts are EXTERNAL (it is not run by ./verify.sh: it needs the network); the ledger records the harness and
this file's digest as harness_version. Until 2026-10-18 it was an untracked scratch script, originprobe.py.
--record, after a PASS of the stamped candidate, appends the observation to the evidence ledger, its CY-ORIGIN-001
receipt to the corpus (append only) and its line to the build record in docs/deploy.md that names the build
(tools/vaic_record.py, origin: run again, it finishes an append that was interrupted); commit them on master.
"""
import hashlib, json, subprocess, sys, tempfile, time
from dataclasses import dataclass
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
if len(sys.argv) < 3: sys.exit(__doc__)
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


@dataclass
class Response:
    url: str
    status: str
    redirect: str
    content_type: str
    headers: bytes
    body: bytes
    returncode: int
    stderr: str
    byte_range: str

    def check(self, condition, reason):
        if self.returncode == 0 and condition:
            return True
        directory = Path(tempfile.mkdtemp(prefix=f"{OUT.name}.failure-", dir=OUT.parent))
        (directory / "headers.bin").write_bytes(self.headers)
        (directory / "body.bin").write_bytes(self.body)
        # The TLS check also has a verbose request trace. Keep the transfer error alongside the response.
        errors = [line for line in self.stderr.splitlines() if line.startswith("curl:")]
        metadata = {"url": self.url, "status": self.status, "request_range": self.byte_range,
                    "captured_at_utc": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
                    "curl_exit": self.returncode, "curl_errors": errors, "check": reason,
                    "artifact_build": build, "body_bytes": len(self.body), "body_sha256": sha(self.body)}
        (directory / "metadata.json").write_text(json.dumps(metadata, indent=2) + "\n", encoding="utf-8")
        failed_responses.append(directory.name)
        defects.append(f"{reason} (HTTP {self.status}, curl exit {self.returncode}, capture {directory.name})")
        return False

    def final_headers(self):
        # curl can receive more than one header block, e.g. CONNECT or 103 before the origin response.
        blocks = self.headers.decode("latin-1").split("\r\n\r\n")
        return next((block.split("\r\n") for block in reversed(blocks) if block.startswith("HTTP/")), [])


def get(url, *, byte_range="", verbose=False):
    # Keep curl's metadata and response headers separate from arbitrary binary body bytes.
    with tempfile.TemporaryDirectory() as tmp:
        headers, body = Path(tmp, "headers"), Path(tmp, "body")
        headers.touch()
        body.touch()
        args = ["curl", "-sS", "--max-time", "60", "-D", str(headers), "-o", str(body),
                "-w", "%{http_code}\n%{redirect_url}\n%{content_type}"]
        if byte_range:
            args.extend(["-H", f"Range: {byte_range}"])
        if verbose:
            args.append("-v")
        run = subprocess.run([*args, url], capture_output=True)
        fields = run.stdout.decode("utf-8", "replace").split("\n")
        status, redirect, content_type = (fields + ["", "", ""])[:3]
        return Response(url, status or "000", redirect, content_type, headers.read_bytes(), body.read_bytes(),
                        run.returncode, run.stderr.decode("utf-8", "replace"), byte_range)


sha = lambda data: hashlib.sha256(data).hexdigest()
build = (DIST / "index.html").read_text(encoding="utf-8").split('name="build-hash" content="')[1][:16]
closure = {"served_files": len(paths), "http_301_to_same_https_path": 0, "https_bytes_identical_to_artifact": 0}
defects, failed_responses = [], []
for p in paths:
    response = get(f"http://{HOST}/{p}")
    if response.check(response.status == "301" and response.redirect == f"https://{HOST}/{p}",
                      f"http {p}: redirect to {response.redirect!r}"):
        closure["http_301_to_same_https_path"] += 1
    response = get(f"https://{HOST}/{p}?{BUST}")
    local = (DIST / p).read_bytes()
    if response.check(response.status == "200" and response.body == local,
                      f"https {p}: expected HTTP 200 and artifact bytes (received {len(response.body)}, expected {len(local)})"):
        closure["https_bytes_identical_to_artifact"] += 1

response = get(f"https://{HOST}/?{BUST}")
closure["root_serves_index"] = response.check(response.status == "200" and response.body == (DIST / "index.html").read_bytes(),
                                               "/ must serve index.html with HTTP 200")

hidden = {}
for p in HIDDEN:
    response = get(f"https://{HOST}/{p}?{BUST}")
    hidden[p] = response.status
    response.check(response.status == "404", f"hidden {p}: expected HTTP 404")
response = get(f"https://{HOST}/definitely-missing?{BUST}")
styled_404 = response.check(response.status == "404" and response.body == (DIST / "404.html").read_bytes(),
                            "expected the styled 404.html with HTTP 404")

expected_mime = {"film/nightfall-landscape.mp4": "video/mp4", "js/film.js": "javascript",
                 "css/film.css": "text/css", "manifest.webmanifest": "manifest+json"}
mime = {}
for p in ("index.html", "manifest.webmanifest", "js/film.js", "css/film.css", "film/nightfall-landscape.mp4", "film/nightfall-portrait.jpg", "sw.js"):
    response = get(f"https://{HOST}/{p}?{BUST}")
    mime[p] = response.content_type
    response.check(response.status == "200" and expected_mime.get(p, "") in response.content_type,
                   f"mime {p}: {response.content_type}")

# every MP4 the site ships, wherever it lives, and the answer judged whole: the status, the interval and total it names, and the
# bytes themselves against the artifact's. Until the audit of 2026-11-24 this asked the four under film/ of nine, and judged the status.
ranges, (first, last) = {}, (100, 199)
for p in (p for p in paths if p.endswith(".mp4")):
    local = (DIST / p).read_bytes()
    response = get(f"https://{HOST}/{p}?{BUST}", byte_range=f"bytes={first}-{last}")
    lines = response.final_headers()
    cr = next((line.split(":", 1)[1].strip() for line in lines if line.lower().startswith("content-range:")), None)
    matches = response.body == local[first:last + 1]
    ranges[p] = {"status": lines[0] if lines else "", "content_range": cr, "bytes_are_the_artifacts": matches}
    response.check(response.status == "206" and cr == f"bytes {first}-{last}/{len(local)}" and matches,
                   f"range {p}: {ranges[p]} (the artifact's file is {len(local)} bytes)")

response = get(f"https://{HOST}/sw.js?{BUST}")
worker_cache = response.body.decode("utf-8", "replace").partition("var CACHE = '")[2].partition("'")[0]
response.check(response.status == "200" and build in worker_cache, f"worker {worker_cache!r} must name build {build}")

response = get(f"https://{HOST}/", verbose=True)
response.check(response.status == "200", "expected HTTP 200 on the TLS check")
tls = [line.strip("* ").strip() for line in response.stderr.splitlines()
       if any(k in line for k in ("SSL connection", "subject:", "expire date:", "issuer:"))]
www = {}
for scheme in ("http", "https"):
    response = get(f"{scheme}://www.{HOST}/")
    www[scheme] = [response.status, response.redirect]
    response.check(response.status == "301" and response.redirect == f"https://{HOST}/",
                   f"www {scheme}: redirect to {response.redirect!r}")
response = get(f"https://{HOST}/?{BUST}")
response.check(response.status == "200", "expected HTTP 200 on the root header check")
hdr = [line.lower() for line in response.final_headers()]
header = lambda name: next((line.split(":", 1)[1].strip() for line in hdr if line.startswith(name + ":")), None)
headers = {n: header(n) for n in ("content-type", "cache-control", "strict-transport-security", "x-content-type-options",
                                  "referrer-policy", "permissions-policy", "content-security-policy")}
pages = [p for p in paths if p.endswith(".html")]
referrer = 0
for p in pages:
    response = get(f"https://{HOST}/{p}?{BUST}")
    if response.check(response.status == "200" and b'<meta name="referrer" content="no-referrer">' in response.body,
                      f"referrer meta on {p}: expected the no-referrer page"):
        referrer += 1

report = {"artifact_build": build, "observed_at": time.strftime("%Y-%m-%d"), "origin": f"https://{HOST}/ (GitHub Pages, 'Enforce HTTPS' on)",
          "harness_version": sha(Path(__file__).read_bytes())[:12], "curl": subprocess.run(["curl", "--version"], capture_output=True, text=True).stdout.split()[1],
          "result": "PASS" if not defects else "FAIL", "defects": defects,
          "closure": closure, "hidden_paths": hidden, "styled_404_body": styled_404, "mime": mime, "byte_ranges": ranges,
          "worker_cache": worker_cache, "tls": tls, "www": www, "headers_on_root": headers, "referrer_meta_pages": [referrer, len(pages)]}
if failed_responses:
    report["failed_responses"] = failed_responses
OUT.write_text(json.dumps(report, indent=1), encoding="utf-8")
print(json.dumps({k: report[k] for k in ("artifact_build", "result", "defects", "closure", "styled_404_body", "worker_cache")}, indent=1))


if "--record" in sys.argv[3:] and not defects:
    sys.path.insert(0, str(ROOT / "tools"))
    import vaic_record
    print("recorded", vaic_record.origin(ROOT, report))
sys.exit(0 if not defects else 1)
