#!/usr/bin/env python3
"""CY-TEMP-001, when nothing is changing, nothing runs: the settle probe of both front doors, / and /ar/.

    .venv/bin/python tools/probe-settle.py <dist-dir> <out-dir>

Serves <dist-dir> as the origin root (byte ranges answered, so the films seek) and drives headless Chrome over the
DevTools Protocol, a fresh profile per page. Before any page script, requestAnimationFrame calls are counted and
setTimeout/setInterval callbacks are counted when they fire; a video counts as playing if it played at any moment of
the window. Autoplay is allowed. In each profile: wait for the film's still state (body[data-state=still]); scroll
through the passage, to each of its words' windows (once the passage is whole it must follow the scroll: at the last
words it shows the frame the page's stretches name there; under reduced motion it never loads, and the still of ADII's
moment stands); scroll each system's sequence to the viewport centre and wait until it has played to its last frame; scroll
to the close and, once its scroll has been answered (0.5 s: the page answers a scroll with one frame), reset the counts
and wait 3 s; then scroll a sequence back into view (it must play), wait for every video to stop, reset and count 3 s
again. Each page then reads the worker's caches, its control after a reload, and a reload with the server
stopped (from /ar/ the worker registers at the site's root).

Bound: 0 frames requested, 0 timer callbacks and 0 media playing for 3 s once settled, in every profile of both pages;
a stimulus starts motion (outside reduced motion, where no sequence plays: it starts no media and no timer, its scroll
answered by one frame) and the page settles again; the passage follows the scroll once whole (under reduced motion it never loads, and the still stands). No request
leaves the local origin and the console logs no error. Writes <out-dir>/settle.json, the shape the
evidence ledger records; exits 0 on PASS, 1 on FAIL.
"""

import io
import json
import re
import subprocess
import sys
import tempfile
import threading
import time
import urllib.request
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

import websocket   # websocket-client, the one module outside the standard library (.venv)

CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
PROFILES = {   # label: width, height, device pixel ratio, mobile with touch, reduced motion
    "1440x900 · dpr 1": (1440, 900, 1, False, False),
    "390x844 · dpr 3 · mobile, touch": (390, 844, 3, True, False),
    "320x844 · dpr 2 · mobile, touch": (320, 844, 2, True, False),
    "1440x900 · reduced motion": (1440, 900, 1, False, True),
}
SEQUENCES = ("#awc-os", "#cythercad")
# the scroll taken to the middle of the window of words i, after 1.5 s: the moment the page's stretches name there (js/film.js
# measure, moment, place), the passage's frame, whether it is shown (body.scrub), and the poster the film's element stands on
BEAT = """(i => { const marks = [[0, 0]]; for (const p of document.querySelectorAll('.passage')) { const [a, b] = p.dataset.t.split(' ').map(Number),
  top = p.getBoundingClientRect().top + scrollY; marks.push([top, a], [top + p.offsetHeight, b]); }
const moment = y => { for (let k = 1; k < marks.length; k++) { const [y0, t0] = marks[k - 1], [y1, t1] = marks[k];
  if (y < y1) return t0 + (t1 - t0) * Math.max(0, y - y0) / ((y1 - y0) || 1); } return marks[marks.length - 1][1]; };
const place = t => { for (let k = 1; k < marks.length; k++) { const [y0, t0] = marks[k - 1], [y1, t1] = marks[k];
  if (t <= t1) return y0 + (y1 - y0) * (t - t0) / ((t1 - t0) || 1); } return marks[marks.length - 1][0]; };
  const [a, b] = document.querySelectorAll('.say')[i].dataset.t.split(' ').map(Number); scrollTo(0, place((a + b) / 2));
  return new Promise(done => setTimeout(() => done({want: moment(scrollY),
    at: document.getElementById('passage').currentTime, scrub: document.body.classList.contains('scrub'),
    poster: document.getElementById('film').poster.split('/').pop()}), 1500)); })(%d)"""
# Before any page script: frame requests are counted as they are made, timer callbacks as they fire; every video that
# plays or ends is kept, and the moment the body first turns still is stamped in page time (from navigation start).
COUNT = """(() => {
  const S = window.__settle = {raf: 0, timers: 0, moving: new Set(), ended: new Set(), still: null};
  const raf = window.requestAnimationFrame;
  window.requestAnimationFrame = function (f) { S.raf++; return raf.call(window, f); };
  for (const name of ["setTimeout", "setInterval"]) {
    const set = window[name];
    window[name] = function (f, ...rest) {
      return set.call(window, typeof f === "function" ? function () { S.timers++; return f.apply(this, arguments); } : f, ...rest);
    };
  }
  addEventListener("playing", e => S.moving.add(e.target), true);
  addEventListener("ended", e => S.ended.add(e.target), true);
  new MutationObserver(() => { if (S.still === null && document.body.dataset.state === "still") S.still = performance.now(); })
    .observe(document, {subtree: true, attributes: true, attributeFilter: ["data-state"]});
})();"""
PLAYING = "[...document.querySelectorAll('video')].filter(v => !v.paused && !v.ended)"
RESET = f"__settle.raf = __settle.timers = 0; __settle.moving = new Set({PLAYING});"
READ = f"({{raf: __settle.raf, timers: __settle.timers, playing: new Set([...__settle.moving, ...{PLAYING}]).size, state: document.body.dataset.state}})"
STILL = "document.body.dataset.state === 'still'"
STATEMENT = "(l => l.matches('.on') && getComputedStyle(l).opacity === '1')(document.querySelector('.landing'))"


class Files(SimpleHTTPRequestHandler):
    """dist/ as the origin root; a Range request is answered 206 with its bytes, as the films are fetched"""

    def send_head(self):
        path = Path(self.translate_path(self.path))
        m = re.fullmatch(r"bytes=(\d+)-(\d*)", self.headers.get("Range", ""))
        if not (m and path.is_file()):
            return super().send_head()
        data = path.read_bytes()
        start, end = int(m[1]), min(int(m[2] or len(data) - 1), len(data) - 1)
        self.send_response(206)
        self.send_header("Content-Type", self.guess_type(str(path)))
        self.send_header("Content-Range", f"bytes {start}-{end}/{len(data)}")
        self.send_header("Content-Length", str(end - start + 1))
        self.end_headers()
        return io.BytesIO(data[start:end + 1])

    def copyfile(self, source, out):
        try:
            super().copyfile(source, out)
        except (BrokenPipeError, ConnectionResetError):   # Chrome drops a media range it no longer needs: stop writing
            pass

    def log_message(self, *args):   # a line per media range would bury the result
        pass


def serve(dist, port):
    httpd = ThreadingHTTPServer(("127.0.0.1", port), partial(Files, directory=str(dist)))
    httpd.block_on_close = False   # stopping must not wait on a media response Chrome has stopped reading
    threading.Thread(target=httpd.serve_forever, daemon=True).start()
    return httpd


def chrome(profile):
    """headless Chrome on a fresh profile: the process, its DevTools port and its first page's socket"""
    proc = subprocess.Popen([CHROME, "--headless=new", "--remote-debugging-port=0", f"--user-data-dir={profile}",
                             "--autoplay-policy=no-user-gesture-required",
                             "--disable-background-networking",   # the browser's own calls home are not the site's
                             "about:blank"], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    active, deadline = Path(profile) / "DevToolsActivePort", time.monotonic() + 20
    while time.monotonic() < deadline:
        text = active.read_text() if active.is_file() else ""
        if "\n" in text:   # the port is written whole once its line ends
            port = text.split()[0]
            pages = [t for t in json.load(urllib.request.urlopen(f"http://127.0.0.1:{port}/json/list")) if t["type"] == "page"]
            if pages:
                return proc, port, pages[0]["webSocketDebuggerUrl"]
        time.sleep(0.1)
    raise SystemExit("Chrome opened no page to drive")


class Tab:
    """one page over the DevTools Protocol; its events are read while a command waits for its answer"""

    def __init__(self, url):
        self.ws = websocket.create_connection(url, suppress_origin=True, timeout=120)
        self.n, self.loads, self.requests, self.errors = 0, 0, [], []
        for domain in ("Page", "Runtime", "Log", "Network"):
            self.send(domain + ".enable")
        self.send("Page.addScriptToEvaluateOnNewDocument", source=COUNT)

    def event(self, m):
        p = m.get("params", {})
        match m.get("method"):
            case "Page.loadEventFired":
                self.loads += 1
            case "Network.requestWillBeSent":
                self.requests.append(p["request"]["url"])
            case "Log.entryAdded" if p["entry"]["level"] == "error":
                self.errors.append(f"{p['entry']['text']} {p['entry'].get('url', '')}".strip())
            case "Runtime.exceptionThrown":
                d = p["exceptionDetails"]
                self.errors.append(d.get("exception", {}).get("description") or d["text"])
            case "Runtime.consoleAPICalled" if p["type"] == "error":
                self.errors.append(" ".join(str(a.get("value", a.get("description", ""))) for a in p["args"]))

    def send(self, method, **params):
        self.n += 1
        self.ws.send(json.dumps({"id": self.n, "method": method, "params": params}))
        while True:
            m = json.loads(self.ws.recv())
            if m.get("id") == self.n:
                assert "error" not in m, (method, m["error"])
                return m["result"]
            self.event(m)

    def js(self, expr):
        r = self.send("Runtime.evaluate", expression=expr, returnByValue=True, awaitPromise=True)
        assert "exceptionDetails" not in r, (expr, r["exceptionDetails"])
        return r["result"].get("value")

    def load(self, url=None):
        """navigate to url, or reload; returns once the new document's load event has fired"""
        seen = self.loads
        if url:
            self.send("Page.navigate", url=url)
        else:
            self.send("Page.reload")
        while self.loads == seen:
            self.event(json.loads(self.ws.recv()))

    def emulate(self, width, height, dpr, mobile, reduced):
        self.send("Emulation.setDeviceMetricsOverride", width=width, height=height, deviceScaleFactor=dpr, mobile=mobile)
        self.send("Emulation.setTouchEmulationEnabled", enabled=mobile)
        self.send("Emulation.setEmulatedMedia",
                  features=[{"name": "prefers-reduced-motion", "value": "reduce" if reduced else "no-preference"}])


def until(tab, expr, seconds):
    end = time.monotonic() + seconds
    while not tab.js(expr) and time.monotonic() < end:
        time.sleep(0.1)


def window(tab, seconds, stimulus=""):
    """the counts over `seconds` from a reset, and the stimulus if one is given"""
    tab.js(RESET + stimulus)
    time.sleep(seconds)
    return tab.js(READ)


def observe(tab, origin, page, width, height, dpr, mobile, reduced):
    tab.load("about:blank")   # a fresh entry: a same-URL navigation would restore the last profile's scroll
    tab.emulate(width, height, dpr, mobile, reduced)
    tab.requests, tab.errors = [], []
    t0 = time.monotonic()
    tab.load(origin + page)
    time.sleep(max(0.0, t0 + 1 - time.monotonic()))
    row = {"state_at_1s": tab.js("document.body.dataset.state"),
           "no_js_class_removed": tab.js("!document.documentElement.classList.contains('no-js')")}
    until(tab, STILL, 30)
    still = tab.js("__settle.still")
    row["film_settled_after_s"] = None if still is None else round(still / 1000, 2)
    if not reduced:
        until(tab, "document.body.classList.contains('scrub')", 30)
    words = [tab.js(BEAT % i) for i in range(tab.js("document.querySelectorAll('.say').length"))]
    last = words[-1]
    row["passage_at_last_words"] = last
    row["passage_followed"] = (not last["scrub"] and last["poster"].startswith("passage-")) if reduced else \
        (last["scrub"] and abs(last["at"] - last["want"]) <= 1 / 24)
    for sel in SEQUENCES:
        v = f"document.querySelector('{sel} video')"
        tab.js(f"{v}.scrollIntoView({{block: 'center', behavior: 'instant'}}); __settle.at = performance.now();")
        # played once it ends; one still paused 3 s after it came into view will not play (reduced motion)
        until(tab, f"__settle.ended.has({v}) || {v}.paused && performance.now() - __settle.at > 3000", 20)
        row[sel + "_played"] = tab.js(f"__settle.ended.has({v})")
    tab.js("document.querySelector('.close').scrollIntoView({block: 'end', behavior: 'instant'})")
    time.sleep(0.5)   # the scroll is input: the page answers it with one frame, before the settled window begins
    row["settled_3s"] = window(tab, 3)
    # the close leaves #awc-os out of view, so bringing it back is a crossing its observer answers
    row["after_stimulus"] = window(tab, 1, "document.querySelector('#awc-os video').scrollIntoView({block: 'center', behavior: 'instant'})")
    until(tab, f"{PLAYING}.length === 0", 20)
    row["resettled_3s"] = window(tab, 3)
    row["doc_width"] = tab.js("document.documentElement.scrollWidth")
    row["overflow_x"] = max(0, row["doc_width"] - width)   # the emulated width: mobile emulation widens innerWidth to the content
    row["requests_observed"] = len(tab.requests)
    row["external_requests"] = [u for u in tab.requests if not u.startswith(origin + "/")]
    row["console_errors"] = tab.errors
    quiet = {"raf": 0, "timers": 0, "playing": 0, "state": "still"}
    row["pass"] = (row["settled_3s"] == quiet and row["resettled_3s"] == quiet
                   and (row["after_stimulus"]["playing"] == row["after_stimulus"]["timers"] == 0 if reduced
                        else row["after_stimulus"]["playing"] >= 1)
                   and row["state_at_1s"] == ("still" if reduced else "film") and row["no_js_class_removed"] and row["passage_followed"]
                   and all(row[s + "_played"] != reduced for s in SEQUENCES)
                   and not row["external_requests"] and not row["console_errors"])
    return row


def worker(tab, origin, httpd):
    tab.emulate(1440, 900, 1, False, False)   # motion allowed: offline, the film is asked for and cannot come
    caches = tab.js("caches.keys()")
    tab.js("scrollTo(0, 0)")
    tab.load()
    controlled = tab.js("!!navigator.serviceWorker.controller")
    httpd.shutdown()
    httpd.server_close()
    tab.errors = []
    tab.js("scrollTo(0, 0)")
    tab.load()
    until(tab, STILL, 30)
    until(tab, STATEMENT, 3)
    return {"caches": caches, "controlled_after_reload": controlled, "offline_reload_with_the_server_stopped": {
        "build": tab.js("document.querySelector('meta[name=build-hash]').content"),
        "state": tab.js("document.body.dataset.state"),
        "statement_visible": tab.js(STATEMENT),
        "poster_shown": tab.js("document.getElementById('film').poster").removeprefix(origin + "/"),
        "fonts_loaded": ",".join(sorted(tab.js("[...document.fonts].filter(f => f.status === 'loaded').map(f => f.family)"))),
        # media go to the network uncached (sw.js), so with the server gone they are the errors expected
        "console_errors_besides_the_unreachable_film": [e for e in tab.errors if ".mp4" not in e]}}


def whole(w, build):
    off = w["offline_reload_with_the_server_stopped"]
    return (len(w["caches"]) == 1 and build in w["caches"][0] and w["controlled_after_reload"] and off["build"] == build
            and off["state"] == "still" and off["statement_visible"] and not off["console_errors_besides_the_unreachable_film"])


def main():
    dist, out = Path(sys.argv[1]).resolve(), Path(sys.argv[2])
    build = re.search(r'<meta name="build-hash" content="([0-9A-F]+)">', (dist / "index.html").read_text()).group(1)
    report, port = {"artifact_build": build}, 0
    for page in ("/", "/ar/"):
        httpd = serve(dist, port)   # the second page restarts the origin on the first one's port
        port = httpd.server_address[1]
        origin = f"http://127.0.0.1:{port}"
        with tempfile.TemporaryDirectory() as profile:
            proc, devtools, url = chrome(profile)
            report["chrome"] = json.load(urllib.request.urlopen(f"http://127.0.0.1:{devtools}/json/version"))["Browser"]
            tab = Tab(url)
            rows = {label: observe(tab, origin, page, *spec) for label, spec in PROFILES.items()}
            rows["worker"] = worker(tab, origin, httpd)
            proc.terminate()
            proc.wait()
        report[page] = rows
        for label in PROFILES:
            r = rows[label]
            print(page, label, "PASS" if r["pass"] else "FAIL", r["settled_3s"], r["after_stimulus"], r["resettled_3s"])
        print(page, "worker", json.dumps(rows["worker"], ensure_ascii=False))
    ok = all(report[p][label]["pass"] for p in ("/", "/ar/") for label in PROFILES) and all(
        whole(report[p]["worker"], build) for p in ("/", "/ar/"))
    report["result"] = "PASS" if ok else "FAIL"
    out.mkdir(parents=True, exist_ok=True)
    (out / "settle.json").write_text(json.dumps(report, indent=1, ensure_ascii=False) + "\n", encoding="utf-8")
    print(report["result"])
    sys.exit(0 if ok else 1)


if __name__ == "__main__":
    main()
