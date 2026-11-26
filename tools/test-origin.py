#!/usr/bin/env python3
"""test-origin.py — tools/probe-origin.py, the origin check, against answers that are wrong (the review of 2026-11-24, after one answer of
the live origin could not be explained): each clause of each check fails the scan by itself; an answer cut off in transfer fails
whatever its status; and what is kept of a failed answer is that answer, as it came, never a second one.

Each test runs the probe as it stands in this tree, copied into a small site of its own under a temporary directory, with the curl
this machine has: a `curl` ahead of it on the PATH sends every request to a server in this process, so nothing here reaches a network
(the site's host is in .invalid, which resolves nowhere). TLS itself is not exercised: both schemes are answered over plain HTTP.

Run: python3 tools/test-origin.py   ·   one: python3 tools/test-origin.py OriginTests.test_<name>
"""
import hashlib, json, os, shutil, socketserver, subprocess, sys, tempfile, threading, unittest
from collections import Counter
from dataclasses import dataclass, field
from http.server import BaseHTTPRequestHandler
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
HOST, BUILD = "origin.invalid", "00000000000000B2"
HTTP, HTTPS, WWW = f"http://{HOST}/", f"https://{HOST}/", f"www.{HOST}/"
PAGE = f'<!doctype html><meta name="build-hash" content="{BUILD}"><meta name="referrer" content="no-referrer">\n'.encode()
MISSING, WORKER, FILM = PAGE + b"nothing is published here\n", f"var CACHE = 'cytherai-substrate-{BUILD}';\n".encode(), bytes(range(256)) * 4
LOGO = "assets/logo/cytherai-ink.svg"
SITE = {"index.html": PAGE, "404.html": MISSING, "sw.js": WORKER, ".nojekyll": b"", LOGO: b"<svg/>\n", "manifest.webmanifest": b"{}\n",
        "js/film.js": b"// the film\n", "css/film.css": b"/* the film */\n", "film/nightfall-portrait.jpg": b"\xff\xd8\xff",
        "film/nightfall-landscape.mp4": FILM, "adii/replay.mp4": FILM, "awc-os/film.mp4": FILM}
MIME = {".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".webmanifest": "application/manifest+json", ".mp4": "video/mp4"}
# bytes that end a header block, look like one, and are no text: what a body must survive to be kept as it came
BINARY = b"\x89\x00\xff\r\n\r\nHTTP/1.1 200 OK\r\n\r\n" + bytes(range(256)) * 214
CUT = 18   # curl's exit for a transfer that ended before its declared length


@dataclass
class Answer:
    status: int | None             # None: the connection closes with nothing sent
    body: bytes = b""
    headers: dict = field(default_factory=dict)
    sent: int | None = None        # how many of the body's bytes are sent, if not all; all are declared

    @property
    def arrives(self) -> bytes: return self.body[:self.sent]


def to(url: str, status: int = 301) -> Answer:
    return Answer(status, headers={"Location": url})


def part(body: bytes = FILM[100:200], status: int = 206, interval: str = "100-199") -> Answer:
    return Answer(status, body, {"Content-Range": f"bytes {interval}/{len(FILM)}"})


def sound(url: str, ranged: bool) -> Answer:
    """What a sound origin answers (docs/deploy.md §4)."""
    if not url.startswith(HTTPS):
        return to(HTTPS + (url.removeprefix(HTTP) if url.startswith(HTTP) else ""))
    path = url.removeprefix(HTTPS) or "index.html"
    return part() if ranged else Answer(200, SITE[path]) if path in SITE else Answer(404, MISSING)


class Server(socketserver.ThreadingTCPServer):
    daemon_threads = True

    def __init__(self) -> None:
        super().__init__(("127.0.0.1", 0), Handler)
        self.faults, self.asked = {}, Counter()   # by (URL, ranged): an Answer to every request, or a list of them in turn
        threading.Thread(target=self.serve_forever, daemon=True).start()


class Handler(BaseHTTPRequestHandler):
    def log_message(self, *args) -> None: pass

    def do_GET(self) -> None:
        url, ranged = self.headers["X-Fixture-URL"].partition("?")[0], "Range" in self.headers
        self.server.asked[url, ranged] += 1
        nth, fault = self.server.asked[url, ranged], self.server.faults.get((url, ranged))
        if isinstance(fault, list): fault = fault[nth - 1] if nth <= len(fault) else None
        answer = fault or sound(url, ranged)
        if answer.status is None: return
        if ranged: self.wfile.write(b"HTTP/1.1 103 Early Hints\r\nContent-Range: none yet\r\n\r\n")   # an interim answer is not the answer
        self.send_response(answer.status)
        for name, value in {"Content-Type": MIME.get(Path(url).suffix, "application/octet-stream"), "Content-Length": str(len(answer.body)),
                            "X-Answer": str(nth), **answer.headers}.items():
            self.send_header(name, value)
        self.end_headers()
        self.wfile.write(answer.arrives)


class OriginTests(unittest.TestCase):
    def setUp(self) -> None:
        tmp = tempfile.TemporaryDirectory()
        self.addCleanup(tmp.cleanup)
        self.root, self.server = Path(tmp.name).resolve(), Server()
        self.addCleanup(self.server.server_close); self.addCleanup(self.server.shutdown)
        curl, shim = shutil.which("curl"), self.root / "bin/curl"
        for path, data in {
                **{"dist/" + path: data for path, data in SITE.items()},
                "index.html": PAGE,   # as in the repository's root: an empty path names the working directory, which must not pass for a build
                "deploy.paths": "".join(path + "\n" for path in SITE).encode(), "CNAME": HOST.encode() + b"\n",
                "tools/probe-origin.py": (ROOT / "tools/probe-origin.py").read_bytes(),
                # the recorder's one call; what it does with a report is tools/test-record.py's
                "tools/vaic_record.py": b"def origin(root, report): (root / 'recorded').touch()\n",
                # the URL, the probe's last argument, goes as a header; the arguments before it are the probe's own
                "bin/curl": f"""#!/bin/sh
for url; do :; done
case $url in http*) ;; *) exec '{curl}' "$@" ;; esac
n=$#; while [ "$n" -gt 1 ]; do set -- "$@" "$1"; shift; n=$((n - 1)); done; shift
exec '{curl}' -q "$@" --noproxy '*' -H "X-Fixture-URL: $url" http://127.0.0.1:{self.server.server_address[1]}/
""".encode()}.items():
            (self.root / path).parent.mkdir(parents=True, exist_ok=True)
            (self.root / path).write_bytes(data)
        shim.chmod(0o755)

    def captures(self) -> dict:
        return {d.name: {f.name: f.read_bytes() for f in d.iterdir()} for d in self.root.glob("report.json.failure-*")}

    def probe(self, *args: str) -> subprocess.CompletedProcess:
        return subprocess.run([sys.executable, "tools/probe-origin.py", *args], cwd=self.root,
                              env={**os.environ, "PATH": f"{self.root / 'bin'}:{os.environ['PATH']}"}, capture_output=True, text=True)

    def scan(self, passes: bool) -> tuple[dict, list]:
        """One run of the probe, told to record: its report, and (metadata, headers, body) of each response it kept."""
        (self.root / "recorded").unlink(missing_ok=True)
        before = self.captures()
        run = self.probe("dist", "report.json", "--record")
        self.assertEqual((run.returncode, (self.root / "recorded").exists()), (0, True) if passes else (1, False), run.stdout + run.stderr)
        report, after = json.loads((self.root / "report.json").read_text(encoding="utf-8")), self.captures()
        self.assertEqual(report["result"], "PASS" if passes else "FAIL")
        # a truth, not assertEqual: the diff it draws of two binary bodies takes it minutes, and a failure must be seen
        self.assertTrue(all(after.get(name) == files for name, files in before.items()), "an earlier scan's capture changed")
        new = {name: files for name, files in after.items() if name not in before}
        self.assertEqual(sorted(report.get("failed_responses", [])), sorted(new))
        self.assertEqual(len(report["defects"]), len(new), report["defects"])
        kept = [(json.loads(files["metadata.json"]), files["headers.bin"], files["body.bin"]) for files in new.values()]
        for meta, _, body in kept:
            self.assertEqual((meta["body_bytes"], meta["body_sha256"], meta["artifact_build"]), (len(body), hashlib.sha256(body).hexdigest(), BUILD))
        return report, kept

    def test_a_sound_origin_passes_and_leaves_nothing_behind(self) -> None:
        report, kept = self.scan(passes=True)
        self.assertEqual((report["defects"], kept, "failed_responses" in report), ([], [], False))
        n = len(SITE)
        self.assertEqual(report["closure"], {"served_files": n, "http_301_to_same_https_path": n, "https_bytes_identical_to_artifact": n, "root_serves_index": True})

    def test_arguments_it_cannot_use_stop_it_before_it_asks_anything(self) -> None:
        """`dist --record` took --record for the report's name: the check ran, passed, and recorded nothing (the review of 2026-11-25). An
        empty path, or a report that cannot be written, ran the whole check and then failed (the review of 2026-11-26)."""
        usage, nowhere = "dist <out.json> [--record]", "no report can be written at"
        for args, says in (*(((args, usage) for args in (
                (), ("dist",), ("dist", "--record"), ("dist", "--recrod"), ("--record", "dist"), ("dist", "--record", "report.json"),
                ("dist", "report.json", "--recrod"), ("dist", "report.json", "--record", "again"), ("", "report.json"), ("dist", "")))),
                (("dist", "dist"), nowhere), (("dist", "nowhere/report.json"), nowhere)):
            with self.subTest(args=args):
                before, asked = sorted(self.root.rglob("*")), self.server.asked.copy()
                run = self.probe(*args)
                self.assertEqual((run.returncode, says in run.stderr), (1, True), run.stdout + run.stderr)
                self.assertEqual((sorted(self.root.rglob("*")), self.server.asked), (before, asked))

    def test_not_told_to_record_it_checks_and_records_nothing(self) -> None:
        run = self.probe("dist", "report.json")
        self.assertEqual((run.returncode, (self.root / "report.json").exists(), (self.root / "recorded").exists()), (0, True, False), run.stderr)

    def test_a_hidden_path_s_404_cut_off_in_transfer_fails(self) -> None:
        """A matched pair: one hidden URL, one 404 of one declared length; only the transfer's end differs, so only curl's exit can tell."""
        for sent, passes in ((len(MISSING), True), (len(MISSING) // 2, False)):
            with self.subTest(sent=sent):
                self.server.faults = {(HTTPS + "README.md", False): Answer(404, MISSING, sent=sent)}
                report, kept = self.scan(passes)
                self.assertEqual(report["hidden_paths"]["README.md"], "404")
                if passes: continue
                ((meta, headers, body),) = kept
                self.assertEqual((meta["url"].partition("?")[0], meta["status"], meta["curl_exit"], body), (HTTPS + "README.md", "404", CUT, MISSING[:sent]))
                self.assertTrue(meta["curl_errors"])
                self.assertIn(f"Content-Length: {len(MISSING)}\r\n".encode(), headers)

    def test_the_response_kept_is_the_one_that_failed(self) -> None:
        """The case that could not be explained: a 200 with the wrong body, the right one on the next request. The scan after it, under
        the same report name, passes; a later scan that fails keeps its own."""
        logo, other = (HTTPS + LOGO, False), BINARY[::-1]
        self.server.faults = {logo: [Answer(200, BINARY), None, Answer(200, other)]}
        for nth, wrong in ((1, BINARY), (2, None), (3, other)):
            with self.subTest(scan=nth):
                _, kept = self.scan(passes=wrong is None)
                self.assertEqual(self.server.asked[logo], nth, "one request a scan: a failed response is never fetched again")
                if wrong is None: continue
                ((meta, headers, body),) = kept
                self.assertEqual((meta["url"].partition("?")[0], meta["status"], meta["curl_exit"]), (logo[0], "200", 0))
                self.assertTrue(body == wrong, "the body kept is not the one that failed")
                self.assertTrue(headers.startswith(b"HTTP/1.0 200 ") and headers.endswith(b"\r\n\r\n"), headers)
                self.assertIn(f"X-Answer: {nth}\r\n".encode(), headers)

    def test_each_clause_of_each_check_fails_by_itself(self) -> None:
        """Two scans, since a request can be wrong in two ways. Beside each wrong answer, how many of the scan's checks it fails."""
        for scan, wrong in enumerate((
                {(HTTP + "404.html", False): (to(HTTPS + "elsewhere"), 1), (HTTP + "sw.js", False): (to(HTTPS + "sw.js", 302), 1),
                 (HTTPS + ".nojekyll", False): (Answer(503), 1),                       # the right (empty) body, the wrong status
                 (HTTPS + "css/film.css", False): (Answer(502, BINARY), 2),            # a file's bytes; the status of a type
                 (HTTPS + "js/film.js", False): (Answer(200, SITE["js/film.js"], sent=3), 2),       # cut off: its bytes, its type
                 (HTTPS + "film/nightfall-portrait.jpg", False): (Answer(None), 2),    # no answer: its bytes, its type
                 (HTTPS, False): (Answer(500, PAGE), 3),                               # the right page: the root, TLS's and the headers' request
                 (HTTPS + "index.html", False): (Answer(500, PAGE), 3),                # the right page: a file, a type, the referrer
                 (HTTPS + "definitely-missing", False): (Answer(410, MISSING), 2),     # the right page: hidden, the styled 404
                 (HTTPS + "README.md", False): (Answer(200, b"leaked"), 1),
                 (HTTPS + "adii/replay.mp4", True): (part(status=200), 1),
                 (HTTPS + "awc-os/film.mp4", True): (part(interval="0-99"), 1),
                 (HTTPS + "film/nightfall-landscape.mp4", True): (part(b"x" * 100), 1),
                 (HTTPS + "sw.js", False): (Answer(500, WORKER), 3),                   # the right worker: a file, a type, the worker
                 ("http://" + WWW, False): (to(HTTPS, 302), 1), ("https://" + WWW, False): (to(HTTPS + "elsewhere"), 1)},
                {(HTTPS, False): (Answer(200, b"another page"), 1), (HTTPS + "definitely-missing", False): (Answer(404, b"plain"), 1),
                 (HTTPS + "manifest.webmanifest", False): (Answer(200, SITE["manifest.webmanifest"], {"Content-Type": "text/plain"}), 1),
                 (HTTPS + "sw.js", False): (Answer(200, b"var CACHE = 'cytherai-substrate-00000000000000A1';\n"), 2),
                 (HTTPS + "404.html", False): (Answer(200, b"no referrer policy"), 2)})):
            self.server.faults = {request: answer for request, (answer, _) in wrong.items()}
            _, kept = self.scan(passes=False)
            failed = Counter()
            for meta, headers, body in kept:
                request = (meta["url"].partition("?")[0], bool(meta["request_range"]))
                answer = wrong[request][0]
                failed[request] += 1
                with self.subTest(scan=scan, request=request):
                    self.assertEqual(meta["status"], str(answer.status or "000"))
                    self.assertEqual(meta["curl_exit"] == 0, answer.status is not None and answer.sent is None)
                    self.assertEqual(bool(meta["curl_errors"]), meta["curl_exit"] != 0)
                    self.assertTrue(body == answer.arrives, "the body kept is not the one sent")
                    self.assertEqual(b"X-Answer: " in headers, answer.status is not None)
                    self.assertIn(meta["request_range"], ("", "bytes=100-199"))
            self.assertEqual(failed, {request: checks for request, (_, checks) in wrong.items()})


if __name__ == "__main__":
    unittest.main(verbosity=2)
