#!/usr/bin/env python3
"""render-og-film.py — the link-preview card: the film's final frame with its statement.

Classification: ILLUSTRATIVE. The composition is tools/og-card.html: film/final-landscape.jpg (the last frame of the
front door's film, a conceptual visualization), the darkening the front door sets behind its statement, the wordmark
and the statement in the front door's own type. Headless Chrome renders it at 1200×630, device scale 1, served from
the repository root by a local server on 127.0.0.1 (fonts and the frame are same-origin there), and writes
assets/og/og-card.png. The pages' og:image:alt states what it shows and that it is a conceptual visualization.

Run twice; the output SHA-256 must be identical (same Chrome, same machine): the script prints the digest, size and
the Chrome version, the inputs of the receipt in docs/asset-promotion-log.md. Exits nonzero if Chrome fails or the
output is not a 1200×630 PNG.
"""
import hashlib, http.server, os, struct, subprocess, sys, tempfile, threading
from functools import partial

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "assets/og/og-card.png")
CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"

class Quiet(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a): pass

srv = http.server.ThreadingHTTPServer(("127.0.0.1", 0), partial(Quiet, directory=ROOT))
threading.Thread(target=srv.serve_forever, daemon=True).start()
url = "http://127.0.0.1:%d/tools/og-card.html" % srv.server_address[1]
with tempfile.TemporaryDirectory() as profile:
    run = subprocess.run([CHROME, "--headless=new", "--user-data-dir=" + profile, "--hide-scrollbars", "--force-device-scale-factor=1",
                          "--window-size=1200,630", "--virtual-time-budget=6000", "--screenshot=" + OUT, url], capture_output=True, text=True)
srv.shutdown()
if run.returncode != 0 or not os.path.isfile(OUT): sys.exit("chrome failed: " + run.stderr[-400:])
data = open(OUT, "rb").read()
w, h = struct.unpack(">II", data[16:24])
if data[:8] != b"\x89PNG\r\n\x1a\n" or (w, h) != (1200, 630): sys.exit("not a 1200x630 PNG: %dx%d" % (w, h))
version = subprocess.run([CHROME, "--version"], capture_output=True, text=True).stdout.strip()
print("assets/og/og-card.png  %dx%d  %s bytes  sha256 %s  (%s)" % (w, h, format(len(data), ","), hashlib.sha256(data).hexdigest(), version))
