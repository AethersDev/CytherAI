#!/usr/bin/env python3
"""Both looked flat in a browser: the frame each scroll names, and reading ink over the sequence.

    .venv/bin/python tools/probe-flat.py <dist> <out> [--shots]

The built artifact is served as the origin root, answering byte ranges, and opened in headless Chrome with a fresh profile
(tools/probe-ink.py's server, driver and method, imported). For flat/ and ar/flat.html at three viewports, once the
sequence is whole: at the opening, at the middle of each words' window, at the close and at the foot of the page, the page
must show the moment its own stretches name for the scroll (the sequence there within half a frame; past its end, its
last frame), those words shown in full and under nothing, there and as their window closes; every fully shown reading element's ink, composited over the ground at its glyph support, must hold 4.5:1; once
the scroll has stopped, nothing runs: no animation frame is asked for and no timer set in the 2.5 s that follow; and a
new viewport keeps the visitor's place, resized there and back: inside the film their moment, past it the instrument, the
close or the notes where they were (until 2026-10-25 every place past the film became the instrument's top); the
instrument answers the gesture its words ask for first, the opposite one bringing the glass back to rest (until
2026-10-25 they asked for a press the glass at rest could not take); and *Talk to us* is what a pointer reaches at every moment.
The review of 2026-11-06, in eight more windows, a finger's swipes by Chrome's own touch pipeline: a swipe that starts on the glass
lifts it and moves no page, one beside it moves the page (on a phone on its side only 42 px beside it did), the glass centred, the
reading in view and uncovered wherever the glass stands in the window; the canvas named, as an application, with the front door's
focus ring; pressing *Talk to us* opens the contact page. At sixteen windows, no words under the bar. A lean link keeps the stills.
Writes <out>/flat.json. Exit 0 PASS, 1 FAIL, 2 when it could not measure."""
import argparse, functools, http.server, importlib.util, json, re, shutil, subprocess, sys, tempfile, threading, time, urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location("probe_ink", ROOT / "tools/probe-ink.py")
ink = importlib.util.module_from_spec(spec); spec.loader.exec_module(ink)
PAGES = (("flat/", "en"), ("ar/flat.html", "ar"))
VIEWPORTS = ((1440, 900, 1, False), (390, 844, 3, True), (320, 640, 2, True))
MARKS = """const parts = [...document.querySelectorAll('.passage')], span = e => e.dataset.t.split(' ').map(Number);
  const marks = [[0, 0]]; for (const p of parts) { const [a, b] = span(p), top = p.getBoundingClientRect().top + scrollY;
    marks.push([top, a], [top + p.offsetHeight, b]); }
  const end = marks[marks.length - 1][1];"""
# the page's own reading of the scroll (js/flat.js measure, moment), and the sequence's place
STATE = """(() => { """ + MARKS + """
  const moment = y => { for (let i = 1; i < marks.length; i++) { const [y0, t0] = marks[i - 1], [y1, t1] = marks[i];
    if (y < y1 || i === marks.length - 1) return Math.min(end, t0 + (t1 - t0) * Math.max(0, y - y0) / ((y1 - y0) || 1)); } };
  return JSON.stringify({ want: Math.min(moment(scrollY), document.getElementById('scene').duration), at: document.getElementById('scene').currentTime,
    scrub: document.body.classList.contains('scrub') }); })()"""
PLACE = """(t => { """ + MARKS + """
  for (let i = 1; i < marks.length; i++) { const [y0, t0] = marks[i - 1], [y1, t1] = marks[i];
    if (t <= t1) return y0 + (y1 - y0) * (t - t0) / ((t1 - t0) || 1); } return marks[marks.length - 1][0]; })(%s)"""
TOUCHES = ((390, 844, 2, True), (844, 390, 2, True), (568, 320, 2, True), (320, 568, 2, True), (768, 1024, 2, True), (1024, 768, 2, True), (1470, 779, 1, False), (1200, 665, 1, False))
WINDOWS = ((2560, 1440), (1920, 1080), (1470, 779), (1440, 900), (1280, 720), (1200, 665), (844, 390), (720, 450), (667, 375), (568, 320), (390, 844), (375, 667), (360, 640), (320, 844), (320, 568), (320, 256))
ROOM = 44   # beside the glass, enough for a fingertip
HALF_FRAME = 0.5 / 12
FULL = 0.55   # before a window's end, its words still in full (js/flat.js fades them over 0.5 s)
# the lines of a words' block that something else covers, the hit at each line's centre not the block: words whose window
# outlasts the film under them lie under the instrument rising over it (until 2026-10-25 the conclusion did)
UNDER = """(s => [...s.children].filter(c => { const r = c.getBoundingClientRect(),
  e = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2); return !e || e.closest('.say') !== s; }).length)(document.querySelectorAll('.say')[%d])"""
# what a pointer reaches at an element's centre
AT = """(s => { const e = document.querySelector(s), r = e.getBoundingClientRect(), h = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
  return {x: r.left + r.width / 2, y: r.top + r.height / 2, top: r.top, bottom: r.bottom, on: !!h && (h === e || e.contains(h))}; })(%s)"""
BOX = "(b => ({x: b.left, y: b.top, w: b.width, h: b.height}))(document.getElementById('press').getBoundingClientRect())"
READING = "document.getElementById('reading').textContent"
# counts every animation frame and timer the page asks for, from its first script on
COUNT = ("window.__asked = 0; for (const name of ['requestAnimationFrame', 'setTimeout', 'setInterval']) { const f = window[name];"
         " window[name] = function () { window.__asked++; return f.apply(this, arguments); }; }")


def sample(key, name, scroll, w, h, dpr, shots, fails, say=None):
    ink.js("scrollTo(0, %s)" % scroll)
    time.sleep(1.4)   # the scroll answered, one seek, the words' opacity set by the scroll
    st = json.loads(ink.js(STATE))
    if not st["scrub"] or abs(st["at"] - st["want"]) > HALF_FRAME:
        fails.append(f"{key} {name}: the sequence at {st['at']:.3f} s, the scroll names {st['want']:.3f} s")
    if say is not None and ink.js(f"getComputedStyle(document.querySelectorAll('.say')[{say}]).opacity") != "1":
        fails.append(f"{key} {name}: its words are not shown in full")
    if say is not None and (under := ink.js(UNDER % say)):
        fails.append(f"{key} {name}: {under} of its lines lie under the page that follows")
    if not ink.js(AT % "'.talk'")["on"]:
        fails.append(f"{key} {name}: *Talk to us* is not what a pointer reaches")
    return {**st, "ink": ink.measure(name, w, h, dpr, shots)}


FIRST = {"en": r"Drag (up|down)", "ar": r"اسحب إلى (الأعلى|الأسفل)"}   # the gesture the instrument's words ask for first


def pressed(key, lang, fails):
    first = re.search(FIRST[lang], ink.js("document.querySelector('#bench p').textContent")).group(1)
    ink.js("document.getElementById('bench').scrollIntoView({block: 'start'})"); time.sleep(3.0)
    reading = "document.getElementById('reading').textContent"
    box = json.loads(ink.js("JSON.stringify(document.getElementById('press').getBoundingClientRect())"))
    x, y, rest = box["x"] + box["width"] * 0.28, box["y"] + box["height"] * 0.5, ink.js(reading)
    def drag(dy):
        ink.send("Input.dispatchMouseEvent", type="mousePressed", x=x, y=y, button="left", clickCount=1)
        for k in range(1, 11):
            ink.send("Input.dispatchMouseEvent", type="mouseMoved", x=x, y=y + dy * k / 10, button="left", buttons=1)
        ink.send("Input.dispatchMouseEvent", type="mouseReleased", x=x, y=y + dy, button="left", clickCount=1)
        time.sleep(0.4)
        return ink.js(reading)
    up = -1 if first in ("up", "الأعلى") else 1
    asked = drag(up * box["height"] * 0.3); undone = drag(-up * box["height"] * 0.6)
    if asked == rest:
        fails.append(f"{key}: the instrument does not answer the gesture its words ask for first ({first}): {rest}")
    if undone != rest:
        fails.append(f"{key}: the opposite gesture does not bring the glass back to rest: {undone}")
    return {"first": first, "rest": rest, "asked": asked, "undone": undone}


def resized(key, w, h, dpr, mobile, fails):
    def view(vw, vh):
        ink.send("Emulation.setDeviceMetricsOverride", width=vw, height=vh, deviceScaleFactor=dpr, mobile=mobile)
        time.sleep(1.4)
    out, sizes = {}, ((round(w * 0.86), round(h * 0.86)), (w, h))
    ink.js("scrollTo(0, %s)" % (PLACE % 11)); time.sleep(1.4)
    for vw, vh in sizes:
        view(vw, vh); st = json.loads(ink.js(STATE)); out[f"11 s at {vw}x{vh}"] = st["want"]
        if abs(st["want"] - 11) > HALF_FRAME or abs(st["at"] - st["want"]) > HALF_FRAME:
            fails.append(f"{key}: resized to {vw}x{vh} at 11 s, the scroll names {st['want']:.3f} s, the sequence {st['at']:.3f} s")
    for sel in ("#bench", ".close", "#method"):
        top = f"document.querySelector('{sel}').getBoundingClientRect().top"
        ink.js(f"scrollTo(0, {top} + scrollY + 120)"); time.sleep(0.6)
        start = ink.js(top)   # 120 px into it, or less where the page ends first
        for vw, vh in sizes:
            view(vw, vh); out[f"{sel} at {vw}x{vh}"] = got = ink.js(top)
            if abs(got - start) > 2:
                fails.append(f"{key}: resized to {vw}x{vh} {-start:.0f} px into {sel}, the view is now {-got:.0f} px into it")
    return out


def view(w, h, dpr, mobile):
    ink.send("Emulation.setDeviceMetricsOverride", width=w, height=h, deviceScaleFactor=dpr, mobile=mobile)
    ink.send("Emulation.setTouchEmulationEnabled", enabled=mobile)


def swipe(x, y, dy):
    """a finger's, through the touch pipeline, as touch-action sees it; what it moved, the page and the reading"""
    y0, r0 = ink.js("scrollY"), ink.js(READING)
    ink.send("Input.synthesizeScrollGesture", x=x, y=y, yDistance=dy, gestureSourceType="touch", speed=800, preventFling=True)
    time.sleep(0.5)
    return round(ink.js("scrollY") - y0), ink.js(READING) != r0


def fits(origin, page, w, h, dpr, mobile, fails):
    key, out = f"{page} · {w}x{h}", {}
    view(w, h, dpr, mobile)
    ink.send("Page.navigate", url=origin + page); time.sleep(0.6)
    ink.js("document.getElementById('press').scrollIntoView({block: 'center'})")
    for _ in range(300):
        if ink.js("document.body.classList.contains('pressable')"):
            break
        time.sleep(0.1)
    else:
        ink.broken(f"{key}: the instrument was not ready 30 s after it came near")
    ink.js("document.getElementById('press').scrollIntoView({block: 'center'})"); time.sleep(0.5)
    b = ink.js(BOX)
    sides = {"above": (w / 2, b["y"] / 2, b["y"]), "below": (w / 2, (b["y"] + b["h"] + h) / 2, h - b["y"] - b["h"]),
             "before": (b["x"] / 2, b["y"] + b["h"] / 2, b["x"]), "after": ((b["x"] + b["w"] + w) / 2, b["y"] + b["h"] / 2, w - b["x"] - b["w"])}
    side = max(sides, key=lambda k: sides[k][2]); room = sides[side][2]
    out.update(canvas=f"{round(b['w'])}x{round(b['h'])}", beside=round(room))
    if room < ROOM:
        fails.append(f"{key}: {room:.0f} px beside the glass to scroll the page by")
    if abs(sides["before"][2] - sides["after"][2]) > 1:
        fails.append(f"{key}: the glass is off centre: {sides['before'][2]:.0f} px and {sides['after'][2]:.0f} px")
    if ink.js("document.documentElement.scrollWidth") > w:
        fails.append(f"{key}: sideways scroll")
    for block in ("start", "center", "end"):   # wherever the whole glass stands in the window
        ink.js(f"document.getElementById('press').scrollIntoView({{block: '{block}'}})"); time.sleep(0.3)
        r = ink.js(AT % "'#reading'"); out[f"reading, glass at {block}"] = [round(r["top"]), round(r["bottom"])]
        if r["top"] < 0 or r["bottom"] > h + 0.5 or not r["on"]:
            fails.append(f"{key}: the reading is out of view or covered with the glass at the window's {block}: {out[f'reading, glass at {block}']}")
    if mobile:
        ink.js("document.getElementById('press').scrollIntoView({block: 'center'})"); time.sleep(0.4)
        b = ink.js(BOX)
        out["on the glass"] = on = swipe(b["x"] + b["w"] * 0.28, b["y"] + b["h"] * 0.6, -min(140, h * 0.25))
        if on[0] != 0 or not on[1]:
            fails.append(f"{key}: a swipe up on the glass moved the page {on[0]} px, and the reading changed: {on[1]}")
        ink.js("document.getElementById('press').scrollIntoView({block: 'center'})"); time.sleep(0.4)
        b = ink.js(BOX)
        sides = {"above": (w / 2, b["y"] / 2), "below": (w / 2, (b["y"] + b["h"] + h) / 2), "before": (b["x"] / 2, b["y"] + b["h"] / 2), "after": ((b["x"] + b["w"] + w) / 2, b["y"] + b["h"] / 2)}
        out["beside it"] = off = swipe(*sides[side], -min(140, h * 0.25))
        if off[0] <= 0 or off[1]:
            fails.append(f"{key}: a swipe up beside the glass ({side}) moved the page {off[0]} px, and the reading changed: {off[1]}")
    return out


def named(origin, page, fails):
    """the canvas as a screen reader meets it, and as the keyboard does"""
    view(1470, 779, 1, False)
    ink.send("Page.navigate", url=origin + page); time.sleep(0.8)
    ink.js("document.getElementById('press').scrollIntoView({block: 'center'})"); time.sleep(0.5)
    ink.send("Accessibility.enable")
    roles = [(n.get("role") or {}).get("value") for n in ink.send("Accessibility.getFullAXTree")["nodes"] if (n.get("name") or {}).get("value") == ink.js("document.getElementById('press').getAttribute('aria-label')")]
    ink.send("Accessibility.disable")
    ink.js("(p => { p.setAttribute('tabindex', '-1'); p.focus(); })(document.querySelector('#bench p'))")
    for kind in ("keyDown", "keyUp"):
        ink.send("Input.dispatchKeyEvent", type=kind, key="Tab", code="Tab", windowsVirtualKeyCode=9)
    time.sleep(0.2)
    ring = ink.js("(e => (s => [e.id, s.outlineStyle, s.outlineWidth, s.outlineColor])(getComputedStyle(e)))(document.activeElement)")
    if roles != ["application"]:
        fails.append(f"{page}: the canvas's name is on {roles}, not an application")
    if ring != ["press", "solid", "2px", "rgb(255, 173, 87)"]:
        fails.append(f"{page}: the keyboard's focus on the canvas: {ring}")
    for mobile, spec in ((False, (1440, 900, 1)), (True, (390, 844, 2))):   # and pressing the bar's link opens the contact page
        view(*spec, mobile)
        ink.send("Page.navigate", url=origin + page); time.sleep(0.8)
        at = ink.js(AT % "'.talk'")
        if mobile:
            ink.send("Input.dispatchTouchEvent", type="touchStart", touchPoints=[{"x": at["x"], "y": at["y"]}])
            ink.send("Input.dispatchTouchEvent", type="touchEnd", touchPoints=[])
        else:
            for kind, button in (("mouseMoved", "none"), ("mousePressed", "left"), ("mouseReleased", "left")):
                ink.send("Input.dispatchMouseEvent", type=kind, x=at["x"], y=at["y"], button=button, clickCount=1)
        time.sleep(1)
        if not ink.js("location.pathname").endswith("/contact.html"):
            fails.append(f"{page}: pressing *Talk to us* left the page at {ink.js('location.pathname')}")
    return {"role": roles, "ring": ring}


def clear(origin, page, fails):
    """at each window the statement and every words stand clear of the bar, while it is fixed, and nothing scrolls sideways"""
    meet = lambda a, b: a[0] < b[2] - 0.5 and b[0] < a[2] - 0.5 and a[1] < b[3] - 0.5 and b[1] < a[3] - 0.5
    rect = "(b => [b.left, b.top, b.right, b.bottom])(%s.getBoundingClientRect())"
    for w, h in WINDOWS:
        view(w, h, 1, False)
        ink.send("Page.navigate", url=origin + page); time.sleep(0.4)
        bar = ink.js(rect % "document.querySelector('.bar')")
        fixed = ink.js("getComputedStyle(document.querySelector('.bar')).position") == "fixed"
        landing = ink.js(rect % "document.querySelector('.landing')")
        says = ink.js("[...document.querySelectorAll('.say')].map(s => (b => [b.left, b.top, b.right, b.bottom])(s.getBoundingClientRect()))")
        if meet(landing, bar):
            fails.append(f"{page} at {w}x{h}: the opening under the bar")
        if fixed and any(meet(s, bar) for s in says):
            fails.append(f"{page} at {w}x{h}: words under the bar")
        if ink.js("document.documentElement.scrollWidth") > w:
            fails.append(f"{page} at {w}x{h}: sideways scroll")


def lean(origin, page, fails):
    """the front door's rule (js/film.js): a lean link keeps the stills and fetches no sequence; 3g by itself does not count"""
    films = "performance.getEntriesByType('resource').filter(r => r.name.endsWith('.mp4')).length"
    out = {}
    view(1440, 900, 1, False)
    ink.send("Network.enable"); ink.send("Network.setCacheDisabled", cacheDisabled=True)   # the bytes such a visit really fetches
    for name, link, plays in (("Save-Data", "{saveData: true, effectiveType: '4g'}", False), ("2g", "{saveData: false, effectiveType: '2g'}", False),
                              ("under 1 Mbit/s", "{saveData: false, effectiveType: '3g', downlink: 0.4}", False), ("3g", "{saveData: false, effectiveType: '3g'}", True),
                              ("3g at 1.65 Mbit/s", "{saveData: false, effectiveType: '3g', downlink: 1.65}", True)):
        script = ink.send("Page.addScriptToEvaluateOnNewDocument", source=f"Object.defineProperty(navigator, 'connection', {{get: () => ({link})}});")["identifier"]
        ink.send("Page.navigate", url=origin + page); time.sleep(2)
        fetched, poster = ink.js(films), ink.js("document.getElementById('scene').poster.split('/').pop()")
        size = None
        if not plays:   # with the instrument's plates, the page's whole weight on such a link
            ink.js("document.getElementById('press').scrollIntoView({block: 'center'})"); time.sleep(1.5)
            size = ink.js("performance.getEntriesByType('resource').reduce((n, r) => n + r.transferSize, performance.getEntriesByType('navigation')[0].transferSize)")
        ink.send("Page.removeScriptToEvaluateOnNewDocument", identifier=script)
        out[name] = {"sequence_fetched": fetched, "still": poster, "bytes": size}
        if plays and not fetched:
            fails.append(f"{page}, {name}: the sequence was not fetched")
        if not plays and (fetched or not poster.startswith("still-") or size >= 1_000_000):
            fails.append(f"{page}, {name}: {out[name]}")
    ink.send("Network.emulateNetworkConditions", offline=False, latency=400, downloadThroughput=400e3 / 8, uploadThroughput=400e3 / 8, connectionType="cellular3g")
    ink.send("Page.navigate", url=origin + page); time.sleep(12)
    out["Slow 3G, throttled"] = {"sequence_fetched": ink.js(films), "chrome_reports": ink.js("[navigator.connection.effectiveType, navigator.connection.downlink]")}
    if out["Slow 3G, throttled"]["sequence_fetched"]:
        fails.append(f"{page}, Slow 3G: {out['Slow 3G, throttled']}")
    ink.send("Network.emulateNetworkConditions", offline=False, latency=0, downloadThroughput=-1, uploadThroughput=-1)
    ink.send("Network.setCacheDisabled", cacheDisabled=False); ink.send("Network.disable")
    return out


def profile(origin, page, lang, w, h, dpr, mobile, shots, fails):
    key = f"{page} · {w}x{h} · dpr {dpr}" + (" · mobile" if mobile else "")
    ink.send("Emulation.setDeviceMetricsOverride", width=w, height=h, deviceScaleFactor=dpr, mobile=mobile)
    ink.send("Emulation.setTouchEmulationEnabled", enabled=mobile)
    ink.send("Page.navigate", url=origin + page)
    for _ in range(600):
        if ink.js("document.body.classList.contains('scrub')"):
            break
        time.sleep(0.1)
    else:
        ink.broken(f"{key}: the sequence was not whole 60 s after the page opened")
    stem = f"{lang}-{w}x{h}-"
    out = {"open": sample(key, stem + "open", "0", w, h, dpr, shots, fails)}
    for i in range(ink.js("document.querySelectorAll('.say').length")):
        a, b = ink.js(f"document.querySelectorAll('.say')[{i}].dataset.t").split()
        out[f"say{i}"] = sample(key, f"{stem}say{i}", PLACE % ((float(a) + float(b)) / 2), w, h, dpr, shots, fails, say=i)
        out[f"say{i}end"] = sample(key, f"{stem}say{i}end", PLACE % (float(b) - FULL), w, h, dpr, shots, fails, say=i)
    out["close"] = sample(key, stem + "close", "document.querySelector('.close').offsetTop", w, h, dpr, shots, fails)
    out["foot"] = sample(key, stem + "foot", "document.documentElement.scrollHeight", w, h, dpr, shots, fails)
    before = ink.js("window.__asked"); time.sleep(2.5); after = ink.js("window.__asked")
    if after != before:
        fails.append(f"{key}: still running after the scroll stopped ({after - before} frames or timers asked for)")
    flat = sorted(({"sample": k, **r} for k, s in out.items() for r in s["ink"]), key=lambda r: r["min"])
    out["settled"] = {"asked_while_still": after - before}
    if not mobile:   # the same handlers take touch; the mouse drives them here
        out["pressed"] = pressed(key, lang, fails)
    out["resized"] = resized(key, w, h, dpr, mobile, fails)
    fails += [f"{key} {r['sample']} {r['element']} {r['text']!r}: {r['min']}:1" for r in flat if r["min"] < ink.BOUND]
    print(f"{key}: {len(flat)} elements, worst {flat[0]['min']} ({flat[0]['sample']} {flat[0]['element']} {flat[0]['text']!r})", flush=True)
    return key, out


def main():
    ap = argparse.ArgumentParser(description="Both looked flat in a browser")
    ap.add_argument("dist"); ap.add_argument("out"); ap.add_argument("--shots", action="store_true")
    args = ap.parse_args()
    dist, out = Path(args.dist).resolve(), Path(args.out)
    out.mkdir(parents=True, exist_ok=True)
    srv = http.server.ThreadingHTTPServer(("127.0.0.1", 0), functools.partial(ink.Ranges, directory=str(dist)))
    threading.Thread(target=srv.serve_forever, daemon=True).start()
    origin = f"http://127.0.0.1:{srv.server_address[1]}/"
    home = Path(tempfile.mkdtemp(prefix="probe-flat-"))
    chrome = subprocess.Popen([ink.CHROME, "--headless=new", "--remote-debugging-port=0", f"--user-data-dir={home}",
                               "--hide-scrollbars", "--disable-background-networking", "about:blank"],
                              stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    fails = []
    try:
        for _ in range(200):
            if (home / "DevToolsActivePort").exists():
                break
            time.sleep(0.1)
        else:
            ink.broken("Chrome opened no DevTools port in 20 s")
        port = (home / "DevToolsActivePort").read_text().split()[0]
        tab = next(t for t in json.load(urllib.request.urlopen(f"http://127.0.0.1:{port}/json/list")) if t["type"] == "page")
        ink.WS = ink.websocket.create_connection(tab["webSocketDebuggerUrl"], timeout=60, suppress_origin=True)
        version = ink.send("Browser.getVersion")["product"]
        ink.send("Page.enable")
        ink.send("Page.setBypassCSP", enabled=True)   # the capture style only (probe-ink.py)
        ink.send("Page.addScriptToEvaluateOnNewDocument", source=COUNT)
        results = dict(profile(origin, page, lang, *vp, args.shots and out, fails) for page, lang in PAGES for vp in VIEWPORTS)
        for page, _ in PAGES:
            clear(origin, page, fails)
            results[page + " · lean"] = lean(origin, page, fails)
            results[page + " · named"] = named(origin, page, fails)
            results.update({f"{page} · {w}x{h} · the glass": fits(origin, page, w, h, dpr, mobile, fails) for w, h, dpr, mobile in TOUCHES})
    finally:
        chrome.terminate(); chrome.wait(); shutil.rmtree(home); srv.shutdown()
    result = "FAIL" if fails else "PASS"
    (out / "flat.json").write_text(json.dumps({"chrome": version, "result": result, "failures": fails, **results},
                                              indent=1, ensure_ascii=False) + "\n", encoding="utf-8")
    print(f"{result} ({version}): " + ("; ".join(fails) if fails else "every sample holds"))
    return not fails


if __name__ == "__main__":
    sys.exit(0 if main() else 1)
