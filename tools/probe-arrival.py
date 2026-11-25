#!/usr/bin/env python3
"""The visitor's first screen and the ways on from it, on both front doors and contact pages: a regression probe of the
audit of 2026-11-05 (no obligation; run after any change to the statement, the bar, the anchors, the page's edges or the
contact pages). Real input throughout: CDP mouse and touch events and elementFromPoint, never element.click().

    .venv/bin/python tools/probe-arrival.py <dist-dir> <out-dir>

paint    First paint, under Lighthouse's presets as DevTools applies them, no cache and no worker: the statement and its links
         stand before the film; the largest contentful paint is within GOOD on the desktop; no layout shift.
opening  On an ordinary link, the frame shown before the film plays is the film's first, not its last: until 2026-11-25 the
         film's ending stood there, so it showed before its opening.
route    *The three systems*, pressed while the film plays (0.3 s and 5 s in) and again from the page's foot, brings the principle
         in under the bar and, the film out of view, stops it.
read     Read on in the film's company: the film plays while any of it is in view; the page under it is on paper, with no scene
         behind it, and each system's words and route are on show and what a pointer reaches, in the page's own order.
anchor   An address naming a section (#principle, #adii, #awc-os, #cythercad) opens on it, its heading shown clear of the bar, and
         so does the address changing on the open page.
bar      At the top, at every section and at the foot, *Talk to us* is what a pointer reaches, and pressing it opens the contact page.
nav      Every page, arriving at its top, then halfway and at its foot, on a desktop and two phones: What we build, About and Talk to us are
         what a pointer reaches, and pressing each opens the brief, About and the contact page of its language. Until 2026-11-07 only the
         front doors named a way to talk, and no page's header named the brief or About (the owner's success test, 2026-11-07).
ghost    The statement scrolling under the bar does not show through it: the same scroll with the statement shown and hidden, at
         most GHOST levels of 255 apart. It showed by 40 until the re-check of 2026-11-06.
lean     Save-Data, a connection the browser calls 2G, and one it estimates under 1 Mbit/s fetch no film and no worker, and the
         film's last frame stands; "3g", which Chrome reports on a loopback server, still plays the film.
slow     The same under real throttling, where Chrome itself names the link and calls even 50 kbit/s "3g": Slow 3G and 2G fetch no
         film, Slow 4G does, and the statement stands on all three. Both films were fetched on the first two until 2026-11-06.
edges    Under the film's foot, and under the footer's top, the paper is unbroken: neighbouring pixel rows stay within EDGE levels,
         with no band of the scene left in it. (Both edges are lines meant to be there, as the header's is.)
contact  A draft of nothing opens nothing and asks again, at the question it takes the visitor to and in view there; a draft says what should be happening; a long one drops the links to
         webmail that would refuse it. The hand-off to the OS is the one seam stubbed: no email app opens.
layout   At nineteen windows, 320×256 (400% zoom) to 2560×1440: the statement whole on its stage, the note and Replay
         clear of it and of each other, each system's words clear of each other, no sideways scroll; and, opened on the principle, none
         of the film under the header and the principle's label clear of it, however many rows the header's words take.
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
GOOD, EDGE, GHOST = 2500, 4, 1
DESK, PHONE = (1440, 900, 1, False), (390, 844, 2, True)
LANGS = (("/", "contact.html"), ("/ar/", "contact.html"))
FIRST = """window.__p = {lcp: [], cls: 0};
new PerformanceObserver(l => { for (const e of l.getEntries()) __p.lcp.push({t: Math.round(e.startTime), el: e.element && e.element.tagName}); }).observe({type: 'largest-contentful-paint', buffered: true});
new PerformanceObserver(l => { for (const e of l.getEntries()) if (!e.hadRecentInput) __p.cls += e.value; }).observe({type: 'layout-shift', buffered: true});"""
# the section whose heading stands first under the bar, whole and in the window
FIRST_UP = """(bar => { const h = [...document.querySelectorAll('.paper > section')].find(s => { const r = s.querySelector('h2, h3').getBoundingClientRect(); return r.top >= bar - 1 && r.bottom <= innerHeight; }); return h && h.id; })(
  (b => getComputedStyle(b).position === 'fixed' ? b.getBoundingClientRect().bottom : 0)(document.querySelector('.bar')))"""
HIT = """(e => { const r = e.getBoundingClientRect(), h = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
  return {x: r.left + r.width / 2, y: r.top + r.height / 2, on: !!h && (h === e || e.contains(h))}; })(document.querySelector(%s))"""
PLACE = "document.querySelectorAll('.paper > section')[%d].scrollIntoView({block: 'start', behavior: 'instant'})"
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
            passed = stands and (bound is None or last["t"] <= bound) and p["cls"] <= 0.01
            record("paint", passed, page=lang, profile=name, statement_at_first_paint=stands, lcp_ms=last["t"], lcp_element=last["el"], cls=round(p["cls"], 4))
            throttle(tab, -8, 0, 1)
    tab.send("Page.removeScriptToEvaluateOnNewDocument", identifier=script)
    tab.send("Network.setCacheDisabled", cacheDisabled=False)
    tab.send("Network.setBypassServiceWorker", bypass=False)


def opening(tab, origin):
    """the poster the film's element stands on before the film plays, and the still that stands when it will not"""
    for lang, _ in LANGS:
        for name, spec, shape in (("desktop", DESK, "landscape"), ("phone", PHONE, "portrait")):
            script = tab.send("Page.addScriptToEvaluateOnNewDocument", source="HTMLMediaElement.prototype.play = () => new Promise(() => {});")["identifier"]
            fresh(tab, spec, origin + lang); time.sleep(0.5)
            poster = "document.getElementById('film').poster.split('/').pop()"
            waits = tab.js(poster)
            ps.until(tab, "document.body.dataset.state === 'still'", 8)   # GUARD: it never starts
            record("opening", waits == f"nightfall-{shape}-open.jpg" and tab.js(poster) == f"nightfall-{shape}.jpg", page=lang, device=name, waits_on=waits, stands_on=tab.js(poster))
            tab.send("Page.removeScriptToEvaluateOnNewDocument", identifier=script)


def route(tab, origin):
    for lang, _ in LANGS:
        for name, spec, touch in (("desktop", DESK, False), ("phone", PHONE, True)):
            for at in (0.3, 5):
                fresh(tab, spec, origin + lang)
                time.sleep(at)
                hit = press(tab, ".landing .solid", touch); time.sleep(0.7)
                up, state = tab.js(FIRST_UP), tab.js("document.body.dataset.state")
                record("route", hit and up == "principle" and state == "still", page=lang, device=name, pressed_at=at, hit=hit, first=up, state=state)


def read(tab, origin):
    for lang, _ in LANGS:
        for name, spec in (("desktop", DESK), ("phone", PHONE)):
            fresh(tab, spec, origin + lang); time.sleep(1.5)
            tab.js("scrollTo(0, innerHeight / 2)"); time.sleep(0.6)
            going = tab.js("document.body.dataset.state === 'film' && !document.getElementById('film').paused")
            missed = []
            for i, section in enumerate(tab.js("[...document.querySelectorAll('.paper > section')].map(s => s.id)")):
                tab.js(PLACE % i); time.sleep(0.25)
                ground = tab.js(f"(s => getComputedStyle(s.parentElement).backgroundColor + ' ' + document.elementsFromPoint(innerWidth / 2, Math.min(innerHeight - 2, s.getBoundingClientRect().bottom - 2)).some(e => e.id === 'film'))(document.getElementById('{section}'))")
                for part in ("h2, #%s h3" % section, "p", ".cond", "a.route"):
                    for j in range(tab.js(f"document.querySelectorAll('#{section} {part}').length")):
                        tab.js(f"document.querySelectorAll('#{section} {part}')[{j}].scrollIntoView({{block: 'center', behavior: 'instant'}})"); time.sleep(0.05)
                        seen = tab.js(f"(e => {{ const c = getComputedStyle(e), r = document.createRange(); r.selectNodeContents(e); const b = r.getClientRects()[0], at = document.elementFromPoint(b.left + b.width / 2, b.top + b.height / 2); return c.visibility === 'visible' && c.opacity === '1' && !!at && (at === e || e.contains(at)); }})(document.querySelectorAll('#{section} {part}')[{j}])")
                        if not seen: missed.append(f"{section} {part}")
                if ground != "rgb(244, 241, 234) false": missed.append(f"{section} on {ground}")
            gone = tab.js("document.body.dataset.state === 'still' && document.getElementById('film').paused")
            record("read", going and gone and not missed, page=lang, device=name, film_half_in_view_plays=going, out_of_view_stopped=gone, not_on_show=missed)


def anchor(tab, origin):
    for lang, _ in LANGS:
        for spec in (DESK, PHONE):
            for frag in ("principle", "adii", "awc-os", "cythercad"):
                fresh(tab, spec, f"{origin}{lang}#{frag}")
                time.sleep(0.5)
                up = tab.js(FIRST_UP)
                record("anchor", up == frag and tab.js("document.body.dataset.state") == "still", page=lang, frag=frag, width=spec[0], first=up)
            tab.js("location.hash = '#adii'"); time.sleep(0.5)   # the address changed on the open page
            record("anchor", tab.js(FIRST_UP) == "adii", page=lang, frag="adii, the address changed in place", width=spec[0], first=tab.js(FIRST_UP))


def bar(tab, origin):
    for lang, contact in LANGS:
        for name, spec, touch in (("desktop", DESK, False), ("phone", PHONE, True)):
            fresh(tab, spec, origin + lang + "#principle")
            missed, n = [], tab.js("document.querySelectorAll('.paper > section').length")
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


def ghost(tab, origin):
    shot = lambda: ink.pixels(base64.b64decode(tab.send("Page.captureScreenshot", format="png", optimizeForSpeed=True)["data"]))
    for lang, _ in LANGS:
        for name, spec in (("desktop", DESK), ("phone", PHONE)):
            fresh(tab, spec, origin + lang + "#principle")
            tab.js("scrollTo(0, 0)"); time.sleep(0.6)
            bar, left, right, top, bottom = tab.js("(g => { g.selectNodeContents(document.querySelector('.landing')); const b = g.getBoundingClientRect(); return [Math.round(document.querySelector('.bar').getBoundingClientRect().bottom), Math.floor(b.left), Math.ceil(b.right), Math.round(b.top), Math.round(b.bottom)]; })(document.createRange())")
            worst, d = 0, spec[2]
            for y in range(top - bar + 4, bottom, 32):   # the statement and its links passing under the bar
                tab.js(f"scrollTo(0, {y})"); time.sleep(0.25)
                w, _, shown = shot()
                tab.js("document.querySelector('.landing').style.visibility = 'hidden'"); time.sleep(0.1)
                hidden = shot()[2]
                tab.js("document.querySelector('.landing').style.visibility = ''")
                for row in range(bar * d):   # above the statement alone: the scrollbar, a desktop's overlay, comes and goes at the edge
                    a, b = (row * w + left * d) * 3, (row * w + right * d) * 3
                    worst = max(worst, max(abs(p - q) for p, q in zip(shown[a:b], hidden[a:b])))
            record("ghost", worst <= GHOST, page=lang, device=name, show_through=worst, bound=GHOST)


def slow(origin):
    for lang, _ in LANGS:
        for name, net, plays in (("Slow 4G", dict(latency=562, downloadThroughput=1.47e6 / 8, uploadThroughput=675e3 / 8), True),
                                 ("Slow 3G", dict(latency=400, downloadThroughput=400e3 / 8, uploadThroughput=400e3 / 8, connectionType="cellular3g"), False),
                                 ("2G", dict(latency=800, downloadThroughput=50e3 / 8, uploadThroughput=20e3 / 8, connectionType="cellular2g"), False)):
            with tempfile.TemporaryDirectory() as profile:
                proc, _, url = ps.chrome(profile)
                tab = ps.Tab(url)
                view(tab, DESK)
                tab.send("Network.setCacheDisabled", cacheDisabled=True)
                tab.send("Network.emulateNetworkConditions", offline=False, **net)
                tab.requests = []
                tab.send("Page.navigate", url=origin + lang)
                for _ in range(240):
                    if tab.js("document.readyState") == "complete":
                        break
                    time.sleep(0.25)
                time.sleep(3)
                films = sorted({u.rsplit("/", 1)[-1] for u in tab.requests if u.endswith(".mp4")})
                seen, stands = tab.js("[navigator.connection.effectiveType, navigator.connection.downlink]"), tab.js("getComputedStyle(document.querySelector('.landing')).opacity === '1'")
                record("slow", stands and bool(films) == plays, page=lang, link=name, chrome_reports=seen, statement=stands, films=films)
                proc.terminate(); proc.wait()


NAV_PAGES = [p for p in (HERE.parent / "deploy.paths").read_text(encoding="utf-8").split() if p.endswith(".html") and p != "404.html"]


def nav(tab, origin):
    want = lambda page: ["/pages/brief.html", "/ar/about.html" if page.startswith("ar/") else "/pages/about.html", "/ar/contact.html" if page.startswith("ar/") else "/contact.html"]
    for spec in (DESK, PHONE, (320, 568, 2, True)):
        for page in NAV_PAGES:
            path = "/" + (page[: -len("index.html")] if page.endswith("index.html") else page)
            fresh(tab, spec, origin + path); time.sleep(0.3)
            if tab.js("document.querySelectorAll('.bar .side a').length") < 3:
                record("nav", False, page=path, width=spec[0], links=tab.js("[...document.querySelectorAll('header a')].map(a => a.textContent.trim())"))
                continue
            missed = []
            for at in ("top", "half", "foot"):
                tab.js("scrollTo(0, 0)" if at == "top" else "scrollTo(0, document.documentElement.scrollHeight / 2)" if at == "half" else "scrollTo(0, document.documentElement.scrollHeight)")
                time.sleep(0.3)
                for i in range(3):
                    if not tab.js(HIT % json.dumps(f".bar .side a:nth-child({i + 1})"))["on"]:
                        missed.append(f"{at}:{i}")
            leads = [tab.js(f"new URL(document.querySelector('.bar .side a:nth-child({i + 1})').href).pathname") for i in range(3)]
            record("nav", not missed and leads == want(page), page=path, width=spec[0], covered=missed, leads=leads)
        for path in ("/", "/pages/about.html", "/ar/cythercad.html"):   # and a press takes the visitor there
            for i in range(3):
                fresh(tab, spec, origin + path); time.sleep(0.3)
                if not tab.js(f"!!document.querySelector('.bar .side a:nth-child({i + 1})')"):
                    record("nav", False, page=path, width=spec[0], pressed=i, missing="no such link in a header")
                    continue
                press(tab, f".bar .side a:nth-child({i + 1})", spec[3])
                for _ in range(40):
                    if tab.js("location.pathname") == want(path.lstrip("/") or "index.html")[i]:
                        break
                    time.sleep(0.1)
                record("nav", tab.js("location.pathname") == want(path.lstrip("/") or "index.html")[i], page=path, width=spec[0], pressed=i, opened=tab.js("location.pathname"))


def lean(origin):
    for lang, _ in LANGS:
        for name, link, plays in (("Save-Data", "{saveData: true, effectiveType: '4g'}", False), ("2g", "{saveData: false, effectiveType: '2g'}", False),
                                  ("slow-2g", "{saveData: false, effectiveType: 'slow-2g'}", False), ("under 1 Mbit/s", "{saveData: false, effectiveType: '3g', downlink: 0.4}", False),
                                  ("3g", "{saveData: false, effectiveType: '3g'}", True), ("3g at 1.65 Mbit/s", "{saveData: false, effectiveType: '3g', downlink: 1.65}", True)):
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
                    passed = state == "film" and any("nightfall-landscape" in u for u in films)
                    record("lean", passed, page=lang, link=name, state=state, films=len(films))
                else:
                    tab.js("document.documentElement.scrollTo(0, document.documentElement.scrollHeight)"); time.sleep(0.5)
                    poster = tab.js("document.getElementById('film').poster.split('/').pop()")
                    size = tab.js("performance.getEntriesByType('resource').reduce((n, r) => n + r.transferSize, performance.getEntriesByType('navigation')[0].transferSize)")
                    passed = state == "still" and not films and not workers and poster == "nightfall-landscape.jpg" and size < 1_000_000
                    record("lean", passed, page=lang, link=name, state=state, films=len(films), workers=workers, still=poster, bytes=size,
                           label=tab.js("document.getElementById('replay').textContent"))
                proc.terminate(); proc.wait()


def edges(tab, origin):
    for lang, _ in LANGS:
        for name, spec in (("desktop", DESK), ("phone", PHONE)):
            fresh(tab, spec, origin + lang + "#principle")
            h = tab.js("innerHeight")
            tab.js(f"scrollTo(0, {round(h * 0.4)})"); time.sleep(0.6)
            seam = tab.js("Math.round(document.querySelector('.stage').getBoundingClientRect().bottom)")
            a = jump(tab, (seam + 13) * spec[2])                      # under the film's foot, above the paper's first words
            tab.js("scrollTo(0, document.documentElement.scrollHeight)"); time.sleep(1.2)
            foot = tab.js("Math.round(document.querySelector('body>footer').getBoundingClientRect().top)")
            b = jump(tab, (foot + 14) * spec[2])                      # inside the footer's own paper, clear of its edge and above its words
            paper = tab.js("getComputedStyle(document.querySelector('body>footer')).backgroundColor")
            record("edges", a <= EDGE and b <= EDGE and paper == "rgb(244, 241, 234)", page=lang, device=name, under_the_film=a, footer_paper=b, ground=paper, bound=EDGE)


def contact(tab, origin):
    guard = "addEventListener('click', e => { const a = e.target.closest('a'); if (a && a.href.startsWith('mailto:')) { window.__opened = !e.defaultPrevented; e.preventDefault(); } });"
    script = tab.send("Page.addScriptToEvaluateOnNewDocument", source=guard)["identifier"]
    for page in ("contact.html", "ar/contact.html"):
        fresh(tab, DESK, f"{origin}/{page}")
        tab.js("document.getElementById('write').scrollIntoView({block: 'center'})")
        press(tab, "#write", False); time.sleep(0.2)
        asked, opened, focus = tab.js("document.getElementById('error').textContent"), tab.js("window.__opened"), tab.js("document.activeElement.id")
        seen = tab.js("(r => r.height > 0 && r.top >= document.querySelector('.bar').getBoundingClientRect().bottom && r.bottom <= innerHeight)(document.getElementById('error').getBoundingClientRect())")
        record("contact", asked and seen and opened is False and focus == "system" and tab.js("document.activeElement.getAttribute('aria-invalid')") == "true", page=page, blank_opened=opened, said=asked, in_view=seen, focus=focus)
        tab.send("Input.insertText", text="a payments ledger"); time.sleep(0.1)
        record("contact", not tab.js("document.getElementById('error').textContent") and not tab.js("document.activeElement.hasAttribute('aria-invalid')"), page=page, answered="what was wrong is no longer said")
        tab.js("document.getElementById('write').scrollIntoView({block: 'center'})")   # the focus took the page up to the first question
        press(tab, "#write", False); time.sleep(0.2)
        said, opened = tab.js("document.getElementById('status').textContent"), tab.js("window.__opened")
        links = tab.js("[...document.querySelectorAll('#gmail, #outlook, #outlook-live')].map(a => [a.href.split('?')[0], a.target, a.rel, a.href.includes('payments%20ledger')])")
        shown = tab.js("[...document.querySelectorAll('.webmail')].every(e => !e.hidden)")
        record("contact", opened is True and said and said != asked and shown and len(links) == 3 and all(l[1:] == ["_blank", "noopener", True] for l in links),
               page=page, draft_opened=opened, status=said, webmail_shown=shown, links=[l[0] for l in links])
        tab.js("(f => { f.value = 'x'.repeat(8000); f.dispatchEvent(new Event('input', {bubbles: true})); })(document.getElementById('never'))")
        record("contact", tab.js("[...document.querySelectorAll('.webmail')].every(e => e.hidden && getComputedStyle(e).display === 'none')"), page=page, long_draft="the links to webmail give way; copy remains",
               copy=tab.js("!document.getElementById('copy').hidden"))
    tab.send("Page.removeScriptToEvaluateOnNewDocument", identifier=script)


LAYOUT = """(() => { const r = s => { const e = document.querySelector(s); if (!e || getComputedStyle(e).display === 'none') return null; const b = e.getBoundingClientRect(); return [b.left, b.top, b.right, b.bottom]; };
  const ink = s => { const g = document.createRange(); g.selectNodeContents(document.querySelector(s)); const b = g.getBoundingClientRect(); return [b.left, b.top, b.right, b.bottom]; };
  return {stage: r('.stage'), landing: r('.landing'), nav: ink('.landing nav'), note: ink('.note'), replay: r('#replay'), bar: r('.bar'), fixed: getComputedStyle(document.querySelector('.bar')).position === 'fixed',
          systems: [...document.querySelectorAll('.system')].map(s => ['small', 'h3', 'div'].map(q => { const g = document.createRange(); g.selectNodeContents(s.querySelector(q)); const b = g.getBoundingClientRect(); return [b.left, b.top, b.right, b.bottom]; })), width: document.documentElement.scrollWidth}; })()"""
WINDOWS = ((2560, 1440), (1920, 1080), (1470, 779), (1440, 900), (1280, 720), (1200, 665), (844, 390), (720, 450), (667, 375), (568, 320), (441, 900), (440, 956), (430, 932), (390, 844), (375, 667), (360, 640), (320, 844), (320, 568), (320, 256))


def layout(tab, origin):
    meet = lambda a, b: a and b and a[0] < b[2] - 0.5 and b[0] < a[2] - 0.5 and a[1] < b[3] - 0.5 and b[1] < a[3] - 0.5
    for lang, _ in LANGS:
        for w, h in WINDOWS:
            fresh(tab, (w, h, 1, False), origin + lang + "#principle")   # still: Replay is shown
            time.sleep(0.15); foot, edge, label = tab.js("[document.querySelector('.stage'), document.querySelector('.bar'), document.querySelector('#principle small')].map((e, i) => e.getBoundingClientRect()[i < 2 ? 'bottom' : 'top'])")
            edge = max(0, edge)   # a bar that scrolls away has gone above the window
            tab.js("scrollTo(0, 0)"); time.sleep(0.15)
            g, bad = tab.js(LAYOUT), []
            if foot > edge + 0.5: bad.append(f"{foot - edge:.0f} px of the film under the header")
            if label < edge: bad.append("the principle's label under the header")
            if g["landing"][1] < g["stage"][1] or g["landing"][3] > g["stage"][3]: bad.append("statement cut")
            if meet(g["landing"], g["bar"]): bad.append("statement under the bar")
            if meet(g["landing"], g["note"]): bad.append("statement on the note")
            if meet(g["replay"], g["note"]) or meet(g["replay"], g["nav"]): bad.append("Replay on the note or the links")
            if any(meet(a, b) for s in g["systems"] for i, a in enumerate(s) for b in s[i + 1:]): bad.append("a system's words on each other")
            if any(r[0] < -0.5 or r[2] > w + 0.5 for s in g["systems"] for r in s): bad.append("a system's words past the window")
            if g["width"] > w: bad.append(f"sideways scroll {g['width']}")
            record("layout", not bad, page=lang, window=f"{w}x{h}", defects=sorted(set(bad)))


def targets(tab, origin):
    size = """(s => [...document.querySelectorAll(s)].filter(e => getComputedStyle(e).display !== 'none' && e.getClientRects().length).map(e => { const b = e.getBoundingClientRect(); return [e.textContent.trim().slice(0, 18), Math.round(b.width), Math.round(b.height)]; }).filter(t => t[1] < 24 || t[2] < 24))(%s)"""
    front = ".top, .solid, .plain, .route, .mail, #replay, body>footer a, .wordmark"
    room = ".top, .solid, .plain, body>footer a, .wordmark"
    for spec in (DESK, PHONE):
        for path, what in (("/#principle", front), ("/ar/#principle", front), ("/contact.html", room), ("/ar/contact.html", room), ("/pages/brief.html", room), ("/ar/privacy.html", room), ("/ar/terms.html", room), ("/pages/about.html", room), ("/ar/about.html", room), ("/adii/", room), ("/ar/adii.html", room), ("/flat/", front), ("/ar/flat.html", front)):
            fresh(tab, spec, origin + path)
            small = tab.js(size % json.dumps(what))
            record("targets", not small, page=path, width=spec[0], below_24=small)


httpd = ps.serve(DIST, 0)
origin = f"http://127.0.0.1:{httpd.server_address[1]}"
with tempfile.TemporaryDirectory() as profile:
    proc, _, url = ps.chrome(profile)
    tab = ps.Tab(url)
    for step in (paint, opening, route, read, anchor, bar, nav, ghost, edges, contact, layout, targets):
        step(tab, origin)
    proc.terminate(); proc.wait()
lean(origin)
slow(origin)
httpd.shutdown()
OUT.mkdir(parents=True, exist_ok=True)
build = re.search(r'name="build-hash" content="(\w+)"', (DIST / "index.html").read_text(encoding="utf-8"))[1]
(OUT / "arrival.json").write_text(json.dumps({"artifact_build": build, "result": "PASS" if ok else "FAIL", "rows": rows}, indent=1, ensure_ascii=False), encoding="utf-8")
print(("PASS" if ok else "FAIL") + f": build {build}, {len(rows)} rows, {sum(not r['pass'] for r in rows)} failed")
sys.exit(0 if ok else 1)
