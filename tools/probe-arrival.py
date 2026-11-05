#!/usr/bin/env python3
"""The visitor's first screen and the ways on from it, on both front doors and contact pages: a regression probe of the
audit of 2026-11-05 (no obligation; run after any change to the statement, the bar, the anchors, the page's edges or the
contact pages). Real input throughout: CDP mouse and touch events and elementFromPoint, never element.click().

    .venv/bin/python tools/probe-arrival.py <dist-dir> <out-dir>

paint    First paint, under Lighthouse's presets as DevTools applies them, no cache and no worker: the statement and its links
         stand before the film; the largest contentful paint is the h1, within GOOD on the desktop; no layout shift.
route    *The three systems*, pressed while the film plays (0.3 s and 5 s in) and again from the page's foot, stops the film and
         shows the passage's first words. It landed on a wordless frame until this audit.
anchor   An address naming a stretch (#systems, #adii, #awc-os, #cythercad) opens on that stretch's first words, shown, and so does the address changing on the open page: at y 0 on the Arabic page under mobile emulation until this audit, the browser's own anchor lost.
bar      At the top, at every words' moment and at the foot, *Talk to us* is what a pointer reaches, and pressing it opens the contact page.
lean     Save-Data, and a connection the browser calls 2G, fetch no film and no worker, and each system's still stands; "3g",
         which Chrome reports on a loopback server, still plays the film.
edges    The scene meets the stage's foot and the footer's top with no hard line: the mean brightness of neighbouring pixel rows
         stays within EDGE levels. It jumped there until this audit.
contact  A draft of nothing opens nothing and asks again; a draft says what should be happening; a long one drops the links to
         webmail that would refuse it. The hand-off to the OS is the one seam stubbed: no email app opens.
layout   At sixteen windows, 320×256 (400% zoom) to 2560×1440: the statement whole on its stage, the subtitles, the note and Replay
         clear of it and of each other, the bar clear of every words, no sideways scroll.
targets  Each link or control a pointer takes outside a sentence is at least 24 × 24 CSS px (WCAG 2.2, 2.5.8).

Serves <dist-dir> as probe-settle.py does. Writes <out-dir>/arrival.json; exits 0 on PASS, 1 on FAIL.
"""
import base64, importlib.util, json, re, sys, tempfile, time
from pathlib import Path

HERE = Path(__file__).resolve().parent
def module(name, file):
    spec = importlib.util.spec_from_file_location(name, HERE / file)
    m = importlib.util.module_from_spec(spec); spec.loader.exec_module(m)
    return m
ps, ink = module("settle", "probe-settle.py"), module("ink", "probe-ink.py")   # the server, Chrome and tab; the PNG reader
DIST, OUT = Path(sys.argv[1]).resolve(), Path(sys.argv[2])
GOOD, EDGE = 2500, 4
DESK, PHONE = (1440, 900, 1, False), (390, 844, 2, True)
LANGS = (("/", "contact.html"), ("/ar/", "contact.html"))
FIRST = """window.__p = {lcp: [], cls: 0};
new PerformanceObserver(l => { for (const e of l.getEntries()) __p.lcp.push({t: Math.round(e.startTime), el: e.element && e.element.tagName}); }).observe({type: 'largest-contentful-paint', buffered: true});
new PerformanceObserver(l => { for (const e of l.getEntries()) if (!e.hadRecentInput) __p.cls += e.value; }).observe({type: 'layout-shift', buffered: true});"""
WORDS = "[...document.querySelectorAll('.say')].filter(s => getComputedStyle(s).opacity === '1').map(s => [...document.querySelectorAll('.say')].indexOf(s))"
HIT = """(e => { const r = e.getBoundingClientRect(), h = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
  return {x: r.left + r.width / 2, y: r.top + r.height / 2, on: !!h && (h === e || e.contains(h))}; })(document.querySelector(%s))"""
PLACE = """(i => { const marks = [[0, 0]]; for (const p of document.querySelectorAll('.passage')) { const [a, b] = p.dataset.t.split(' ').map(Number),
  top = p.getBoundingClientRect().top + scrollY; marks.push([top, a], [top + p.offsetHeight, b]); }
  const [a, b] = document.querySelectorAll('.say')[i].dataset.t.split(' ').map(Number), t = (a + b) / 2;
  let k = 1; while (k < marks.length - 1 && t > marks[k][1]) k++; const [y0, t0] = marks[k - 1], [y1, t1] = marks[k];
  scrollTo(0, y0 + (y1 - y0) * (t - t0) / ((t1 - t0) || 1)); })(%d)"""
rows, ok = [], True


def record(probe, passed, **detail):
    global ok
    ok &= bool(passed); rows.append({"probe": probe, "pass": bool(passed), **detail})
    print(("PASS  " if passed else "FAIL  ") + probe + "  " + json.dumps(detail, ensure_ascii=False)[:230], flush=True)


def view(tab, spec):
    w, h, dpr, mobile = spec
    tab.send("Emulation.setDeviceMetricsOverride", width=w, height=h, deviceScaleFactor=dpr, mobile=mobile)
    tab.send("Emulation.setTouchEmulationEnabled", enabled=mobile)


def fresh(tab, spec, url):
    tab.load("about:blank"); view(tab, spec); tab.load(url)


def press(tab, selector, touch):
    """what a pointer does at the element's centre; returns whether the element is what it reaches there"""
    at = tab.js(HIT % json.dumps(selector))
    if touch:
        tab.send("Input.dispatchTouchEvent", type="touchStart", touchPoints=[{"x": at["x"], "y": at["y"]}])
        tab.send("Input.dispatchTouchEvent", type="touchEnd", touchPoints=[])
    else:
        for kind, button in (("mouseMoved", "none"), ("mousePressed", "left"), ("mouseReleased", "left")):
            tab.send("Input.dispatchMouseEvent", type=kind, x=at["x"], y=at["y"], button=button, clickCount=1)
    return at["on"]


def jump(tab, line):
    """the largest change in mean brightness between neighbouring pixel rows within 10 px of a line across the window"""
    png = base64.b64decode(tab.send("Page.captureScreenshot", format="png", optimizeForSpeed=True)["data"])
    w, h, px = ink.pixels(png)
    mean = lambda y: sum(px[y * w * 3:(y + 1) * w * 3]) / (w * 3)
    span = range(max(0, line - 10), min(h - 1, line + 10))
    return round(max(abs(mean(y + 1) - mean(y)) for y in span), 2)


def throttle(tab, down, latency, cpu):
    tab.send("Network.emulateNetworkConditions", offline=False, latency=latency, downloadThroughput=down / 8, uploadThroughput=down / 8)
    tab.send("Emulation.setCPUThrottlingRate", rate=cpu)


def paint(tab, origin):
    tab.send("Network.setCacheDisabled", cacheDisabled=True)
    tab.send("Network.setBypassServiceWorker", bypass=True)
    script = tab.send("Page.addScriptToEvaluateOnNewDocument", source=FIRST)["identifier"]
    for lang, _ in LANGS:
        for name, spec, net, bound in (("desktop 10 Mbit/s, 40 ms", DESK, (10e6, 40, 1), GOOD), ("slow 4G 1.47 Mbit/s, 562 ms, CPU 4x", PHONE, (1.47e6, 562, 4), None)):
            tab.load("about:blank"); view(tab, spec); throttle(tab, *net)
            tab.send("Page.navigate", url=origin + lang)
            for _ in range(200):   # as soon as it paints, before the film could reach any moment
                if tab.js("!!window.__p && __p.lcp.length > 0"):
                    break
                time.sleep(0.05)
            stands = tab.js("(l => getComputedStyle(l).opacity === '1' && getComputedStyle(l.querySelector('nav')).visibility === 'visible')(document.querySelector('.landing'))")
            time.sleep(5)
            p = tab.js("__p")
            last = p["lcp"][-1]
            passed = stands and last["el"] == "H1" and (bound is None or last["t"] <= bound) and p["cls"] <= 0.01
            record("paint", passed, page=lang, profile=name, statement_at_first_paint=stands, lcp_ms=last["t"], lcp_element=last["el"], cls=round(p["cls"], 4))
            throttle(tab, -8, 0, 1)
    tab.send("Page.removeScriptToEvaluateOnNewDocument", identifier=script)
    tab.send("Network.setCacheDisabled", cacheDisabled=False)
    tab.send("Network.setBypassServiceWorker", bypass=False)


def route(tab, origin):
    for lang, _ in LANGS:
        for name, spec, touch in (("desktop", DESK, False), ("phone", PHONE, True)):
            for at in (0.3, 5):
                fresh(tab, spec, origin + lang)
                time.sleep(at)
                hit = press(tab, ".landing .solid", touch); time.sleep(0.7)
                words, state = tab.js(WORDS), tab.js("document.body.dataset.state")
                record("route", hit and words == [0] and state == "still", page=lang, device=name, pressed_at=at, hit=hit, words=words, state=state)
        fresh(tab, DESK, origin + lang)
        time.sleep(0.3)
        press(tab, ".bar .to", False); time.sleep(0.5)
        tab.js("scrollTo(0, document.documentElement.scrollHeight)"); time.sleep(0.5)
        hit = press(tab, ".bar .to", False); time.sleep(0.5)   # the same fragment again: the browser sees nothing new
        record("route", hit and tab.js(WORDS) == [0], page=lang, device="desktop", pressed="the bar's, again from the foot", hit=hit, words=tab.js(WORDS))


def anchor(tab, origin):
    for lang, _ in LANGS:
        for spec in (DESK, PHONE):
            for frag in ("systems", "adii", "awc-os", "cythercad"):
                fresh(tab, spec, f"{origin}{lang}#{frag}")
                time.sleep(0.5)
                want = tab.js(f"[...document.querySelectorAll('.say')].indexOf(document.getElementById('{frag}').querySelector('.say'))")
                words = tab.js(WORDS)
                record("anchor", want in words and tab.js("document.body.dataset.state") == "still", page=lang, frag=frag, width=spec[0], want=want, words=words)
            tab.js("location.hash = '#adii'"); time.sleep(0.5)   # the address changed on the open page
            record("anchor", tab.js(WORDS) == [1], page=lang, frag="adii, the address changed in place", width=spec[0], words=tab.js(WORDS))


def bar(tab, origin):
    for lang, contact in LANGS:
        for name, spec, touch in (("desktop", DESK, False), ("phone", PHONE, True)):
            fresh(tab, spec, origin + lang + "#systems")
            missed, n = [], tab.js("document.querySelectorAll('.say').length")
            for moment in ["top", *range(n), "foot"]:
                tab.js("scrollTo(0, 0)" if moment == "top" else "scrollTo(0, document.documentElement.scrollHeight)" if moment == "foot" else PLACE % moment)
                time.sleep(0.2)
                if not tab.js(HIT % json.dumps(".talk"))["on"]:
                    missed.append(moment)
            tab.js(PLACE % (n // 2)); time.sleep(0.2)
            press(tab, ".talk", touch)
            for _ in range(40):
                if tab.js("location.pathname").endswith(contact):
                    break
                time.sleep(0.1)
            record("bar", not missed and tab.js("location.pathname").endswith(contact), page=lang, device=name, moments=n + 2, covered_at=missed, opened=tab.js("location.pathname"))


def lean(origin):
    for lang, _ in LANGS:
        for name, link, plays in (("Save-Data", "{saveData: true, effectiveType: '4g'}", False), ("2g", "{saveData: false, effectiveType: '2g'}", False),
                                  ("slow-2g", "{saveData: false, effectiveType: 'slow-2g'}", False), ("3g", "{saveData: false, effectiveType: '3g'}", True)):
            with tempfile.TemporaryDirectory() as profile:
                proc, _, url = ps.chrome(profile)
                tab = ps.Tab(url)
                tab.send("Page.addScriptToEvaluateOnNewDocument", source=f"Object.defineProperty(navigator, 'connection', {{get: () => ({link})}});")
                tab.requests = []
                fresh(tab, DESK, origin + lang)
                time.sleep(2.5)
                state, films = tab.js("document.body.dataset.state"), [u for u in tab.requests if u.endswith(".mp4")]
                workers = tab.js("navigator.serviceWorker.getRegistrations().then(r => r.length)")
                if plays:
                    passed = state == "film" and any("film-landscape" in u for u in films)
                    record("lean", passed, page=lang, link=name, state=state, films=len(films))
                else:
                    tab.js(PLACE % 1); time.sleep(0.5)
                    poster = tab.js("document.getElementById('film').poster.split('/').pop()")
                    size = tab.js("performance.getEntriesByType('resource').reduce((n, r) => n + r.transferSize, performance.getEntriesByType('navigation')[0].transferSize)")
                    passed = state == "still" and not films and not workers and poster.startswith("passage-adii") and size < 1_000_000
                    record("lean", passed, page=lang, link=name, state=state, films=len(films), workers=workers, still=poster, bytes=size,
                           label=tab.js("document.getElementById('replay').textContent"))
                proc.terminate(); proc.wait()


def edges(tab, origin):
    for lang, _ in LANGS:
        for name, spec in (("desktop", DESK), ("phone", PHONE)):
            fresh(tab, spec, origin + lang + "#systems")
            ps.until(tab, "document.body.classList.contains('scrub')", 30)
            h = tab.js("innerHeight")
            tab.js(f"scrollTo(0, {round(h * 0.64)})"); time.sleep(1.2)
            seam = tab.js("Math.round(document.querySelector('.stage').getBoundingClientRect().bottom)")
            a = jump(tab, seam * spec[2])
            tab.js("scrollTo(0, document.documentElement.scrollHeight)"); time.sleep(1.2)
            foot = tab.js("Math.round(document.querySelector('body>footer').getBoundingClientRect().top)")
            b = jump(tab, foot * spec[2])
            record("edges", a <= EDGE and b <= EDGE, page=lang, device=name, stage_foot=a, footer_top=b, bound=EDGE)


def contact(tab, origin):
    guard = "addEventListener('click', e => { const a = e.target.closest('a'); if (a && a.href.startsWith('mailto:')) { window.__opened = !e.defaultPrevented; e.preventDefault(); } });"
    script = tab.send("Page.addScriptToEvaluateOnNewDocument", source=guard)["identifier"]
    for page in ("contact.html", "ar/contact.html"):
        fresh(tab, DESK, f"{origin}/{page}")
        tab.js("document.getElementById('write').scrollIntoView({block: 'center'})")
        press(tab, "#write", False); time.sleep(0.2)
        asked, opened, focus = tab.js("document.getElementById('status').textContent"), tab.js("window.__opened"), tab.js("document.activeElement.id")
        record("contact", asked and opened is False and focus == "system", page=page, blank_opened=opened, status=asked, focus=focus)
        tab.send("Input.insertText", text="a payments ledger"); time.sleep(0.1)
        tab.js("document.getElementById('write').scrollIntoView({block: 'center'})")   # the focus took the page up to the first question
        press(tab, "#write", False); time.sleep(0.2)
        said, opened = tab.js("document.getElementById('status').textContent"), tab.js("window.__opened")
        links = tab.js("[...document.querySelectorAll('#gmail, #outlook')].map(a => [a.href.split('?')[0], a.target, a.rel, a.href.includes('payments%20ledger')])")
        shown = tab.js("!document.getElementById('webmail').hidden")
        record("contact", opened is True and said and said != asked and shown and all(l[1:] == ["_blank", "noopener", True] for l in links),
               page=page, draft_opened=opened, status=said, webmail_shown=shown, links=[l[0] for l in links])
        tab.js("(f => { f.value = 'x'.repeat(8000); f.dispatchEvent(new Event('input', {bubbles: true})); })(document.getElementById('never'))")
        record("contact", tab.js("document.getElementById('webmail').hidden"), page=page, long_draft="the links to webmail give way; copy remains",
               copy=tab.js("!document.getElementById('copy').hidden"))
    tab.send("Page.removeScriptToEvaluateOnNewDocument", identifier=script)


LAYOUT = """(() => { const r = s => { const e = document.querySelector(s); if (!e || getComputedStyle(e).display === 'none') return null; const b = e.getBoundingClientRect(); return [b.left, b.top, b.right, b.bottom]; };
  const each = s => [...document.querySelectorAll(s)].filter(e => getComputedStyle(e).display !== 'none').map(e => { const b = e.getBoundingClientRect(); return [b.left, b.top, b.right, b.bottom]; });
  const ink = s => { const g = document.createRange(); g.selectNodeContents(document.querySelector(s)); const b = g.getBoundingClientRect(); return [b.left, b.top, b.right, b.bottom]; };
  return {stage: r('.stage'), landing: r('.landing'), nav: ink('.landing nav'), note: ink('.note'), replay: r('#replay'), bar: r('.bar'), fixed: getComputedStyle(document.querySelector('.bar')).position === 'fixed',
          lines: each('.line'), says: each('.say'), width: document.documentElement.scrollWidth}; })()"""
WINDOWS = ((2560, 1440), (1920, 1080), (1470, 779), (1440, 900), (1280, 720), (1200, 665), (844, 390), (720, 450), (667, 375), (568, 320), (390, 844), (375, 667), (360, 640), (320, 844), (320, 568), (320, 256))


def layout(tab, origin):
    meet = lambda a, b: a and b and a[0] < b[2] - 0.5 and b[0] < a[2] - 0.5 and a[1] < b[3] - 0.5 and b[1] < a[3] - 0.5
    for lang, _ in LANGS:
        for w, h in WINDOWS:
            fresh(tab, (w, h, 1, False), origin + lang + "#return")   # still: Replay is shown
            tab.js("scrollTo(0, 0)"); time.sleep(0.15)
            g, bad = tab.js(LAYOUT), []
            if g["landing"][1] < g["stage"][1] or g["landing"][3] > g["stage"][3]: bad.append("statement cut")
            if meet(g["landing"], g["bar"]): bad.append("statement under the bar")
            if meet(g["landing"], g["note"]): bad.append("statement on the note")
            if meet(g["replay"], g["note"]) or meet(g["replay"], g["nav"]): bad.append("Replay on the note or the links")
            for line in g["lines"]:
                if meet(line, g["landing"]): bad.append("subtitle on the statement")
                if meet(line, g["note"]): bad.append("subtitle on the note")
            if g["fixed"] and any(meet(s, g["bar"]) for s in g["says"]): bad.append("words under the bar")
            if g["width"] > w: bad.append(f"sideways scroll {g['width']}")
            record("layout", not bad, page=lang, window=f"{w}x{h}", defects=sorted(set(bad)))


def targets(tab, origin):
    size = """(s => [...document.querySelectorAll(s)].filter(e => getComputedStyle(e).display !== 'none' && e.getClientRects().length).map(e => { const b = e.getBoundingClientRect(); return [e.textContent.trim().slice(0, 18), Math.round(b.width), Math.round(b.height)]; }).filter(t => t[1] < 24 || t[2] < 24))(%s)"""
    front = ".top, .solid, .plain, .route, .mail, #replay, body>footer a, .wordmark"
    room = ".top, .solid, .plain, body>footer a, .wordmark"
    for spec in (DESK, PHONE):
        for path, what in (("/#return", front), ("/ar/#return", front), ("/contact.html", room), ("/ar/contact.html", room), ("/pages/brief.html", room), ("/ar/privacy.html", room), ("/ar/terms.html", room)):
            fresh(tab, spec, origin + path)
            small = tab.js(size % json.dumps(what))
            record("targets", not small, page=path, width=spec[0], below_24=small)


httpd = ps.serve(DIST, 0)
origin = f"http://127.0.0.1:{httpd.server_address[1]}"
with tempfile.TemporaryDirectory() as profile:
    proc, _, url = ps.chrome(profile)
    tab = ps.Tab(url)
    for step in (paint, route, anchor, bar, edges, contact, layout, targets):
        step(tab, origin)
    proc.terminate(); proc.wait()
lean(origin)
httpd.shutdown()
OUT.mkdir(parents=True, exist_ok=True)
build = re.search(r'name="build-hash" content="(\w+)"', (DIST / "index.html").read_text(encoding="utf-8"))[1]
(OUT / "arrival.json").write_text(json.dumps({"artifact_build": build, "result": "PASS" if ok else "FAIL", "rows": rows}, indent=1, ensure_ascii=False), encoding="utf-8")
print(("PASS" if ok else "FAIL") + f": build {build}, {len(rows)} rows, {sum(not r['pass'] for r in rows)} failed")
sys.exit(0 if ok else 1)
