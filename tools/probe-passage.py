#!/usr/bin/env python3
"""The passage arrives whole and keeps its place: a regression probe of both front doors' passage (js/film.js).

    .venv/bin/python tools/probe-passage.py <dist-dir> <out-dir>

L  Loading. The passage becomes active (body.scrub) on both front doors, on a phone held upright and on its side, over a
   server that answers the video element's own requests for the passage with only its first 60 % and then nothing more.
   A paused clip's download is the browser's to defer: on 2026-10-22 a review found Chrome resting one at 17.7 of its
   25 s, readyState 4, and the passage never became active, its stills standing for good.
R  Place. With the passage active, at each system's words, a phone turned (upright, on its side, upright again), a
   phone-sized window turned the same way and a desktop window resized keep the passage's moment within RANGE seconds and
   show the same words. Every stretch is as tall as its seconds of the viewport (50svh a second), so the same scroll
   offset names another moment in another viewport: the review found a visitor at AWC-OS's words carried elsewhere in the
   story. (A phone turned under mobile emulation can keep its place without the page: Chrome anchors a turned mobile
   page itself. The windows do not.) Once the turned clip is active, it shows the moment's frame.

Serves <dist-dir> as probe-settle.py does (byte ranges answered) and drives headless Chrome over the DevTools Protocol,
a fresh profile per page, autoplay allowed; the moment is read from the page's own stretches (data-t), as js/film.js
names it. Writes <out-dir>/passage.json; exits 0 on PASS, 1 on FAIL.
"""
import importlib.util, json, re, sys, tempfile, threading, time
from functools import partial
from http.server import ThreadingHTTPServer
from pathlib import Path

HERE = Path(__file__).resolve().parent
spec = importlib.util.spec_from_file_location("settle", HERE / "probe-settle.py")   # its server, Chrome and tab
ps = importlib.util.module_from_spec(spec); spec.loader.exec_module(ps)
DIST, OUT = Path(sys.argv[1]), Path(sys.argv[2])
RANGE, CUT = 0.25, 0.6
UPRIGHT, SIDE, DESK, NARROW = (390, 844, 2, True), (844, 390, 2, True), (1440, 900, 1, False), (1100, 700, 1, False)
TALL, WIDE = (390, 844, 2, False), (844, 390, 2, False)   # a phone-sized window, no mobile emulation
STOP = threading.Event()


class Withheld(ps.Files):
    """The video element's requests for the passage get bytes only below CUT of the clip, then nothing: its download
    never completes. Every other request, the page's own fetch of the clip among them, is answered whole."""
    def send_head(self):
        path = Path(self.translate_path(self.path))
        if not (re.search(r"/film/passage-(landscape|portrait)\.mp4$", path.as_posix()) and
                self.headers.get("Sec-Fetch-Dest") == "video"):
            return super().send_head()
        data = path.read_bytes()
        m = re.fullmatch(r"bytes=(\d+)-(\d*)", self.headers.get("Range", ""))
        start = int(m[1]) if m else 0
        end = min(int(m[2] or len(data) - 1), len(data) - 1) if m else len(data) - 1
        self.send_response(206 if m else 200)
        self.send_header("Content-Type", "video/mp4")
        if m: self.send_header("Content-Range", f"bytes {start}-{end}/{len(data)}")
        self.send_header("Content-Length", str(end - start + 1))
        self.end_headers()
        self.wfile.write(data[start:max(start, min(end + 1, int(len(data) * CUT)))]); self.wfile.flush()
        STOP.wait(120)   # the rest never comes
        return None


def serve(handler):
    httpd = ThreadingHTTPServer(("127.0.0.1", 0), partial(handler, directory=str(DIST)))
    httpd.block_on_close, httpd.daemon_threads = False, True
    threading.Thread(target=httpd.serve_forever, daemon=True).start()
    return httpd, f"http://127.0.0.1:{httpd.server_address[1]}"


MOMENT = """(() => { const marks = [[0, 0]];
  for (const p of document.querySelectorAll('.passage')) { const [a, b] = p.dataset.t.split(' ').map(Number), top = p.getBoundingClientRect().top + scrollY;
    marks.push([top, a], [top + p.offsetHeight, b]); }
  let i = 1; while (i < marks.length - 1 && scrollY >= marks[i][0]) i++;
  const [y0, t0] = marks[i - 1], [y1, t1] = marks[i], t = t0 + (t1 - t0) * Math.max(0, scrollY - y0) / ((y1 - y0) || 1);
  const pv = document.getElementById('passage');
  return {t: +t.toFixed(3), words: [...document.querySelectorAll('.say')].filter(s => +getComputedStyle(s).opacity > 0.9).map(s => s.id || s.textContent.trim().slice(0, 24)),
          scrub: document.body.classList.contains('scrub'), frame: +pv.currentTime.toFixed(3)}; })()"""
GO = """(t => { const marks = [[0, 0]];
  for (const p of document.querySelectorAll('.passage')) { const [a, b] = p.dataset.t.split(' ').map(Number), top = p.getBoundingClientRect().top + scrollY;
    marks.push([top, a], [top + p.offsetHeight, b]); }
  let i = 1; while (i < marks.length - 1 && t >= marks[i][1]) i++;
  const [y0, t0] = marks[i - 1], [y1, t1] = marks[i]; scrollTo(0, y0 + (y1 - y0) * (t - t0) / ((t1 - t0) || 1)); })"""
LOADED = "(v => ({scrub: document.body.classList.contains('scrub'), src: v.currentSrc.split(':')[0], ready: v.readyState, " \
         "buffered: v.buffered.length ? +v.buffered.end(v.buffered.length - 1).toFixed(3) : 0, duration: +(v.duration || 0).toFixed(3)}))(document.getElementById('passage'))"


def tab_for(profile):
    proc, port, url = ps.chrome(profile)
    return proc, ps.Tab(url)


def size(tab, w, h, dpr, mobile):
    tab.send("Emulation.setDeviceMetricsOverride", width=w, height=h, deviceScaleFactor=dpr, mobile=mobile,
             screenOrientation={"type": "portraitPrimary" if h > w else "landscapePrimary", "angle": 0 if h > w else 90})
    tab.send("Emulation.setTouchEmulationEnabled", enabled=mobile)


def open_past_the_film(tab, origin, page, view):
    tab.load("about:blank"); size(tab, *view); tab.load(origin + page)
    ps.until(tab, "document.body.dataset.state === 'film'", 10)
    tab.js("scrollTo(0, innerHeight)")   # the visitor scrolls on: the film gives way to its still and the passage loads
    ps.until(tab, "document.body.classList.contains('scrub')", 20)


rows, ok = [], True
def record(**row):
    global ok
    ok &= row["pass"]; rows.append(row)
    print(("PASS  " if row["pass"] else "FAIL  ") + json.dumps({k: v for k, v in row.items() if k != "pass"}, ensure_ascii=False))


with tempfile.TemporaryDirectory() as profile:
    httpd, origin = serve(Withheld)
    proc, tab = tab_for(profile)
    for page in ("/", "/ar/"):
        for name, view in (("upright", UPRIGHT), ("side", SIDE)):
            open_past_the_film(tab, origin, page, view)
            got = tab.js(LOADED)
            record(probe="loading", page=page, phone=name, **got, **{"pass": got["scrub"]})
    proc.terminate(); proc.wait(); httpd.shutdown()

with tempfile.TemporaryDirectory() as profile:
    httpd, origin = serve(ps.Files)
    proc, tab = tab_for(profile)
    for page in ("/", "/ar/"):
        for name, first, turns in (("phone", UPRIGHT, (SIDE, UPRIGHT)), ("phone-sized window", TALL, (WIDE, TALL)),
                                   ("desktop", DESK, (NARROW, DESK))):
            open_past_the_film(tab, origin, page, first)
            for target in ("adii-evidence", "awc-os-evidence", "cythercad-evidence"):
                size(tab, *first)
                ps.until(tab, "document.body.classList.contains('scrub')", 20)
                mid = tab.js(f"(s => {{ const [a, b] = s.dataset.t.split(' ').map(Number); return (a + b) / 2; }})(document.getElementById('{target}'))")
                tab.js(GO + f"({mid})"); time.sleep(0.8)
                seen = [tab.js(MOMENT)]
                for view in turns:
                    size(tab, *view); time.sleep(1.2)
                    seen.append(tab.js(MOMENT))
                    ps.until(tab, "document.body.classList.contains('scrub')", 20); time.sleep(0.6)   # the turned clip, whole
                    seen[-1]["shows"] = tab.js(MOMENT)["frame"]
                kept = all(abs(s["t"] - seen[0]["t"]) <= RANGE and target in s["words"] for s in seen) and \
                    all(abs(s["shows"] - s["t"]) <= 0.05 for s in seen[1:])
                record(probe="place", page=page, device=name, words=target, moments=[s["t"] for s in seen],
                       frames=[s.get("shows") for s in seen[1:]], shown=[s["words"] for s in seen], **{"pass": kept})
    proc.terminate(); proc.wait(); httpd.shutdown()
STOP.set()

OUT.mkdir(parents=True, exist_ok=True)
build = (DIST / "index.html").read_text(encoding="utf-8").split('name="build-hash" content="')[1][:16]
(OUT / "passage.json").write_text(json.dumps({"artifact_build": build, "result": "PASS" if ok else "FAIL", "rows": rows},
                                             indent=1, ensure_ascii=False), encoding="utf-8")
print(("PASS" if ok else "FAIL") + f": build {build}, {len(rows)} rows")
sys.exit(0 if ok else 1)
