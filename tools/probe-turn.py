#!/usr/bin/env python3
"""A clip's download is itself, not its URL: a regression probe of both media controllers (js/film.js, js/flat.js).

    .venv/bin/python tools/probe-turn.py <dist-dir> <out-dir>

A phone turned upright, on its side, upright again asks for three clips, and the first and the third have one URL. Until
2026-11-24 each controller knew a download by that URL (the audit of that day, finding 9), so the first, completing late,
passed for the third: arriving, it replaced the clip on show and left that clip's blob held; failing, it took the clip
away and the stills stood for good. And no superseded download was cancelled.

The page's fetch is the one seam: every request for a clip is held here and answered when this probe chooses, with the
real clip's bytes. On the front door and on Both looked flat, in two cases (the first arrives late; the first fails late):
  the three are asked for, and the turn that superseded each of the first two cancelled it;
  the third is answered and is on show;
  the first is answered late, and nothing changes: the third on show, no second blob made, none released;
  the phone turns once more, the clip on show is displaced and its blob URL released, and the fourth takes its place.
A cancelled download is seen as the signal the page gave fetch, aborted; not as bytes saved on the wire. A late answer is
delivered whatever that signal says, so what is held to is the page's own account of which download is its own.

Serves <dist-dir> as probe-settle.py does and drives headless Chrome over the DevTools Protocol, mobile emulation.
Writes <out-dir>/turn.json; exits 0 on PASS, 1 on FAIL.
"""
import importlib.util, json, sys, tempfile, threading
from functools import partial
from http.server import ThreadingHTTPServer
from pathlib import Path

HERE = Path(__file__).resolve().parent
spec = importlib.util.spec_from_file_location("settle", HERE / "probe-settle.py")   # its server, Chrome and tab
ps = importlib.util.module_from_spec(spec); spec.loader.exec_module(ps)
DIST, OUT = Path(sys.argv[1]), Path(sys.argv[2])
UPRIGHT, SIDE = (390, 844), (844, 390)
PAGES = (("/#adii", "passage"), ("/flat/", "scene"))   # each controller's page, opened where it asks for its clip at once, and its video

HELD = """(() => {
  const real = fetch, bytes = {}, calls = [], made = [], released = [], make = URL.createObjectURL, free = URL.revokeObjectURL;
  window.__turn = { calls, made, released };
  window.fetch = (url, how) => {
    if (!String(url).endsWith(".mp4")) return real(url, how);
    bytes[url] = bytes[url] || real(url).then(r => r.blob());
    return new Promise((arrive, fail) => calls.push({ url: String(url), signal: how && how.signal,
      arrive: () => bytes[url].then(b => arrive({ ok: true, blob: () => Promise.resolve(b.slice(0, b.size, b.type)) })),
      fail: () => fail(new TypeError("Failed to fetch")) }));
  };
  URL.createObjectURL = b => { const u = make.call(URL, b); made.push(u); return u; };
  URL.revokeObjectURL = u => { released.push(u); free.call(URL, u); };
})()"""
# what the page asked for, which of it was cancelled, the blob URLs made and released (by their order made), and the one on show
STATE = """(v => ({asked: __turn.calls.map(c => c.url.split('/').pop()), cancelled: __turn.calls.map(c => !!(c.signal && c.signal.aborted)),
  made: __turn.made.length, released: __turn.released.map(u => __turn.made.indexOf(u)), shown: __turn.made.indexOf(v.src),
  scrub: document.body.classList.contains('scrub')}))(document.getElementById('%s'))"""


def turn(tab, w, h):
    tab.send("Emulation.setDeviceMetricsOverride", width=w, height=h, deviceScaleFactor=2, mobile=True,
             screenOrientation={"type": "portraitPrimary" if h > w else "landscapePrimary", "angle": 0 if h > w else 90})


rows = []
with tempfile.TemporaryDirectory() as profile:
    httpd = ThreadingHTTPServer(("127.0.0.1", 0), partial(ps.Files, directory=str(DIST)))
    httpd.block_on_close, httpd.daemon_threads = False, True
    threading.Thread(target=httpd.serve_forever, daemon=True).start()
    proc, port, url = ps.chrome(profile)
    tab = ps.Tab(url)
    tab.send("Page.addScriptToEvaluateOnNewDocument", source=HELD)
    for page, video in PAGES:
        for late in ("arrive", "fail"):
            tab.load("about:blank"); turn(tab, *UPRIGHT); tab.load(f"http://127.0.0.1:{httpd.server_address[1]}{page}")
            see = lambda: tab.js(STATE % video)
            asked = lambda n: ps.until(tab, f"__turn.calls.length >= {n}", 10)
            answer = lambda i, how: tab.js(f"(c => c && c.{how}())(__turn.calls[{i}])")
            shows = lambda i: ps.until(tab, f"document.body.classList.contains('scrub') && document.getElementById('{video}').src === __turn.made[{i}]", 20)
            asked(1); turn(tab, *SIDE); asked(2); turn(tab, *UPRIGHT); asked(3)
            three = see()
            answer(2, "arrive"); shows(0)
            third = see()
            answer(0, late); tab.js("new Promise(done => setTimeout(done, 300))")   # its answer is a chain of microtasks: long over
            after = see()
            turn(tab, *SIDE); asked(4)
            displaced = see()
            answer(3, "arrive"); shows(1)
            fourth = see()
            held = {
                "the first and the third ask for one URL": len(three["asked"]) == 3 and three["asked"][0] == three["asked"][2] != three["asked"][1],
                "each superseded download is cancelled": three["cancelled"] == [True, True, False],
                "the third is on show": third["scrub"] and third["shown"] == 0 and third["made"] == 1,
                "the first, late, changes nothing": after == third,
                "a displaced clip's blob URL is released": displaced["released"] == [0],
                "the fourth takes its place": fourth["scrub"] and fourth["shown"] == 1 and fourth["made"] == 2 and fourth["released"] == [0],
            }
            row = {"page": page, "the first, late": late + "s", "pass": all(held.values()), "failed": [k for k, v in held.items() if not v],
                   "three asked": three, "third answered": third, "first answered late": after, "turned again": displaced, "fourth answered": fourth}
            rows.append(row)
            print(("PASS  " if row["pass"] else "FAIL  ") + json.dumps({k: v for k, v in row.items() if k != "pass"}, ensure_ascii=False))
    proc.terminate(); proc.wait(); httpd.shutdown()

ok = all(r["pass"] for r in rows)
OUT.mkdir(parents=True, exist_ok=True)
build = (DIST / "index.html").read_text(encoding="utf-8").split('name="build-hash" content="')[1][:16]
(OUT / "turn.json").write_text(json.dumps({"artifact_build": build, "result": "PASS" if ok else "FAIL", "rows": rows},
                                          indent=1, ensure_ascii=False), encoding="utf-8")
print(("PASS" if ok else "FAIL") + f": build {build}, {len(rows)} rows")
sys.exit(0 if ok else 1)
