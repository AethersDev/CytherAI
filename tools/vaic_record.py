#!/usr/bin/env python3
"""Append the stamped candidate's reading-ink and settle observations to the evidence ledger and their receipts to the corpus: the same
append-only shape tools/probe-origin.py --record writes, each new observation carrying forward its predecessor's surface, method and bound.
Until 2026-11-07 this was a script in a session's scratchpad, and it went when the scratchpad did.

    python3 tools/vaic_record.py <ink.json> <settle.json> <observed_at> "<what this build changed, for the record>"

<ink.json> and <settle.json> are what tools/probe-ink.py and tools/probe-settle.py wrote for the candidate. Each must be a PASS of it."""
import hashlib, json, platform, re, sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
ink, settle = (json.loads(Path(p).read_text(encoding="utf-8")) for p in sys.argv[1:3])
day, history = sys.argv[3:5]
LEDGER, CORPUS = ROOT / "vaic/evidence/current-browser-observations.v0.json", ROOT / "vaic/cytherai-obligations.v3.json"
ledger, corpus = json.loads(LEDGER.read_text(encoding="utf-8")), json.loads(CORPUS.read_text(encoding="utf-8"))
candidate = corpus["candidate"]; build = candidate["build_identity"]
assert ink["artifact_build"] == build == settle["artifact_build"], (ink["artifact_build"], settle["artifact_build"], build)
assert ink["result"] == "PASS" and settle["result"] == "PASS"
ink_name, settle_name = f"reading_ink_{build}", f"film_settle_{build}"
assert ink_name not in ledger["observations"] and settle_name not in ledger["observations"]


def version(path):
    return hashlib.sha256((ROOT / path).read_bytes()).hexdigest()[:12]


def runtime(chrome):
    return f"Headless {chrome} (macOS {platform.mac_ver()[0]}, Apple Silicon) driven over the Chrome DevTools Protocol, against dist/ served as an origin root by the probe's own static server, which answers byte ranges"


def latest(prefix):
    return next(ledger["observations"][k] for k in reversed(list(ledger["observations"])) if k.startswith(prefix))


def harness(last, path):
    return re.sub(r"sha256 [0-9a-f]+", f"sha256 {version(path)}", last["harness"], count=1)


profiles = {k: v for k, v in ink.items() if " · " in k}
samples = sum(p["elements_measured"] for p in profiles.values()); worst = min(p["worst"]["min"] for p in profiles.values())
last = latest("reading_ink_")
# Describe the seconds that actually ran. A new film can outlast its predecessor.
film_seconds = [k[1:] for k in next(iter(profiles.values()))["samples"] if k.startswith("t")]
ledger["observations"][ink_name] = {
    **{k: last[k] for k in ("surface", "method", "samples", "bound", "domain")},
    "surface": "Nightfall, its HTML statement, links, header, note and Replay, followed by the systems passage, close and footer on the English and Arabic homepages.",
    "samples": "film seconds " + ", ".join(film_seconds) + "; " + last["samples"].split("; ", 1)[1],
    "method": "Chrome holds playback at each requested film second and confirms the seek within 0.05 s. The probe samples the statement, the final still, each passage caption at its midpoint and the close. Paired transparent and magenta glyph captures identify the ground beneath the text for the WCAG contrast measurement.",
    "artifact_build": build, "observed_at": day, "runtime": runtime(ink["chrome"]), "harness": harness(last, "tools/probe-ink.py"),
    "result": "PASS", "elements_measured": samples, "worst_min": worst, "history": history,
    "profiles": {k: {"elements_measured": p["elements_measured"], "below_4_5": p["below_4_5"], "worst": p["worst"]} for k, p in profiles.items()}}
last = latest("film_settle_")
ledger["observations"][settle_name] = {
    **{k: last[k] for k in ("surface", "method", "bound")},
    "artifact_build": build, "build_identity": build, "observed_at": day, "runtime": runtime(settle["chrome"]), "harness": harness(last, "tools/probe-settle.py"),
    "result": "PASS", "history": history,
    "profiles": {p + " · " + k: v for p in ("/", "/ar/") for k, v in settle[p].items() if k != "worker"},
    "worker": {p: settle[p]["worker"] for p in ("/", "/ar/")}}
ledger["artifact_builds"].append(build)
BIND = {k: candidate[k] for k in ("artifact_manifest_hash", "record_hash", "grammar_hash", "policy_hash")}
for oid, name, path, chrome, method in (
    ("CY-SEM-003", ink_name, "tools/probe-ink.py", ink["chrome"], lambda m: {
        "measurement": f"WCAG contrast of each measured reading element at glyph support across {len(film_seconds)} film times, the still, eight passage captions and the close on both homepages in both theme settings; {samples} element samples",
        "threshold": f"minimum ≥ 4.5:1 at every glyph-support pixel; observed worst {worst}:1", "units": m["units"]}),
    ("CY-TEMP-001", settle_name, "tools/probe-settle.py", settle["chrome"], lambda m: m)):
    row = next(r for r in corpus["obligations"] if r["id"] == oid)
    receipt = json.loads(json.dumps(row["evaluation"]["receipts"][-1]))
    assert receipt["harness_identity"] == path and receipt["verification_identity"] == "EXTERNAL"
    receipt.update(BIND); receipt.update(artifact_build=build, harness_version=version(path), observed_at=day, result="PASS", method=method(receipt["method"]),
                                         evidence=[f"vaic/evidence/current-browser-observations.v0.json#{name}"])
    receipt["environment"]["runtime"] = runtime(chrome)
    row["evaluation"]["receipts"].append(receipt); row["evaluation"]["result"] = "PASS"
LEDGER.write_text(json.dumps(ledger, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
CORPUS.write_text(json.dumps(corpus, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
print("recorded", ink_name, settle_name, f"{samples} samples, worst {worst}")
