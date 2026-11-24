#!/usr/bin/env python3
"""render-og-film.py — the link-preview cards the site renders itself: the Arabic card and Both looked flat's two.

Classification: ILLUSTRATIVE. `render-og-film.py ar` renders tools/og-card-ar.html: since 2026-11-24 the identity kit's English
card with its line in Arabic (the kit's rendering of the mark as STANDARD No. 001 with nothing drawn on it,
tools/og-plate-standard-001.jpg; the name; the line in the site's Arabic type), and until then the film's last frame with the front
door's statement (backup/nightfall-card-v1/). Headless Chrome renders it at 1200×630, device scale 1, served from the repository
root by a local server on 127.0.0.1 (the font, the logo and the plate are same-origin there), and writes assets/og/og-card-ar.jpg,
through sips: link previews are commonly reported to drop an image over about 300 KB (the audit of 2026-11-05), and as a PNG the
film's frame was 612 KB. The pages' og:image:alt states what it shows and that it is a design, not a manufactured object. `flat` and `flat-ar` render
Both looked flat's (tools/og-card-flat.html, tools/og-card-flat-ar.html), a still of its sequence with its title, to
assets/og/og-card-flat.png and assets/og/og-card-flat-ar.png, which stay PNGs: they are dark, and under that size.

The English card, assets/og/og-card.jpg, is not rendered here since 2026-11-23: it is the identity kit's Open Graph image, copied
byte for byte (docs/asset-promotion-log.md, IMG-031); the composition that rendered it until then is
backup/nightfall-card-v1/tools/og-card.html.

Run twice; the output SHA-256 must be identical (same Chrome, same machine): the script prints the digest, size and
the Chrome version, the inputs of the receipt in docs/asset-promotion-log.md. Exits nonzero, the card it would have replaced
left as it was, if Chrome or sips fails, if Chrome's output is not a 1200×630 PNG, or if a file the composition names is not in
the tree or was not served to the page: until the audit of 2026-11-24 a composition with its picture missing rendered all the
same, the right size, and this script reported success (the Arabic card without its plate: 33,842 bytes for 74,718).
"""
import hashlib, http.server, os, re, struct, subprocess, sys, tempfile, threading
from functools import partial

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CARDS = {"ar": "og-card-ar", "flat": "og-card-flat", "flat-ar": "og-card-flat-ar"}
if len(sys.argv) != 2 or sys.argv[1] not in CARDS:   # no default: the English card is the identity kit's, and is not rendered here
    sys.exit("usage: render-og-film.py ar|flat|flat-ar")
CARD = CARDS["".join(sys.argv[1:])]
OUT = os.path.join(ROOT, "assets/og/%s.%s" % (CARD, "png" if "flat" in CARD else "jpg"))
CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
PAGE = "tools/%s.html" % CARD
# what the composition draws with: every file its stylesheet and its markup name
INPUTS = sorted({os.path.normpath(os.path.join("tools", u)) for u in re.findall(r'(?:url\(|src=")([^)"#]+)', open(os.path.join(ROOT, PAGE), encoding="utf-8").read())})
absent = [p for p in INPUTS if not os.path.isfile(os.path.join(ROOT, p))]
if absent: sys.exit("%s names what is not in the tree: %s" % (PAGE, ", ".join(absent)))
ANSWERED = {}   # path -> the status the page was answered with

class Quiet(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a): pass
    def log_request(self, code="-", size="-"): ANSWERED[self.path.split("?")[0].lstrip("/")] = int(code)

srv = http.server.ThreadingHTTPServer(("127.0.0.1", 0), partial(Quiet, directory=ROOT))
threading.Thread(target=srv.serve_forever, daemon=True).start()
url = "http://127.0.0.1:%d/%s" % (srv.server_address[1], PAGE)
with tempfile.TemporaryDirectory() as profile:
    shot = os.path.join(profile, "card.png")   # not OUT: the tracked card exists already, so its presence proves nothing
    run = subprocess.run([CHROME, "--headless=new", "--user-data-dir=" + profile, "--hide-scrollbars", "--force-device-scale-factor=1",
                          "--window-size=1200,630", "--virtual-time-budget=6000", "--screenshot=" + shot, url], capture_output=True, text=True)
    srv.shutdown()
    if run.returncode != 0 or not os.path.isfile(shot): sys.exit("chrome failed: " + run.stderr[-400:])
    # a font no glyph on the card needs is the browser's not to fetch; everything else it names must have reached the page
    unloaded = [p for p in [PAGE] + INPUTS if ANSWERED.get(p, 200) != 200] + [p for p in INPUTS if p not in ANSWERED and not p.endswith(".woff2")]
    if unloaded: sys.exit("the composition did not load: " + ", ".join(unloaded))
    data = open(shot, "rb").read()
    w, h = struct.unpack(">II", data[16:24])
    if data[:8] != b"\x89PNG\r\n\x1a\n" or (w, h) != (1200, 630): sys.exit("not a 1200x630 PNG: %dx%d" % (w, h))
    if OUT.endswith(".jpg"):
        png, shot = shot, os.path.join(profile, "card.jpg")
        run = subprocess.run(["sips", "-s", "format", "jpeg", "-s", "formatOptions", "88", png, "--out", shot], capture_output=True, text=True)
        if run.returncode != 0 or not os.path.isfile(shot): sys.exit("sips failed: " + run.stderr[-400:])
        data = open(shot, "rb").read()
    os.replace(shot, OUT)
version = subprocess.run([CHROME, "--version"], capture_output=True, text=True).stdout.strip()
print(os.path.relpath(OUT, ROOT) + "  %dx%d  %s bytes  sha256 %s  (%s)" % (w, h, format(len(data), ","), hashlib.sha256(data).hexdigest(), version))
