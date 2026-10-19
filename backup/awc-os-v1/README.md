# awc-os-v1 — the AWC-OS gateway as served until 2026-10-19

The Alinma plan was cancelled (the owner, 2026-10-19). What the site served of it is kept here, whole, as it was:

| Path | What it is |
|---|---|
| `index.html`, `awc-os.js` | The page and its script at commit `4d55f21` (build `B76DECC774B9AFBB`), before the 2026-10-18 audit's changes |
| `media/AWC_OS_film_en.mp4`, `media/AWC_OS_film_ar.mp4` | The films as published. From 01:06.8 to 01:11.3 each shows a closing line under *That's the constitution.*: "LIVE ON THIS PHONE · DESIGNED FOR PRODUCTION INSIDE ALINMA'S INFRASTRUCTURE — READY TO LEARN FROM FIVE MILLION CUSTOMERS" (in Arabic in the Arabic film) |
| `media/AWC_OS_AMAD2026_deck.pptx` | The competition deck (13 slides, the film embedded). Its slides 5 and 11 present the plan: the production version inside Alinma's infrastructure, an advisory pilot, then the bank's customer base |

The served films at `awc-os/media/` are these with that line masked (ffmpeg `delogo` over the line's whole path,
66.5–72 s; libx264 CRF 23, the audio stream copied unchanged; outside the masked window 53.4–60.4 dB PSNR against
these, measured 2026-10-19).
The deck and the page's link to the unmasked 4K film on YouTube were withdrawn; the YouTube video itself is the
owner's to change. Nothing here is served: `deploy.sh` and `tools/test-site.py` refuse `backup/`.
