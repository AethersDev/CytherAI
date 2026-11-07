#!/usr/bin/env python3
"""A returning visitor with a publish between two visits (no obligation; run after any change to sw.js, to how js/film.js registers
it, or to how a page names its resources). The question the owner asked on 2026-11-06: does a visitor keep seeing the last build?

    .venv/bin/python tools/probe-return.py <dist-dir> <out-dir> [--from <older-dist>]

One origin serves <dist-dir> and then the build after it, made in a throwaway copy: every stylesheet and script differs, as a real
publish's do (a worker test whose bytes do not differ proves nothing), with its ?v=, integrity, stamp and cache name following. It sends
Pages' own Cache-Control, max-age=600. Each scenario is a fresh profile, a visitor who has read the pages on one build and is in the
worker's hands; "publish" switches what the server reads. A page is whole if it is the build expected, its stylesheet and script ran,
and no integrity check failed.

first    Each page the visitor had read, on the first load after a publish, is the new build and whole; a reload too; and with every tab
         closed, a new one. Until 2026-11-06 a returning visitor's first load was the old build, and so was every reload until
         a front door's film had ended or every tab of the site was closed.
anchor   Through the worker, an address naming a stretch still brings its words, and one with no trailing slash still lands.
offline  With the server gone, each page the worker holds stands whole, on whichever build it holds.
window   A publish part way (Pages' CDN answers any ?v= from its one copy of the path, observed 2026-11-06): the new pages and worker, the old
         bytes at the stylesheets' and scripts' paths. A visitor returns in that moment and again after it. The page may fail for that load,
         as anyone's would; afterwards it must be whole. Until 2026-11-06 the worker kept the old bytes under the new names, and the page
         then failed on every load until the next publish, which only clearing the site's data could end. Then one page still old: no
         install until it is new, or the offline copy would name files the worker does not hold.
upgrade  With --from: a visitor on an older build's worker, which cannot be changed from here. The first load after a publish is that
         build, whole; once its film has ended the next load is the new build; and after the next publish, the first load is new.
ios      The first load after a publish, and a return during a publish part way and after it, in the iOS Simulator's WebKit, in a copy whose CSP
         lets a diagnostic script report, since iOS Safari has no CDP. It takes no scripted touch, so a load is a URL opened; a Safari relaunch
         is not a real return, only the nearest.

Writes <out-dir>/return.json; exits 0 on PASS, 1 on FAIL.
"""
import argparse, base64, hashlib, importlib.util, json, re, shutil, subprocess, sys, tempfile, threading, time, urllib.request
from http.server import ThreadingHTTPServer
from pathlib import Path

HERE = Path(__file__).resolve().parent
spec = importlib.util.spec_from_file_location("settle", HERE / "probe-settle.py")   # its server (byte ranges), Chrome and tab
ps = importlib.util.module_from_spec(spec); spec.loader.exec_module(ps)
# the browser's own update check is what is under test, and --disable-background-networking holds it back by many seconds
launch = subprocess.Popen
subprocess.Popen = lambda cmd, **kw: launch([c for c in cmd if c != "--disable-background-networking"], **kw)
ap = argparse.ArgumentParser(); ap.add_argument("dist"); ap.add_argument("out"); ap.add_argument("--from", dest="older"); ap.add_argument("--no-ios", action="store_true")
ARGS = ap.parse_args()
DIST, OUT = Path(ARGS.dist).resolve(), Path(ARGS.out); OUT.mkdir(parents=True, exist_ok=True)
FRONT, ROOMS = ("/", "/ar/"), ("/contact.html", "/ar/contact.html", "/pages/brief.html", "/pages/about.html", "/ar/privacy.html", "/adii/", "/ar/adii.html", "/flat/")
CHANGED = ("css/film.css", "css/room.css", "css/flat.css", "js/film.js", "js/flat.js")
WHOLE = """({build: (document.querySelector('meta[name=build-hash]') || {content: null}).content, styled: getComputedStyle(document.documentElement).getPropertyValue('--ground').trim() === '#07070a',
  scripted: !document.documentElement.classList.contains('no-js'), controlled: !!(navigator.serviceWorker && navigator.serviceWorker.controller)})"""
rows, ok = [], True
SERVED = {"dir": DIST, "old": {}, "down": False}   # what the origin reads now; the paths still old; whether it answers at all


def stamp(path):
    return re.search(r'name="build-hash" content="(\w+)"', (path / "index.html").read_text(encoding="utf-8"))[1]


def following(dist, into):
    """the build after dist: differing bytes at the stylesheets' and scripts' paths, and everything that names them following"""
    shutil.copytree(dist, into)
    build = stamp(dist); new = hashlib.sha256(build.encode()).hexdigest()[:16].upper(); swaps = {build: new}
    for f in CHANGED:
        old = (dist / f).read_bytes(); now = old + b"\n/* the next build */\n"; (into / f).write_bytes(now)
        swaps[f"{f}?v={hashlib.sha256(old).hexdigest()[:12]}"] = f"{f}?v={hashlib.sha256(now).hexdigest()[:12]}"
        swaps["sha384-" + base64.b64encode(hashlib.sha384(old).digest()).decode()] = "sha384-" + base64.b64encode(hashlib.sha384(now).digest()).decode()
    for p in [*into.rglob("*.html"), into / "sw.js"]:
        s = p.read_text(encoding="utf-8")
        for a, b in swaps.items():
            s = s.replace(a, b)
        p.write_text(s, encoding="utf-8")
    return new


class Origin(ps.Files):
    def __init__(self, *args, **kw):
        super().__init__(*args, directory=str(SERVED["dir"]), **kw)

    def translate_path(self, path):
        self.directory = str(SERVED["dir"])   # at the request: Chrome opens sockets ahead of its requests, so one accepted before a publish is used after it
        full = super().translate_path(path)
        rel = str(Path(full).relative_to(SERVED["dir"])) if Path(full).is_relative_to(SERVED["dir"]) else ""
        return str(SERVED["old"][rel]) if rel in SERVED["old"] else full

    def send_head(self):
        if SERVED["down"]:
            self.close_connection = True
            return None
        del self.headers["If-Modified-Since"]   # file times are to the second, and a build made a moment after another would answer 304
        return super().send_head()

    def end_headers(self):
        self.send_header("Cache-Control", "max-age=600")   # Pages' own, on every response
        super().end_headers()


def record(probe, passed, **detail):
    global ok
    ok &= bool(passed); rows.append({"probe": probe, "pass": bool(passed), **detail})
    print(("PASS  " if passed else "FAIL  ") + probe + "  " + json.dumps(detail, ensure_ascii=False)[:250], flush=True)


class Visitor:
    """a fresh profile on the origin's current build, the worker installed and in control"""

    def __init__(self, origin, pages=()):
        self.origin, self.dir = origin, tempfile.TemporaryDirectory()
        self.proc, self.port, url = ps.chrome(self.dir.name)
        self.tab = ps.Tab(url)
        self.tab.send("Emulation.setDeviceMetricsOverride", width=1440, height=900, deviceScaleFactor=1, mobile=False)
        self.tab.load(origin + "/#principle")   # opens past the film: still at once, so the worker registers
        self.tab.js("navigator.serviceWorker.ready.then(() => 1)")
        for _ in range(40):
            self.tab.load()
            if self.tab.js("!!navigator.serviceWorker.controller"):
                break
            time.sleep(0.25)
        for page in pages:
            self.open(page)

    def gone(self, url):
        """navigates, and returns once a new document stands: a load event can belong to the document before (the film's can come late)"""
        self.tab.send("Page.navigate", url="about:blank")
        self.settled("location.href === 'about:blank'")
        self.tab.send("Page.navigate", url=url)
        self.settled("location.href !== 'about:blank' && document.readyState === 'complete'")

    def settled(self, condition):
        for _ in range(240):
            try:
                if self.tab.js(condition):
                    return
            except AssertionError:   # the page's context went with its document: ask again
                pass
            time.sleep(0.25)
        raise SystemExit(f"never: {condition}")

    def open(self, page):
        self.tab.errors = []
        self.gone(self.origin + page)
        return self.read()

    def read(self):
        time.sleep(0.5)
        w = self.tab.js(WHOLE); w["integrity"] = [e[:90] for e in self.tab.errors if "integrity" in e]
        return w

    def reload(self):
        self.tab.errors = []
        self.tab.js("window.__before = 1")
        self.tab.send("Page.reload")
        self.settled("!window.__before && document.readyState === 'complete'")
        return self.read()

    def holds(self, build, seconds=45):
        """waits until the browser holds that build's worker, by its cache: Chrome checks a little after a navigation, not at it"""
        for _ in range(seconds * 2):
            if self.tab.js(f"caches.keys().then(k => k.some(n => n.endsWith('{build}')))"):
                return True
            time.sleep(0.5)
        return False

    def new_tab_alone(self):
        """every tab of the site closed, then a new one; a worker waiting takes over a moment after the last page goes"""
        was = [t["id"] for t in json.load(urllib.request.urlopen(f"http://127.0.0.1:{self.port}/json/list")) if t["type"] == "page"]
        target = json.load(urllib.request.urlopen(urllib.request.Request(f"http://127.0.0.1:{self.port}/json/new?about:blank", method="PUT")))
        for tab in was:
            urllib.request.urlopen(f"http://127.0.0.1:{self.port}/json/close/{tab}").read()
        time.sleep(4)
        self.tab = ps.Tab(target["webSocketDebuggerUrl"])
        self.tab.send("Emulation.setDeviceMetricsOverride", width=1440, height=900, deviceScaleFactor=1, mobile=False)

    def close(self):
        self.proc.terminate(); self.proc.wait(); self.dir.cleanup()


def whole(w, build=None):
    return w["styled"] and w["scripted"] and not w["integrity"] and (build is None or w["build"] == build)


def publish(where, old=None):
    SERVED.update(dir=where, old=old or {}, down=False)


def first(origin, was, new, next_dir):
    for page in (*FRONT, *ROOMS):
        publish(was["dir"])
        v = Visitor(origin, [page])
        publish(next_dir)
        a = v.open(page); b = v.reload()
        v.holds(new); v.new_tab_alone()
        c = v.open(page)
        record("first", whole(a, new) and whole(b, new) and whole(c, new), page=page, first_load=a["build"], reload=b["build"], after_every_tab_closed=c["build"], integrity=a["integrity"] or b["integrity"] or c["integrity"], styled=a["styled"], scripted=a["scripted"])
        v.close()


def anchor(origin, was, new, next_dir):
    publish(was["dir"])
    v = Visitor(origin, ["/adii/"])
    publish(next_dir)
    v.open("/#adii"); time.sleep(0.5)
    shown = v.tab.js("[...document.querySelectorAll('.say')].filter(s => getComputedStyle(s).opacity === '1').map(s => s.closest('section').id)")
    record("anchor", "adii" in shown, address="/#adii", shown=shown)
    w = v.open("/adii")
    record("anchor", v.tab.js("location.pathname") == "/adii/" and whole(w, new), address="/adii", landed=v.tab.js("location.pathname"), build=w["build"])
    v.close()


def offline(origin, was, new, next_dir):
    publish(was["dir"])
    v = Visitor(origin, ["/pages/brief.html"])
    publish(next_dir)
    v.open("/pages/brief.html"); v.open("/")
    SERVED["down"] = True
    for page in ("/", "/ar/", "/pages/brief.html", "/contact.html"):
        w = v.open(page)
        record("offline", whole(w) and w["build"] in (was["build"], new), page=page, build=w["build"], styled=w["styled"], integrity=w["integrity"])
    SERVED["down"] = False
    v.close()


def window(origin, was, new, next_dir):
    publish(was["dir"])
    v = Visitor(origin)
    publish(next_dir, {f: was["dir"] / f for f in CHANGED})   # part way: new pages and worker, old bytes at the changed paths
    v.gone(origin + "/#principle")                                                  # the worker installs if it can; the page, still, lets it in
    held = v.holds(new, 25); time.sleep(2)
    during = v.open("/#principle")
    # and as an engine asks that gives the worker no integrity a fetch could refuse (WebKit did on 2026-10-04, and did not on 2026-11-06): nothing wrong may be kept
    v.tab.js("Promise.all([...document.querySelectorAll('link[rel=stylesheet], script[src]')].map(e => fetch(e.href || e.src).then(r => r.text())))")
    publish(next_dir)                                                               # the publish finished
    record("window", not held, step="during it the new worker refuses to install; the page is not judged", new_worker_installed=held, page_build=during["build"], integrity=during["integrity"][:1])
    for page in ("/", "/pages/brief.html", "/ar/", "/", "/pages/brief.html"):
        w = v.open(page)
        record("window", whole(w, new), page=page, build=w["build"], styled=w["styled"], scripted=w["scripted"], integrity=w["integrity"], controlled=w["controlled"])
    v.close()
    publish(was["dir"])   # part way the other way: one page still old, which a new worker must not keep for its offline copy
    v = Visitor(origin)
    publish(next_dir, {"pages/terms.html": was["dir"] / "pages/terms.html"})
    v.gone(origin + "/#principle")
    held = v.holds(new, 25)
    publish(next_dir)
    v.gone(origin + "/#principle")
    after = v.holds(new)
    record("window", not held and after, step="one page still old: no install until it is new", during=held, after=after)
    v.close()


def upgrade(origin, older, was, new, next_dir):
    publish(older)
    v = Visitor(origin, ["/pages/brief.html"])
    publish(was["dir"])
    a = v.open("/")
    record("upgrade", whole(a, stamp(older)), step="first load after the publish: the older worker's page, whole", build=a["build"], integrity=a["integrity"])
    for _ in range(100):   # the film ends; a page whose film is still lets a waiting worker in (js/film.js)
        if v.tab.js("document.body.dataset.state") == "still":
            break
        time.sleep(0.25)
    v.holds(was["build"]); time.sleep(2)
    b = v.open("/")
    record("upgrade", whole(b, was["build"]), step="the next load, once the film has ended", build=b["build"], integrity=b["integrity"])
    publish(next_dir)
    c, d = v.open("/"), v.open("/pages/brief.html")
    record("upgrade", whole(c, new) and whole(d, new), step="the first load after the next publish", front_door=c["build"], brief=d["build"], integrity=c["integrity"] or d["integrity"])
    v.close()


# the iOS Simulator: pages report to the probe's server, by a script in a copy whose CSP lets it
IOS = r"""addEventListener('load', function () { setTimeout(function () {
  var tag = (/[?&#]t=([\w-]+)/.exec(location.href) || [])[1]; if (!tag) return;
  var x = new XMLHttpRequest(); x.open('POST', '/__report', false); x.setRequestHeader('Content-Type', 'application/json');
  x.send(JSON.stringify({tag: tag, path: location.pathname, build: document.querySelector('meta[name=build-hash]').content, styled: getComputedStyle(document.documentElement).getPropertyValue('--ground').trim() === '#07070a',
    scripted: !document.documentElement.classList.contains('no-js'), controlled: !!navigator.serviceWorker.controller}));
}, 1500); });"""
REPORTS = []


class IosOrigin(Origin):
    def do_POST(self):
        REPORTS.append(json.loads(self.rfile.read(int(self.headers.get("Content-Length", 0))))); self.send_response(204); self.end_headers()


def diagnosed(build_dir, into):
    shutil.copytree(build_dir, into)
    (into / "__r.js").write_text(IOS, encoding="utf-8")
    for p in into.rglob("*.html"):
        s = re.sub(r'<meta http-equiv="Content-Security-Policy"[^>]*>', "", p.read_text(encoding="utf-8"))
        p.write_text(s.replace("</head>", '<script src="/__r.js"></script>\n</head>', 1), encoding="utf-8")


def ios(was, new, next_dir, t, plain_next):
    sim = lambda *a: subprocess.run(["xcrun", "simctl", *a], capture_output=True, text=True)
    devices = json.loads(sim("list", "devices", "available", "-j").stdout)["devices"]
    device = next(d for runtime, ds in sorted(devices.items(), reverse=True) if "iOS" in runtime for d in ds if d["name"].startswith("iPhone"))["udid"]
    a, b = Path(t) / "ios-a", Path(t) / "ios-b"
    diagnosed(was["dir"], a); diagnosed(next_dir, b)
    httpd = ThreadingHTTPServer(("127.0.0.1", 0), IosOrigin); httpd.daemon_threads = True
    threading.Thread(target=httpd.serve_forever, daemon=True).start()
    origin = f"http://127.0.0.1:{httpd.server_address[1]}"
    sim("boot", device); sim("bootstatus", device, "-b")

    def load(path, tag):
        sim("terminate", device, "com.apple.mobilesafari"); time.sleep(0.5)
        sim("openurl", device, origin + path)
        end = time.time() + 45
        while time.time() < end:
            for r in REPORTS:
                if r["tag"] == tag:
                    return r
            time.sleep(0.25)
        return None

    publish(a)
    load("/?t=warm#principle", "warm")
    for i in range(12):   # the worker, in control
        r = load(f"/?t=ctl{i}#principle", f"ctl{i}"); time.sleep(1)
        if r and r["controlled"]:
            break
    time.sleep(2)
    for page in ("/pages/brief.html", "/contact.html"):
        load(f"{page}#t=read{page.replace('/', '-').replace('.', '-')}", f"read{page.replace('/', '-').replace('.', '-')}")
    publish(b)
    for page, tag, sep in (("/", "a0", "?"), ("/ar/", "a1", "?"), ("/pages/brief.html", "a2", "#"), ("/contact.html", "a3", "#")):
        r = load(f"{page}{sep}t={tag}", tag)
        record("ios", r and r["build"] == new and r["styled"] and r["scripted"], page=page, report=r)
    r = load("/adii#t=a4", "a4")
    record("ios", r and r["path"] == "/adii/" and r["build"] == new, page="/adii, no trailing slash", report=r)
    c = Path(t) / "ios-c"; plain = Path(t) / "plain-c"   # the publish after that one, part way: its pages and worker, the last build's bytes
    newer = following(plain_next, plain); diagnosed(plain, c)
    publish(c, {f: b / f for f in CHANGED})
    load("/?t=w0", "w0"); time.sleep(8); load("/?t=w1", "w1"); time.sleep(4)
    publish(c)
    for page, tag, sep in (("/", "w2", "?"), ("/pages/brief.html", "w3", "#"), ("/", "w4", "?")):
        r = load(f"{page}{sep}t={tag}", tag)
        record("ios", r and r["build"] == newer and r["styled"] and r["scripted"], page=page, after="a publish part way", report=r)
    sim("terminate", device, "com.apple.mobilesafari"); sim("shutdown", device)
    httpd.shutdown()


with tempfile.TemporaryDirectory() as t:
    nxt = Path(t) / "next"; new = following(DIST, nxt)
    was = {"dir": DIST, "build": stamp(DIST)}
    httpd = ThreadingHTTPServer(("127.0.0.1", 0), Origin); httpd.daemon_threads = True; httpd.block_on_close = False
    threading.Thread(target=httpd.serve_forever, daemon=True).start()
    origin = f"http://127.0.0.1:{httpd.server_address[1]}"
    first(origin, was, new, nxt)
    anchor(origin, was, new, nxt)
    offline(origin, was, new, nxt)
    window(origin, was, new, nxt)
    if ARGS.older:
        upgrade(origin, Path(ARGS.older).resolve(), was, new, nxt)
    httpd.shutdown()
    if not ARGS.no_ios:
        ios(was, new, nxt, t, nxt)
(OUT / "return.json").write_text(json.dumps({"artifact_build": was["build"], "result": "PASS" if ok else "FAIL", "rows": rows}, indent=1, ensure_ascii=False), encoding="utf-8")
print(("PASS" if ok else "FAIL") + f": build {was['build']}, {len(rows)} rows, {sum(not r['pass'] for r in rows)} failed")
sys.exit(0 if ok else 1)
