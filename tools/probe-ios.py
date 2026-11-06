#!/usr/bin/env python3
"""The front doors in the iOS Simulator's WebKit (no obligation; run after any change to how js/film.js loads or holds the film or
the passage). It is iOS WebKit, not a phone: nothing here speaks for a radio, Low Power Mode, memory or heat.

    .venv/bin/python tools/probe-ios.py <dist-dir> <out-dir>

iOS Safari offers no CDP, so a throwaway copy of the artifact carries a script that reports to this probe's server, and its
worker is emptied (a reused port must not answer from an old cache). Its presses are a script's, since the simulator takes no
scripted touch; hit-testing is reported beside them. The first load after a boot measures the boot, and is not judged.

film     The statement and links shown, the film playing behind them at real time, the bar fixed and what a pointer reaches, no
         error; then the still state.
rest     With the film over, the frame holds: the middle of two screenshots four seconds apart differs by at most HOLD levels,
         on each of TRIALS loads. No script can see this. Until 2026-11-05 the passage, asked to play and paused at once, reported
         itself paused at 0 and went on showing frames on 8 of 10 loads: AWC-OS's and then CytherCAD's, behind the statement, on a
         page at rest (0 of 10 with a seek after the pause, the same harness, in turn).
words    Opened on the passage's words, or a stretch, those words are shown and the frame holds. WebKit runs its own anchor after
         the load, so the stretches' scroll-margin takes it to the same words the page goes to.
press    *The three systems ↓* shows the first words, and the close's address is a mailto: link.
foot     At the page's foot the passage stands at its last second. svh settled after the page's first measure with no resize event
         until 2026-11-05, and every moment stood 8% early, the foot short of the end.
flat     Both looked flat's frame holds at rest, as the film's does.
glass    Its instrument, upright (the Simulator cannot be turned by a script, and takes no scripted finger, so this is geometry and style): ready, on
         touch-action none, under the fixed bar, *Talk to us* what a pointer reaches, and the reading in view with the glass at the window's foot.

Writes <out-dir>/ios.json and the screenshots; exits 0 on PASS, 1 on FAIL.
"""
import importlib.util, json, re, shutil, subprocess, sys, tempfile, threading, time
from functools import partial
from http.server import ThreadingHTTPServer
from pathlib import Path

HERE = Path(__file__).resolve().parent
spec = importlib.util.spec_from_file_location("settle", HERE / "probe-settle.py")   # its server: byte ranges, as the films are fetched
ps = importlib.util.module_from_spec(spec); spec.loader.exec_module(ps)
DIST, OUT = Path(sys.argv[1]).resolve(), Path(sys.argv[2]); OUT.mkdir(parents=True, exist_ok=True)
HOLD, TRIALS, REPORTS, rows, ok = 2.0, 3, [], [], True
DIAG = r"""(function () {
  var q = new URLSearchParams(location.search), tag = q.get('t'), errors = [], says = document.getElementsByClassName('say');
  addEventListener('error', function (e) { errors.push(String(e.message || (e.target && e.target.src))); }, true);
  addEventListener('securitypolicyviolation', function (e) { errors.push('CSP ' + e.violatedDirective + ' ' + e.blockedURI); });
  function snap(step) {
    var land = document.querySelector('.landing'), v = document.getElementById('film'), pv = document.getElementById('passage'), talk = document.querySelector('.talk'), mail = document.querySelector('.close a.mail');
    var c = talk.getBoundingClientRect(), hit = document.elementFromPoint(c.left + c.width / 2, c.top + c.height / 2);
    return {tag: tag, step: step, state: document.body.dataset.state, y: Math.round(scrollY), overflow: document.documentElement.scrollWidth - innerWidth,
      statement: getComputedStyle(land).opacity === '1' && getComputedStyle(land.querySelector('nav')).visibility === 'visible',
      bar: getComputedStyle(document.querySelector('.bar')).position, talk: !!hit && (hit === talk || talk.contains(hit)), film: +(v.currentTime || 0).toFixed(2), passage: +(pv.currentTime || 0).toFixed(2), scrub: document.body.classList.contains('scrub'), mail: mail && mail.href,
      shown: Array.prototype.map.call(says, function (s, i) { return getComputedStyle(s).opacity === '1' ? i : -1; }).filter(function (i) { return i >= 0; }), errors: errors.slice()};
  }
  function post(step) { var x = new XMLHttpRequest(); x.open('POST', '/__report', false); x.setRequestHeader('Content-Type', 'application/json'); x.send(JSON.stringify(snap(step))); }
  addEventListener('load', function () {
    (q.get('at') || '').split(',').forEach(function (s) { if (s) setTimeout(function () { post(s); }, +s * 1000); });
    if (q.get('press')) setTimeout(function () { document.querySelector('.landing .solid').click(); setTimeout(function () { post('pressed'); }, 800); }, 1500);
    if (q.get('foot')) setTimeout(function () { scrollTo(0, document.documentElement.scrollHeight); setTimeout(function () { post('foot'); }, 1500); }, 2500);
  });
})();"""
GLASS = r"""addEventListener('load', function () {
  var q = new URLSearchParams(location.search), c = document.getElementById('press'), tries = 0;
  if (!q.get('glass')) return;
  (function wait() {
    c.scrollIntoView({block: 'end'});
    if (!document.body.classList.contains('pressable') && tries++ < 60) return setTimeout(wait, 500);
    setTimeout(function () {
      var at = function (e) { var r = e.getBoundingClientRect(), h = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2); return !!h && (h === e || e.contains(h)); };
      var x = new XMLHttpRequest(); x.open('POST', '/__report', false); x.setRequestHeader('Content-Type', 'application/json');
      x.send(JSON.stringify({tag: q.get('t'), step: 'glass', ready: document.body.classList.contains('pressable'), touch: getComputedStyle(c).touchAction, bar: getComputedStyle(document.querySelector('.bar')).position,
        talk: at(document.querySelector('.talk')), reading: at(document.getElementById('reading')), foot: Math.round(document.getElementById('reading').getBoundingClientRect().bottom), window: innerHeight, overflow: document.documentElement.scrollWidth - innerWidth}));
    }, 700);
  })();
});"""


class Reports(ps.Files):
    def do_POST(self):
        REPORTS.append(json.loads(self.rfile.read(int(self.headers.get("Content-Length", 0)))))
        self.send_response(204); self.end_headers()


def record(probe, passed, **detail):
    global ok
    ok &= bool(passed); rows.append({"probe": probe, "pass": bool(passed), **detail})
    print(("PASS  " if passed else "FAIL  ") + probe + "  " + json.dumps(detail, ensure_ascii=False)[:230], flush=True)


def sim(*args):
    return subprocess.run(["xcrun", "simctl", *args], capture_output=True, text=True)


def visit(origin, device, path, tag, steps):
    """opens the page and waits for its reports, not for a clock (Safari's relaunch takes seconds of its own); a screenshot as each arrives"""
    sim("terminate", device, "com.apple.mobilesafari"); time.sleep(0.5)
    sim("openurl", device, origin + path)
    got = {}
    for step in steps:
        end = time.time() + 45
        while time.time() < end and step not in got:
            got.update({r["step"]: r for r in REPORTS if r["tag"] == tag})
            time.sleep(0.2)
        if step in got:
            sim("io", device, "screenshot", str(OUT / f"{tag}-{step}.png"))
    return got


def drift(a, b):
    """the mean difference, in levels, of the middle of two screenshots (the clock and the toolbars left out), as small grey images"""
    def grey(png):
        return subprocess.run(["ffmpeg", "-v", "error", "-i", str(png), "-vf", "crop=iw:ih*0.3:0:ih*0.15,scale=64:24", "-f", "rawvideo", "-pix_fmt", "gray", "-"], capture_output=True, check=True).stdout
    x, y = grey(a), grey(b)
    return round(sum(abs(p - q) for p, q in zip(x, y)) / len(x), 2)


devices = json.loads(sim("list", "devices", "available", "-j").stdout)["devices"]
device = next(d for runtime, ds in sorted(devices.items(), reverse=True) if "iOS" in runtime for d in ds if d["name"].startswith("iPhone"))
with tempfile.TemporaryDirectory() as t:
    d = Path(t) / "d"; shutil.copytree(DIST, d)
    (d / "__diag.js").write_text(DIAG, encoding="utf-8")
    for page in ("index.html", "ar/index.html"):
        s = (d / page).read_text(encoding="utf-8")
        (d / page).write_text(s.replace('<script src="', '<script src="/__diag.js"></script>\n<script src="', 1), encoding="utf-8")
    (d / "__glass.js").write_text(GLASS, encoding="utf-8")
    for page in ("flat/index.html", "ar/flat.html"):
        s = (d / page).read_text(encoding="utf-8")
        (d / page).write_text(s.replace('<script src="', '<script src="/__glass.js"></script>\n<script src="', 1), encoding="utf-8")
    (d / "sw.js").write_text("", encoding="utf-8")
    httpd = ThreadingHTTPServer(("127.0.0.1", 0), partial(Reports, directory=str(d)))
    httpd.daemon_threads = True
    threading.Thread(target=httpd.serve_forever, daemon=True).start()
    origin = f"http://127.0.0.1:{httpd.server_address[1]}"
    sim("boot", device["udid"]); sim("bootstatus", device["udid"], "-b")
    visit(origin, device["udid"], "/?t=warm&at=2", "warm", ("2",))
    for lang, base in (("en", "/"), ("ar", "/ar/")):
        for trial in range(TRIALS):
            tag = f"{lang}-film{trial}"
            got = visit(origin, device["udid"], f"{base}?t={tag}&at=2,6,14,18", tag, ("2", "6", "14", "18"))
            first, mid, end = got.get("2"), got.get("6"), got.get("14")
            passed = first and mid and end and first["statement"] and first["bar"] == "fixed" and first["talk"] and abs(mid["film"] - 6) < 1.5 and end["state"] == "still" and not end["errors"] and end["overflow"] <= 0
            record("film", passed, page=base, at_2s=first and {k: first[k] for k in ("state", "statement", "bar", "talk", "film")}, film_at_6s=mid and mid["film"], at_14s=end and end["state"], errors=end and end["errors"])
            moved = drift(OUT / f"{tag}-14.png", OUT / f"{tag}-18.png") if "14" in got and "18" in got else None
            record("rest", moved is not None and moved <= HOLD, page=base, trial=trial, moved_levels=moved, bound=HOLD)
        for frag, want in (("principle", 0), ("systems", 0), ("adii", 1), ("awc-os", 5), ("cythercad", 6)):
            tag = f"{lang}-{frag}"
            got = visit(origin, device["udid"], f"{base}?t={tag}&at=3,7#{frag}", tag, ("3", "7"))
            a, b = got.get("3"), got.get("7")
            moved = drift(OUT / f"{tag}-3.png", OUT / f"{tag}-7.png") if a and b else None
            record("words", a and b and want in b["shown"] and moved <= HOLD and not b["errors"], page=base, frag=frag, want=want, shown=b and b["shown"], y=b and b["y"], moved_levels=moved)
        got = visit(origin, device["udid"], f"{base}?t={lang}-press&press=1&at=3", f"{lang}-press", ("pressed", "3"))
        a = got.get("pressed")
        record("press", a and a["shown"] == [0] and a["state"] == "still" and a["mail"] == "mailto:contact@cytherai.com", page=base, shown=a and a["shown"], state=a and a["state"], address=a and a["mail"])
        a = visit(origin, device["udid"], f"{base}?t={lang}-foot&foot=1", f"{lang}-foot", ("foot",)).get("foot")
        record("foot", a and a["scrub"] and abs(a["passage"] - 25) <= 0.2, page=base, passage=a and a["passage"], y=a and a["y"])
    for lang, path in (("en", "/flat/"), ("ar", "/ar/flat.html")):
        for trial in range(TRIALS):
            sim("terminate", device["udid"], "com.apple.mobilesafari"); time.sleep(0.5)
            sim("openurl", device["udid"], f"{origin}{path}?trial={trial}")
            time.sleep(9)   # no clock to tie it to, and none needed: it has no film to wait out
            a, b = OUT / f"flat-{lang}{trial}a.png", OUT / f"flat-{lang}{trial}b.png"
            sim("io", device["udid"], "screenshot", str(a)); time.sleep(4); sim("io", device["udid"], "screenshot", str(b))
            moved = drift(a, b)
            record("flat", moved <= HOLD, page=path, trial=trial, moved_levels=moved, bound=HOLD)
        a = visit(origin, device["udid"], f"{path}?t={lang}-glass&glass=1", f"{lang}-glass", ("glass",)).get("glass")
        record("glass", a and a["ready"] and a["touch"] == "none" and a["bar"] == "fixed" and a["talk"] and a["reading"] and a["foot"] <= a["window"] and a["overflow"] <= 0, page=path, **(a or {}))
    sim("terminate", device["udid"], "com.apple.mobilesafari")
    sim("shutdown", device["udid"])
    httpd.shutdown()
build = re.search(r'name="build-hash" content="(\w+)"', (DIST / "index.html").read_text(encoding="utf-8"))[1]
(OUT / "ios.json").write_text(json.dumps({"artifact_build": build, "device": device["name"], "result": "PASS" if ok else "FAIL", "rows": rows}, indent=1, ensure_ascii=False), encoding="utf-8")
print(("PASS" if ok else "FAIL") + f": build {build}, {device['name']} (the iOS Simulator's WebKit, not a phone), {len(rows)} rows, {sum(not r['pass'] for r in rows)} failed")
sys.exit(0 if ok else 1)
