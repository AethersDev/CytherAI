#!/usr/bin/env python3
"""vaic_record.py — the one way an observation of the stamped candidate enters the record: its entry in the evidence ledger and its
receipt in the corpus, append only, each new observation carrying forward its predecessor's surface, method and bound. The browser
probes' results enter by this command; the live origin's by tools/probe-origin.py --record, which calls origin() here.

    python3 tools/vaic_record.py <ink.json> <settle.json> "<what this build changed, for the record>"

<ink.json> and <settle.json> are what tools/probe-ink.py and tools/probe-settle.py wrote for the candidate. Each must be a PASS of it.

What a result says of its own run is what is recorded (the audit of 2026-11-24): the digest of the probe that ran, the day it ran and
the machine it ran on, written by the probe as it ran. Until then this command hashed the probe on disk when the result was
imported, took the day from its command line and the operating system from the machine that imported, so a result imported later,
elsewhere, or after an edit to the probe was recorded under a probe, a day or a machine that did not produce it. Every refusal is a
raise, never an assert, which python -O drops.

One append is whole, or can be made whole by running it again (record): one writer at a time, each file staged beside itself before
any is put in place, and what is already recorded is passed over where it is the same and refused where it differs. Until then an
interruption between two files left an observation the next run refused to complete.

Until 2026-11-07 this was a script in a session's scratchpad, and it went when the scratchpad did."""
import contextlib, copy, fcntl, json, os, re, sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
LEDGER, CORPUS = "vaic/evidence/current-browser-observations.v0.json", "vaic/cytherai-obligations.v3.json"
ORIGIN_METHOD = "every deploy.paths file over http (expect 301 to the same https path) and over https with a cache-busting query (sha256 against the local deploy.sh build of the admitted commit); / against index.html; the declared hidden paths (404 with the styled body); MIME; a byte range of every MP4 shipped, its interval, total and bytes against the artifact's; the worker generation; TLS; the www host; headers on the root; the referrer meta on every page as served"
ORIGIN_MEASUREMENT = "every served path of the artifact over http (301 to the same https path) and https (sha256 against deploy.sh's build, cache-busted); the declared hidden paths; MIME, a byte range of every MP4 shipped, worker generation, TLS, the www host; headers against the contract as amended in §7"


def refuse(why):
    raise SystemExit(f"nothing recorded: {why}")


@contextlib.contextmanager
def record(root):
    """The ledger and the corpus, held for one append: (ledger, corpus, texts), to be changed in place; texts takes any other file the
    append rewrites (path -> text). On leaving, every file is staged beside itself, then each is put in place. A refusal inside leaves
    all as it was. The lock is on vaic/ itself, which no append replaces: a second writer waits, then reads what the first left."""
    lock = os.open(root / "vaic", os.O_RDONLY)
    try:
        fcntl.flock(lock, fcntl.LOCK_EX)
        ledger, corpus = (json.loads((root / path).read_text(encoding="utf-8")) for path in (LEDGER, CORPUS))
        texts = {}
        yield ledger, corpus, texts
        staged = {root / path: json.dumps(data, indent=2, ensure_ascii=False) + "\n" for path, data in ((LEDGER, ledger), (CORPUS, corpus))} | texts
        for path, text in staged.items():
            path.with_name(path.name + ".staged").write_text(text, encoding="utf-8")
        for path in staged:
            os.replace(path.with_name(path.name + ".staged"), path)
    finally:
        os.close(lock)


def observe(ledger, name, observation):
    """An observation enters once. The same one again is a retry finishing its work; another under its name is not recorded over it."""
    if ledger["observations"].get(name, observation) != observation:
        refuse(f"{name} is already recorded, and not as this run would record it; an admitted observation is never rewritten")
    ledger["observations"][name] = observation


def receive(row, receipt):
    held = [r for r in row["evaluation"]["receipts"] if r["evidence"] == receipt["evidence"]]
    if held not in ([], [receipt]):
        refuse(f"{row['id']} already holds a receipt for {receipt['evidence'][0]}, and not this one")
    if not held:
        row["evaluation"]["receipts"].append(receipt)
    row["evaluation"]["result"] = "PASS"


def stamped(corpus, results):
    """The candidate the record is stamped for, which every result must be a PASS of, saying what its probe says of its own run."""
    candidate = corpus["candidate"]
    for probe, result, *more in results:
        missing = [k for k in ("artifact_build", "result", "harness_version", "observed_at", *more) if not result.get(k)]
        if missing: refuse(f"{probe}'s result does not say its {', '.join(missing)}: it is an older probe's, or not that probe's result")
        if result["artifact_build"] != candidate["build_identity"]:
            refuse(f"{probe} observed build {result['artifact_build']}, the corpus is stamped for {candidate['build_identity']}")
        if result["result"] != "PASS": refuse(f"{probe}'s result is {result['result']}")
    return candidate


def browser(root, ink, settle, history):
    """The reading ink (CY-SEM-003) and the settled state (CY-TEMP-001), as tools/probe-ink.py and tools/probe-settle.py observed them."""
    with record(root) as (ledger, corpus, _):
        candidate = stamped(corpus, (("tools/probe-ink.py", ink, "chrome", "host"), ("tools/probe-settle.py", settle, "chrome", "host")))
        build = candidate["build_identity"]; ink_name, settle_name = f"reading_ink_{build}", f"film_settle_{build}"
        runtime = lambda r: f"Headless {r['chrome']} ({r['host']}) driven over the Chrome DevTools Protocol, against dist/ served as an origin root by the probe's own static server, which answers byte ranges"
        latest = lambda prefix, but: next(ledger["observations"][k] for k in reversed(list(ledger["observations"])) if k.startswith(prefix) and k != but)
        harness = lambda last, r: re.sub(r"sha256 [0-9a-f]+", f"sha256 {r['harness_version']}", last["harness"], count=1)
        profiles = {k: v for k, v in ink.items() if " · " in k}
        samples = sum(p["elements_measured"] for p in profiles.values()); worst = min(p["worst"]["min"] for p in profiles.values())
        last = latest("reading_ink_", ink_name)
        # Describe the seconds that actually ran. A new film can outlast its predecessor.
        film_seconds = [k[1:] for k in next(iter(profiles.values()))["samples"] if k.startswith("t")]
        observe(ledger, ink_name, {
            **{k: last[k] for k in ("surface", "method", "samples", "bound", "domain")},
            "surface": "Nightfall, its HTML statement, links, header, note and Replay, followed by the systems passage, close and footer on the English and Arabic homepages.",
            "samples": "film seconds " + ", ".join(film_seconds) + "; " + last["samples"].split("; ", 1)[1],
            "method": "Chrome holds playback at each requested film second and confirms the seek within 0.05 s. The probe samples the statement, the final still, each passage caption at its midpoint and the close. Paired transparent and magenta glyph captures identify the ground beneath the text for the WCAG contrast measurement.",
            "artifact_build": build, "observed_at": ink["observed_at"], "runtime": runtime(ink), "harness": harness(last, ink),
            "result": "PASS", "elements_measured": samples, "worst_min": worst, "history": history,
            "profiles": {k: {"elements_measured": p["elements_measured"], "below_4_5": p["below_4_5"], "worst": p["worst"]} for k, p in profiles.items()}})
        last = latest("film_settle_", settle_name)
        observe(ledger, settle_name, {
            **{k: last[k] for k in ("surface", "method", "bound")},
            "artifact_build": build, "build_identity": build, "observed_at": settle["observed_at"], "runtime": runtime(settle), "harness": harness(last, settle),
            "result": "PASS", "history": history,
            "profiles": {p + " · " + k: v for p in ("/", "/ar/") for k, v in settle[p].items() if k != "worker"},
            "worker": {p: settle[p]["worker"] for p in ("/", "/ar/")}})
        if build not in ledger["artifact_builds"]: ledger["artifact_builds"].append(build)
        BIND = {k: candidate[k] for k in ("artifact_manifest_hash", "record_hash", "grammar_hash", "policy_hash")}
        for oid, name, path, result, method in (
            ("CY-SEM-003", ink_name, "tools/probe-ink.py", ink, lambda m: {
                "measurement": f"WCAG contrast of each measured reading element at glyph support across {len(film_seconds)} film times, the still, eight passage captions and the close on both homepages in both theme settings; {samples} element samples",
                "threshold": f"minimum ≥ 4.5:1 at every glyph-support pixel; observed worst {worst}:1", "units": m["units"]}),
            ("CY-TEMP-001", settle_name, "tools/probe-settle.py", settle, lambda m: m)):
            row = next(r for r in corpus["obligations"] if r["id"] == oid)
            receipt = copy.deepcopy(row["evaluation"]["receipts"][-1])     # the obligation's last receipt, re-bound to this observation
            if receipt["harness_identity"] != path or receipt["verification_identity"] != "EXTERNAL":
                refuse(f"{oid}'s last receipt is not {path}'s, so there is none to carry forward")
            receipt.update(BIND); receipt.update(artifact_build=build, harness_version=result["harness_version"], observed_at=result["observed_at"], result="PASS",
                                                 method=method(receipt["method"]), evidence=[f"{LEDGER}#{name}"])
            receipt["environment"]["runtime"] = runtime(result)
            receive(row, receipt)
    return ink_name, settle_name, f"{samples} samples, worst {worst}"


def origin(root, o):
    """The live origin (CY-ORIGIN-001), as tools/probe-origin.py observed it, and its line in the build's record in docs/deploy.md."""
    with record(root) as (ledger, corpus, texts):
        cand = stamped(corpus, (("tools/probe-origin.py", o, "curl", "origin"),))
        name, n = f"origin_closure_{o['artifact_build']}", o["closure"]["served_files"]
        runtime = f"curl {o['curl']} (system trust store), against {o['origin'].split()[0]}"
        observe(ledger, name, {
            "artifact_build": o["artifact_build"], "observed_at": o["observed_at"], "origin": o["origin"],
            "harness": f"tools/probe-origin.py (sha256 {o['harness_version']}…): {runtime}",
            "contract": "docs/deploy.md §1–§4 as amended by the owner's acceptance of GitHub Pages' limits (§7; vaic/release-dispositions.v0.json, CY-ORIGIN-001)",
            "method": ORIGIN_METHOD,
            "result": "PASS", **{k: o[k] for k in ("closure", "hidden_paths", "styled_404_body", "mime", "byte_ranges", "worker_cache", "tls", "www",
                                                    "headers_on_root", "referrer_meta_pages")},
            "headers_note": "the absences are the limits accepted in §7; Referrer-Policy is carried by every page instead"})
        receive(next(r for r in corpus["obligations"] if r["id"] == "CY-ORIGIN-001"), {
            "evaluator": "ORIGIN_HARNESS", "coverage": "EXHAUSTIVE", "artifact_build": o["artifact_build"],
            **{k: cand[k] for k in ("artifact_manifest_hash", "record_hash", "grammar_hash", "policy_hash")},
            "verification_identity": "EXTERNAL",
            "environment": {"capability_profile": "production_origin", "device": "local_host", "viewport": None, "runtime": runtime,
                            "accessibility_mode": None},
            "harness_identity": "tools/probe-origin.py", "harness_version": o["harness_version"],
            "method": {"measurement": ORIGIN_MEASUREMENT,
                       "threshold": f"{n} of {n} redirect and match; every hidden path 404 with the styled body; every MP4 answers a byte range with the artifact's bytes; no header beyond the accepted limits missing",
                       "units": "paths"},
            "result": "PASS", "evidence": [f"{LEDGER}#{name}"], "observed_at": o["observed_at"]})
        doc = (root / "docs/deploy.md").read_text(encoding="utf-8")
        line = f"\nThe live origin: CY-ORIGIN-001 PASS (`#{name}`), {n} of {n} served paths matching the artifact.\n"
        at = doc.find(f"Build `{o['artifact_build']}`")   # the build's own record; the origin line closes it
        end = doc.find("\n## ", at)
        if at < 0 or end < 0: refuse(f"docs/deploy.md has no build record naming {o['artifact_build']}")
        if line not in doc: texts[root / "docs/deploy.md"] = doc[:end] + line + doc[end:]
    return name


if __name__ == "__main__":
    if len(sys.argv) != 4: sys.exit(__doc__)
    ink, settle = (json.loads(Path(path).read_text(encoding="utf-8")) for path in sys.argv[1:3])
    print("recorded", *browser(ROOT, ink, settle, sys.argv[3]))
