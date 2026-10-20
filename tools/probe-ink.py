#!/usr/bin/env python3
"""CY-SEM-003, reading ink over the film and the passage: WCAG 2.1 contrast of each reading element's computed ink against
every ground pixel at its glyph support, on both front doors (/ and /ar/), dark and light, at three viewports.

The built artifact is served as the origin root by a server that answers byte ranges (the films must seek) and opened in
headless Chrome over the DevTools Protocol, no served file edited: play() is stubbed to resolve without playing, so
js/film.js counts the film started (GUARD is cleared) and it holds where it is seeked, and the page reports itself
hidden, whose time the stall rule (STALL) does not count. For each declared second the film is seeked (the seek must
land within 0.05 s), then 1.0 s for the cue and its 0.6 s fade; the page must still be in its film state, the film at
that second, showing the cue data-from/data-to name. Then the film is ended (the still state); once the passage is whole
(body.scrub) the scroll is taken to the middle of each of its words' windows, and the passage must show the frame the page's own
stretches name for that scroll (their data-t, within a frame) under those words, shown; then each remaining section is
scrolled to the viewport centre. Each sample is captured with every glyph's fill transparent (the ground composited
beneath it, text-shadow and darkening included) and with every fill #FF00FF: glyph support = pixels differing by >= 64
in a channel. The page's CSP is bypassed for the probe's capture style only.

Bound: >= 4.5:1 at every glyph-support pixel of every fully opaque reading element, its ink alpha-composited.

    .venv/bin/python tools/probe-ink.py <dist> <out> [--shots]

writes <out>/ink.json (with --shots, each sample's two captures too). Exit 0 PASS, 1 FAIL; 2 when the run could not
measure (the page not held where the method needs it, a capture it cannot read): no verdict, and no ink.json."""

import argparse, base64, functools, http.server, itertools, json, re, shutil, struct, subprocess, sys, tempfile
import threading, time, urllib.request, zlib
from pathlib import Path

import websocket   # websocket-client, the one module outside the standard library (.venv)

CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
PAGES = (("/", ""), ("/ar/", "ar/"))
VIEWPORTS = ((1440, 900, 1, False), (390, 844, 3, True), (320, 844, 2, True))
SECONDS = (1.0, 2.0, 3.0, 4.2, 5.0, 5.8, 6.6, 8.0, 9.0, 9.9, 11.0, 11.9)
SECTIONS = ("#awc-os", "#cythercad", ".close")
BOUND, SUPPORT, INF = 4.5, 64, float("inf")

HOLD = ("HTMLMediaElement.prototype.play = function () { return Promise.resolve(); };"
        "Object.defineProperty(Document.prototype, 'hidden', { get: () => true });")
SEEK = """new Promise(done => { const v = document.getElementById('film');
  setTimeout(() => done(null), 10000);
  const go = () => { v.addEventListener('seeked', () => done(v.currentTime), { once: true }); v.currentTime = %s; };
  v.readyState >= 2 ? go() : v.addEventListener('loadeddata', go, { once: true }); })"""
# the page's state, where the film stands, the cue the page's own data names for second T (film.js cue(): a line
# from <= T < to, the landing from T on) and the cue shown, as each one's computed opacity
CUE = """(T => { const cues = [...document.querySelectorAll('.line'), document.querySelector('.landing')];
  return JSON.stringify([document.body.dataset.state, document.getElementById('film').currentTime,
    cues.map(c => T >= +c.dataset.from && (c.dataset.to === undefined || T < +c.dataset.to) ? '1' : '0'),
    cues.map(c => getComputedStyle(c).opacity)]); })(%s)"""
# leaf reading elements: their own text, visible, fully opaque through every ancestor, in the viewport (CSS px)
ELEMENTS = r"""JSON.stringify([...document.querySelectorAll('body *')].flatMap(e => {
  if (['SCRIPT', 'STYLE', 'VIDEO'].includes(e.tagName) || ![...e.childNodes].some(n => n.nodeType === 3 && n.textContent.trim())) return [];
  const cs = getComputedStyle(e), r = e.getBoundingClientRect();
  let op = 1; for (let a = e; a; a = a.parentElement) op *= +getComputedStyle(a).opacity;
  if (cs.visibility !== 'visible' || op < 0.99 || r.width < 1 || r.height < 1 || r.bottom < 0 || r.top > innerHeight || r.right < 0 || r.left > innerWidth) return [];
  return [{ element: e.tagName.toLowerCase() + (typeof e.className === 'string' && e.className ? '.' + e.className.split(' ')[0] : ''),
            text: e.textContent.trim().slice(0, 40), ink: cs.color, x: r.left, y: r.top, w: r.width, h: r.height }]; }))"""
# the passage's moments as the page computes them (js/film.js measure, moment, place): each stretch maps its top and foot
# to its data-t; the scroll taken to the middle of the window of words i, then that moment, the passage's frame, the words' state
PASSAGE = """const marks = [[0, 0]]; for (const p of document.querySelectorAll('.passage')) { const [a, b] = p.dataset.t.split(' ').map(Number),
  top = p.getBoundingClientRect().top + scrollY; marks.push([top, a], [top + p.offsetHeight, b]); }
const moment = y => { for (let i = 1; i < marks.length; i++) { const [y0, t0] = marks[i - 1], [y1, t1] = marks[i];
  if (y < y1) return t0 + (t1 - t0) * Math.max(0, y - y0) / ((y1 - y0) || 1); } return marks[marks.length - 1][1]; };
const place = t => { for (let i = 1; i < marks.length; i++) { const [y0, t0] = marks[i - 1], [y1, t1] = marks[i];
  if (t <= t1) return y0 + (y1 - y0) * (t - t0) / ((t1 - t0) || 1); } return marks[marks.length - 1][0]; };"""
BEAT = """(i => { """ + PASSAGE + """ const say = document.querySelectorAll('.say')[i], [a, b] = say.dataset.t.split(' ').map(Number);
  scrollTo(0, place((a + b) / 2));
  return new Promise(done => setTimeout(() => done(JSON.stringify({want: moment(scrollY),
    at: document.getElementById('passage').currentTime, seeking: document.getElementById('passage').seeking,
    on: say.classList.contains('on'), opacity: getComputedStyle(say).opacity, state: document.body.dataset.state})), 1300)); })(%d)"""
# the footer's text wholly in the viewport (its box may overhang it by a fraction of a pixel): its reading ink is
# measured with the close
FOOTER = """(r => { r.selectNodeContents(document.querySelector('footer')); const b = r.getBoundingClientRect();
  return b.top >= 0 && b.bottom <= innerHeight; })(document.createRange())"""
# the probe's capture style, after two frames so the capture shows it (a frame count, not a timed wait: the darkening
# gradients' dither alternates between frames by up to 2 levels, and a fixed count makes runs repeat); null removes it
FILL = """(c => { document.getElementById('probe-ink')?.remove(); if (!c) return;
  const s = document.createElement('style'); s.id = 'probe-ink';
  s.textContent = `*{-webkit-text-fill-color:${c}!important;transition:none!important}`; document.head.append(s);
  return new Promise(done => requestAnimationFrame(() => requestAnimationFrame(done))); })(%s)"""


def broken(why):
    print(f"probe-ink: NOT MEASURED: {why}", file=sys.stderr)
    raise SystemExit(2)


class Ranges(http.server.SimpleHTTPRequestHandler):
    """the artifact as the origin root; a Range request is answered 206, so the films seek (http.server answers none)"""
    def do_GET(self):
        m, path = re.fullmatch(r"bytes=(\d+)-(\d*)", self.headers.get("Range", "")), Path(self.translate_path(self.path))
        if not (m and path.is_file()):
            return super().do_GET()
        data = path.read_bytes()
        a, b = int(m[1]), min(int(m[2] or len(data) - 1), len(data) - 1)
        self.send_response(206)
        self.send_header("Content-Type", self.guess_type(str(path)))
        self.send_header("Content-Range", f"bytes {a}-{b}/{len(data)}")
        self.send_header("Content-Length", str(b - a + 1))
        self.end_headers()
        self.wfile.write(data[a:b + 1])

    def log_message(self, *args):
        pass


ids = itertools.count(1)
def send(method, **params):
    i = next(ids)
    WS.send(json.dumps({"id": i, "method": method, "params": params}))
    while (m := json.loads(WS.recv())).get("id") != i:
        pass   # events: none is read
    if "error" in m:
        broken(f"{method}: {m['error']}")
    return m["result"]

def js(expression):
    r = send("Runtime.evaluate", expression=expression, returnByValue=True, awaitPromise=True)
    if "exceptionDetails" in r:
        broken(f"page script: {r['exceptionDetails']}")
    return r["result"].get("value")


def pixels(png):
    """Chrome's screenshot as RGB bytes: 8-bit RGB, not interlaced (anything else stops the run rather than being
    misread), each row undone by its own PNG filter"""
    i, idat = 8, []
    while i < len(png):
        n, tag = struct.unpack(">I4s", png[i:i + 8])
        if tag == b"IHDR":
            w, h, depth, ctype, _, _, interlace = struct.unpack(">IIBBBBB", png[i + 8:i + 21])
        elif tag == b"IDAT":
            idat.append(png[i + 8:i + 8 + n])
        i += 12 + n
    if (depth, ctype, interlace) != (8, 2, 0):
        broken(f"screenshot PNG is depth {depth}, colour type {ctype}, interlace {interlace}")
    raw, stride, prev, rows = zlib.decompress(b"".join(idat)), 3 * w, bytes(3 * w), []
    for y in range(h):
        f, row = raw[y * (stride + 1)], bytearray(raw[y * (stride + 1) + 1:(y + 1) * (stride + 1)])
        if f == 1:   # Sub
            for k in range(3, stride):
                row[k] = (row[k] + row[k - 3]) & 255
        elif f == 2:   # Up, every row optimizeForSpeed writes, at C speed: each byte in a 16-bit lane, so no carry crosses
            wa, wb = bytearray(2 * stride), bytearray(2 * stride)
            wa[1::2], wb[1::2] = row, prev
            row = (int.from_bytes(wa) + int.from_bytes(wb)).to_bytes(2 * stride)[1::2]
        elif f == 3:   # Average
            for k in range(stride):
                row[k] = (row[k] + (((row[k - 3] if k >= 3 else 0) + prev[k]) >> 1)) & 255
        elif f == 4:   # Paeth
            for k in range(stride):
                a, b, c = (row[k - 3], prev[k], prev[k - 3]) if k >= 3 else (0, prev[k], 0)
                pa, pb, pc = abs(b - c), abs(a - c), abs(a + b - 2 * c)
                row[k] = (row[k] + (a if pa <= pb and pa <= pc else b if pb <= pc else c)) & 255
        rows.append(row)
        prev = row
    return w, h, b"".join(rows)


def lum(c):   # WCAG 2.1 relative luminance; a composited ink's channels may be fractional
    f = [v / 255 / 12.92 if v / 255 <= 0.03928 else ((v / 255 + 0.055) / 1.055) ** 2.4 for v in c]
    return 0.2126 * f[0] + 0.7152 * f[1] + 0.0722 * f[2]

def capture(color, shot):
    js(FILL % json.dumps(color))
    # optimizeForSpeed: the default encoder's pixels, every row filtered Up
    png = base64.b64decode(send("Page.captureScreenshot", format="png", optimizeForSpeed=True)["data"])
    if shot:
        shot.write_bytes(png)
    return pixels(png)

def measure(name, w, h, dpr, shots):
    els = json.loads(js(ELEMENTS))
    pw, ph, ground = capture("transparent", shots and shots / f"{name}-ground.png")
    _, _, glyph = capture("#FF00FF", shots and shots / f"{name}-glyph.png")
    js(FILL % "null")
    if (pw, ph) != (w * dpr, h * dpr):
        broken(f"{name}: capture is {pw}x{ph}, not {w * dpr}x{h * dpr}")
    out = []
    for e in els:
        m = re.fullmatch(r"rgba?\((\d+), (\d+), (\d+)(?:, ([\d.]+))?\)", e["ink"])
        if not m:
            broken(f"{name}: unreadable ink {e['ink']!r} of {e['element']}")
        ink, a = [int(v) for v in m.group(1, 2, 3)], float(m[4] or 1)
        x0, y0 = max(0, int(e["x"] * dpr)), max(0, int(e["y"] * dpr))
        x1, y1 = min(pw, int((e["x"] + e["w"]) * dpr) + 1), min(ph, int((e["y"] + e["h"]) * dpr) + 1)
        vals = []
        for y in range(y0, y1):
            o = (y * pw + x0) * 3
            g, s = ground[o:o + (x1 - x0) * 3], glyph[o:o + (x1 - x0) * 3]
            if g == s:
                continue
            for k in range(0, len(g), 3):
                gp = g[k:k + 3]
                if max(abs(gp[0] - s[k]), abs(gp[1] - s[k + 1]), abs(gp[2] - s[k + 2])) < SUPPORT:
                    continue
                li, lg = lum([ink[c] * a + gp[c] * (1 - a) for c in range(3)]), lum(gp)
                vals.append((max(li, lg) + 0.05) / (min(li, lg) + 0.05))
        if vals:
            vals.sort()
            out.append({"element": e["element"], "text": e["text"], "ink": ink, "glyph_px": len(vals),
                        "min": round(vals[0], 2), "p01": round(vals[max(0, int(len(vals) * 0.01) - 1)], 2)})
    return out

def held(key, sample, t):
    """the page holds the sample: the film state with the film at second t, or (t infinite) the still state; and the cue
    shown is the one the page names for t"""
    state, at, want, shown = json.loads(js(CUE % json.dumps(t)))
    if state != ("film" if t < INF else "still") or (t < INF and abs(at - t) > 0.05) or want != shown:
        broken(f"{key} {sample}: the page is {state!r} with the film at {at} s; its cue for {t} is {want}, "
               f"the cues shown (opacity) {shown}")


def profile(origin, page, path, scheme, w, h, dpr, mobile, shots):
    key = f"{page} · {scheme} · {w}x{h} · dpr {dpr}" + (" · mobile, touch" if mobile else "")
    stem = f"{'ar' if path else 'en'}-{scheme}-{w}x{h}-"
    send("Emulation.setDeviceMetricsOverride", width=w, height=h, deviceScaleFactor=dpr, mobile=mobile)
    send("Emulation.setTouchEmulationEnabled", enabled=mobile)
    send("Emulation.setEmulatedMedia", features=[{"name": "prefers-color-scheme", "value": scheme}])   # js/theme.js follows it
    send("Page.navigate", url=origin + path)
    time.sleep(2.5)
    samples = {}
    for t in SECONDS:
        landed = js(SEEK % t)
        if landed is None or abs(landed - t) > 0.05:
            broken(f"{key}: the seek to {t} s landed at {landed}; the server must answer byte ranges")
        time.sleep(1.0)   # the cue interval (80 ms), the 0.6 s fade, one decoded frame
        held(key, f"t{t}", t)
        samples[f"t{t}"] = measure(f"{stem}t{t}", w, h, dpr, shots)
    js("document.getElementById('film').dispatchEvent(new Event('ended'))")
    time.sleep(0.6)
    held(key, "still", INF)
    samples["still"] = measure(f"{stem}still", w, h, dpr, shots)
    for _ in range(300):   # the passage downloads once the film is still, and is shown once whole
        if js("document.body.classList.contains('scrub')"):
            break
        time.sleep(0.1)
    else:
        broken(f"{key}: the passage was not whole 30 s after the film was still")
    for i in range(js("document.querySelectorAll('.say').length")):
        b = json.loads(js(BEAT % i))
        if b["state"] != "still" or b["seeking"] or abs(b["at"] - b["want"]) > 1 / 24 or not b["on"] or b["opacity"] != "1":
            broken(f"{key} beat {i}: {b}")
        samples[f"beat{i}"] = measure(f"{stem}beat{i}", w, h, dpr, shots)
    for sel in SECTIONS:
        js(f"document.querySelector('{sel}').scrollIntoView({{ block: 'center' }})")
        time.sleep(1.2)   # the sequence's observer, its poster
        held(key, sel, INF)
        if sel == ".close" and not js(FOOTER):
            broken(f"{key} .close: the footer's text is not wholly in view")
        samples[sel] = measure(stem + sel.strip("#."), w, h, dpr, shots)
    flat = sorted(({"sample": k, **r} for k, rs in samples.items() for r in rs), key=lambda r: r["min"])
    below = [r for r in flat if r["min"] < BOUND]
    print(f"{key}: {len(flat)} elements, worst {flat[0]['min']} ({flat[0]['sample']} {flat[0]['element']} "
          f"{flat[0]['text']!r}), {len(below)} below {BOUND}", flush=True)
    return key, {"elements_measured": len(flat), "worst": flat[0], "below_4_5": below, "samples": samples}


def main():
    global WS
    ap = argparse.ArgumentParser(description="CY-SEM-003: reading ink over the film and the passage, at glyph support")
    ap.add_argument("dist"); ap.add_argument("out"); ap.add_argument("--shots", action="store_true", help="keep the captures")
    args = ap.parse_args()
    dist, out = Path(args.dist).resolve(), Path(args.out)
    build = re.search(r'<meta name="build-hash" content="(\w+)">', (dist / "index.html").read_text(encoding="utf-8"))[1]
    out.mkdir(parents=True, exist_ok=True)
    srv = http.server.ThreadingHTTPServer(("127.0.0.1", 0), functools.partial(Ranges, directory=str(dist)))
    threading.Thread(target=srv.serve_forever, daemon=True).start()
    origin = f"http://127.0.0.1:{srv.server_address[1]}/"
    home = Path(tempfile.mkdtemp(prefix="probe-ink-"))   # a fresh profile: no worker, cache or remembered theme
    chrome = subprocess.Popen([CHROME, "--headless=new", "--remote-debugging-port=0", f"--user-data-dir={home}",
                               "--hide-scrollbars", "--disable-background-networking", "about:blank"],
                              stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    try:
        for _ in range(200):
            if (home / "DevToolsActivePort").exists():
                break
            time.sleep(0.1)
        else:
            broken("Chrome opened no DevTools port in 20 s")
        port = (home / "DevToolsActivePort").read_text().split()[0]
        tab = next(t for t in json.load(urllib.request.urlopen(f"http://127.0.0.1:{port}/json/list")) if t["type"] == "page")
        WS = websocket.create_connection(tab["webSocketDebuggerUrl"], timeout=60, suppress_origin=True)
        version = send("Browser.getVersion")["product"]
        send("Page.enable")   # without it no script is added to a new document
        send("Page.setBypassCSP", enabled=True)   # the probe's capture style only: the page loads nothing but 'self'
        send("Page.addScriptToEvaluateOnNewDocument", source=HOLD)
        profiles = dict(profile(origin, page, path, scheme, *vp, args.shots and out)
                        for page, path in PAGES for scheme in ("dark", "light") for vp in VIEWPORTS)
    finally:
        chrome.terminate()
        chrome.wait()
        shutil.rmtree(home)
    result = "FAIL" if any(p["below_4_5"] for p in profiles.values()) else "PASS"
    report = {"artifact_build": build, "chrome": version, "result": result, **profiles}
    (out / "ink.json").write_text(json.dumps(report, indent=1, ensure_ascii=False) + "\n", encoding="utf-8")
    print(f"{result}: build {build}, {sum(p['elements_measured'] for p in profiles.values())} element samples over "
          f"{len(profiles)} profiles, worst {min(p['worst']['min'] for p in profiles.values())}:1 ({version})")
    return result == "PASS"


if __name__ == "__main__":
    sys.exit(0 if main() else 1)
