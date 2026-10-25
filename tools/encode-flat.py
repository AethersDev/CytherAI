#!/usr/bin/env python3
"""The sequence and stills of Both looked flat, from the frames tools/render-flat.py wrote (one folder per orientation):

    python3 tools/encode-flat.py <landscape-frames> <portrait-frames> <fps> <plates>

Each orientation's frames f0001.png.. become H.264 at their own rate, a keyframe every second so every seek the scroll asks
for is short, faststart; each still (js/flat.js STILLS: its name and the second it shows) is the frame at that second, the
last frame for a second past the end. The instrument's plates (render-flat.py plates) become plate-<reflectance>.jpg at a
high quality, since the page blends them pixel by pixel, beside their plate.json. Writes flat/media/flat-<orientation>.mp4,
still-<name>-<orientation>.jpg and the plates; stdlib and ffmpeg."""
import json, re, shutil, subprocess, sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "flat/media"
JS = (ROOT / "js/flat.js").read_text(encoding="utf-8")
STILLS = [(name, float(sec)) for name, sec in re.findall(r'"(\w+)", ([\d.]+)\]', re.search(r"const STILLS = (\[.*?\]);", JS).group(1))]
FRAMES, FPS, PLATES = {"landscape": Path(sys.argv[1]), "portrait": Path(sys.argv[2])}, int(sys.argv[3]), Path(sys.argv[4])

for orient, folder in FRAMES.items():
    count = len(list(folder.glob("f*.png")))
    if not count or not (folder / ("f%04d.png" % count)).exists():
        raise SystemExit("%s: frames f0001..f%04d are not all there" % (folder, count))
    out = OUT / ("flat-%s.mp4" % orient)
    subprocess.run(["ffmpeg", "-loglevel", "error", "-y", "-framerate", str(FPS), "-i", str(folder / "f%04d.png"),
                    "-c:v", "libx264", "-preset", "veryslow", "-tune", "film", "-crf", "23", "-g", str(FPS), "-keyint_min", str(FPS),
                    "-sc_threshold", "0", "-pix_fmt", "yuv420p", "-movflags", "+faststart", "-an", str(out)], check=True)
    print("ENCODED", out.relative_to(ROOT), out.stat().st_size, "bytes,", count, "frames")
    for name, sec in STILLS:
        src = folder / ("f%04d.png" % min(count, round(sec * FPS) + 1))
        still = OUT / ("still-%s-%s.jpg" % (name, orient))
        subprocess.run(["ffmpeg", "-loglevel", "error", "-y", "-i", str(src), "-q:v", "3", str(still)], check=True)
        print("STILL", still.relative_to(ROOT), still.stat().st_size, "bytes from", src.name)

plates = json.loads((PLATES / "plate.json").read_text())
for n in plates["plates"]:
    src, dst = PLATES / ("plate-%03d.png" % n), OUT / ("plate-%03d.jpg" % n)
    subprocess.run(["ffmpeg", "-loglevel", "error", "-y", "-i", str(src), "-q:v", "2", str(dst)], check=True)
    print("PLATE", dst.relative_to(ROOT), dst.stat().st_size, "bytes")
shutil.copyfile(PLATES / "plate.json", OUT / "plate.json")
print("PLATES", (OUT / "plate.json").relative_to(ROOT))
