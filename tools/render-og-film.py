#!/usr/bin/env python3
"""render-og-film.py — the link-preview card: the film's final frame with its statement.

Classification: ILLUSTRATIVE. The composition is tools/og-card.html: film/final-landscape.jpg (the last frame of the
front door's film, a conceptual visualization), the darkening the front door sets behind its statement, the wordmark
and the statement in the front door's own type. Headless Chrome renders it at 1200×630, device scale 1, served from
the repository root by a local server on 127.0.0.1 (fonts and the frame are same-origin there), and writes
assets/og/og-card.png. The pages' og:image:alt states what it shows and that it is a conceptual visualization.

`render-og-film.py ar` renders the Arabic card the same way: tools/og-card-ar.html to assets/og/og-card-ar.png; `flat` and
`flat-ar` Both looked flat's (tools/og-card-flat.html, tools/og-card-flat-ar.html), a still of its sequence with its title,
to assets/og/og-card-flat.png and assets/og/og-card-flat-ar.png.

Run twice; the output SHA-256 must be identical (same Chrome, same machine): the script prints the digest, size and
the Chrome version, the inputs of the receipt in docs/asset-promotion-log.md. Exits nonzero if Chrome fails or the
output is not a 1200×630 PNG.
"""
import hashlib, http.server, os, struct, subprocess, sys, tempfile, threading
from functools import partial

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CARDS = {"": "og-card", "ar": "og-card-ar", "flat": "og-card-flat", "flat-ar": "og-card-flat-ar"}
if len(sys.argv) > 2 or "".join(sys.argv[1:]) not in CARDS:   # a typo must not render the English card
    sys.exit("usage: render-og-film.py [ar|flat|flat-ar]")
CARD = CARDS["".join(sys.argv[1:])]
OUT = os.path.join(ROOT, "assets/og/%s.png" % CARD)
CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"

class Quiet(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a): pass

srv = http.server.ThreadingHTTPServer(("127.0.0.1", 0), partial(Quiet, directory=ROOT))
threading.Thread(target=srv.serve_forever, daemon=True).start()
url = "http://127.0.0.1:%d/tools/%s.html" % (srv.server_address[1], CARD)
with tempfile.TemporaryDirectory() as profile:
    shot = os.path.join(profile, "card.png")   # not OUT: the tracked card exists already, so its presence proves nothing
    run = subprocess.run([CHROME, "--headless=new", "--user-data-dir=" + profile, "--hide-scrollbars", "--force-device-scale-factor=1",
                          "--window-size=1200,630", "--virtual-time-budget=6000", "--screenshot=" + shot, url], capture_output=True, text=True)
    srv.shutdown()
    if run.returncode != 0 or not os.path.isfile(shot): sys.exit("chrome failed: " + run.stderr[-400:])
    data = open(shot, "rb").read()
    w, h = struct.unpack(">II", data[16:24])
    if data[:8] != b"\x89PNG\r\n\x1a\n" or (w, h) != (1200, 630): sys.exit("not a 1200x630 PNG: %dx%d" % (w, h))
    os.replace(shot, OUT)
version = subprocess.run([CHROME, "--version"], capture_output=True, text=True).stdout.strip()
print(os.path.relpath(OUT, ROOT) + "  %dx%d  %s bytes  sha256 %s  (%s)" % (w, h, format(len(data), ","), hashlib.sha256(data).hexdigest(), version))
