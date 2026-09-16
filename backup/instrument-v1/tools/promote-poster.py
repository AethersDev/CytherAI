#!/usr/bin/env python3
"""promote-poster.py — encode the producer's terminal raster into the shipped PNG.

The pixels come from tools/promote-poster.js under jsc — the repository's own
substrate kernel, not a second renderer. This script is a lossless container step
and a receipt printer: it never computes a pixel. tools/test-poster.py decodes the
result and compares it back to the producer, so the encoder cannot become an
authority over the image.

Run twice; the output SHA-256 must be identical (fixed zlib level, filter 0, no
ancillary chunks — tools/pngout.py).
"""
import base64, hashlib, os, subprocess, sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from pngout import write_png

JSC = "/System/Library/Frameworks/JavaScriptCore.framework/Versions/A/Helpers/jsc"
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "assets/plate/surface-terminal.png")
ENCODER = "tools/pngout.py write_png(alpha=True) — PNG color type 6, 8-bit, filter 0 every row, zlib level 9, no ancillary chunks"


def produce(root=ROOT, manifest="js/manifest.js"):
    """(provenance dict, RGBA bytes) from the substrate kernel under jsc."""
    run = subprocess.run([JSC, os.path.join(root, manifest),
                          os.path.join(root, "js/substrate.js"),
                          os.path.join(ROOT, "tools/promote-poster.js")],
                         capture_output=True, text=True)
    if run.returncode != 0:
        raise SystemExit("producer failed: " + run.stderr.strip())
    import json
    prov, rgba = None, None
    for line in run.stdout.splitlines():
        if line.startswith("PROVENANCE "):
            prov = json.loads(line[len("PROVENANCE "):])
        elif line.startswith("RGBA "):
            rgba = base64.b64decode(line[len("RGBA "):])
    if prov is None or rgba is None:
        raise SystemExit("producer emitted no raster")
    if len(rgba) != prov["rgba_bytes"]:
        raise SystemExit("raster length disagrees with the provenance line")
    return prov, rgba


def main() -> int:
    prov, rgba = produce()
    w, h = (int(v) for v in prov["raster"].split("x"))
    write_png(OUT, w, h, [rgba[y * w * 4:(y + 1) * w * 4] for y in range(h)], alpha=True)
    png = open(OUT, "rb").read()
    print("PROMOTED  assets/plate/surface-terminal.png")
    for key in ("plate", "reference_frame", "raster", "bin_scale", "checksum", "epoch",
                "terminal_step", "deposits", "iterations", "max_density", "density_hash_fnv1a"):
        print(f"  {key:22s} {prov[key]}")
    print(f"  {'params':22s} {prov['params']}")
    print(f"  {'terminal RGBA sha256':22s} {hashlib.sha256(rgba).hexdigest()}")
    print(f"  {'poster asset sha256':22s} {hashlib.sha256(png).hexdigest()}")
    print(f"  {'bytes':22s} {len(png):,}")
    print(f"  {'encoder':22s} {ENCODER}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
