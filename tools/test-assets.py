#!/usr/bin/env python3
"""test-assets.py — every promoted asset matches its recorded receipt, and every
live DERIVED asset is bound to the manifest state it was derived from.

docs/asset-promotion-log.md records, per promoted asset, its outputs, byte
sizes, SHA-256 digests, and — for DERIVED assets — the canonical parameters and
state checksum it was produced from. The OG card and the icon family once had
receipts nobody re-read, so a manifest edit would have left them stale in silence.
A retired DERIVED asset (its outputs under backup/) is bound to the state it
records, not to today's: its derivation is history, and a later manifest edit
does not make it wrong.

The audit is one pure function over (log text, file bytes, CANON, CHECKSUM,
required paths) that returns defects; the harness runs it on the repository and
then on hostile mutations that must each produce a defect:

  D1  the repository's assets audit clean;
  D2  a one-byte change to an asset is a digest defect;
  D3  a valid image substituted for another is a digest defect;
  D4  a moved canonical state (CHECKSUM) makes every live DERIVED receipt stale, and no retired one;
  D5  moved canonical parameters (CANON) likewise, where the log writes them;
  D6  an output dropped from a receipt is a coverage defect (the manifest still names it);
  D7  a malformed digest, a duplicated receipt and a receipt whose digest row is gone each fail closed;
  D8  every served file under assets/ and film/, the icon, and every icon and card the web manifest
      and the served pages name, has a receipt.

A js/manifest.js file digest a DERIVED entry records is provenance of the reading,
not a derivation input — the asset depends on CANON and the state checksum, which
are bound here — so an edit to js/manifest.js that leaves both alone stales nothing.

Run: python3 tools/test-assets.py   ·   exit nonzero on any failure.
"""
import hashlib, json, os, re, sys
from html.parser import HTMLParser
from urllib.parse import urljoin, urlsplit

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(ROOT, "tools"))
from canon import canon_from_source
LOG = os.path.join(ROOT, "docs/asset-promotion-log.md")
SHA = re.compile(r"\b[0-9a-f]{64}\b")
fails = []
def check(cond, name):
    print(("PASS  " if cond else "FAIL  ") + name)
    if not cond: fails.append(name)


def receipts(log):
    """[{name, classification, outputs: {path: sha}, sizes: {path: n}, canon, checksum}] per '## ' section with an
    Output(s) or a SHA-256 row; a section with outputs and no digest row is a receipt with no digests (a defect)."""
    out = []
    for sec in log.split("\n## ")[1:]:
        rows = dict(re.findall(r"^\| ([^|]+?) \| (.*?) \|$", sec, re.M))
        if not {"SHA-256", "Output", "Outputs"} & rows.keys(): continue
        rows.setdefault("SHA-256", "")
        paths = re.findall(r"`((?:[\w.-]+/)*[\w-]+\.(?:png|svg|jpg|mp4))`", rows.get("Output", rows.get("Outputs", "")))
        # bare names in an Outputs row (`icon-192.png`) live beside the previous full path
        resolved, last_dir = [], ""
        for p in paths:
            if "/" in p: last_dir = p.rsplit("/", 1)[0] + "/"
            elif last_dir and p.startswith("icon-"): p = last_dir + p
            resolved.append(p)
        shas = SHA.findall(rows["SHA-256"])
        labels = re.findall(r"([\w.-]+) `[0-9a-f]{64}`", rows["SHA-256"])
        outputs = {}
        if len(resolved) == 1 and len(shas) == 1: outputs[resolved[0]] = shas[0]
        else:
            for label, sha in zip(labels, shas):
                matches = [p for p in resolved if p.endswith("/" + label) or p.endswith("." + label) or p.endswith("-%s.png" % label)]
                outputs[matches[0] if len(matches) == 1 else "?" + label] = sha
        sizes = {p: int(m.group(1).replace(",", "")) for p in resolved
                 for m in [re.search(re.escape(p.rsplit("/", 1)[-1]) + r"`[^|]*?· ([\d,]+) bytes", rows.get("Output", rows.get("Outputs", "")))] if m}
        canon = re.search(r"CANON = \[([^\]]+)\]", rows.get("Canonical inputs", ""))
        checksum = re.search(r"checksum `([0-9A-F]{4}:[0-9A-F]{4})`", rows.get("Canonical inputs", ""))
        out.append({"name": sec.split("\n", 1)[0].strip(), "classification": "DERIVED" if "**DERIVED**" in rows.get("Classification", "") else "ILLUSTRATIVE",
                    "outputs": outputs, "sizes": sizes, "raw_sha_row": rows["SHA-256"],
                    "canon": [float(v) for v in canon.group(1).split(",")] if canon else None, "checksum": checksum.group(1) if checksum else None})
    return out


def audit(log, files, canon, checksum, required):
    """Defects in the receipts against the bytes and the canonical state; empty means clean."""
    defects, covered, names = [], set(), []
    for r in receipts(log):
        if r["name"] in names: defects.append("%s: duplicated receipt" % r["name"])
        names.append(r["name"])
        if len(SHA.findall(r["raw_sha_row"])) != len(re.findall(r"`[^`]+`", r["raw_sha_row"])):
            defects.append("%s: a digest in the SHA-256 row is not a sha256" % r["name"])
        if not r["outputs"]: defects.append("%s: names no output, or records no digest for it" % r["name"])
        for path, sha in r["outputs"].items():
            covered.add(path)
            if path not in files: defects.append("%s: %s missing" % (r["name"], path)); continue
            if hashlib.sha256(files[path]).hexdigest() != sha: defects.append("%s: %s digest ≠ receipt" % (r["name"], path))
            if path in r["sizes"] and len(files[path]) != r["sizes"][path]: defects.append("%s: %s size ≠ receipt" % (r["name"], path))
        if r["classification"] == "DERIVED":
            retired = all(path.startswith("backup/") for path in r["outputs"])   # bound to the state it records
            if r["checksum"] is None: defects.append("%s: DERIVED without a state checksum" % r["name"])
            elif r["checksum"] != checksum and not retired: defects.append("%s: derived from state %s, current state is %s" % (r["name"], r["checksum"], checksum))
            if r["canon"] is not None and not retired and any(abs(a - b) > 1e-9 for a, b in zip(r["canon"], canon)): defects.append("%s: derived from other canonical parameters" % r["name"])
    for path in required:
        if path not in covered: defects.append("%s is named by the manifest or a page but has no receipt" % path)
    return defects


log = open(LOG, encoding="utf-8").read()
paths = sorted({p for r in receipts(log) for p in r["outputs"]})
files = {p: open(os.path.join(ROOT, p), "rb").read() for p in paths if os.path.isfile(os.path.join(ROOT, p))}
CANON, _, CHECKSUM = canon_from_source()
served = [line.strip() for line in open(os.path.join(ROOT, "deploy.paths"), encoding="utf-8") if line.strip()]
required = {p for p in served if p.startswith(("assets/", "film/")) or p == "icon.svg"}
required |= {i["src"] for i in json.load(open(os.path.join(ROOT, "manifest.webmanifest")))["icons"]}
class Named(HTMLParser):
    """the icons and cards a page names, resolved as a browser resolves them"""
    def __init__(self, page):
        super().__init__(); self.base, self.found = "https://cytherai.com/" + page, set()
    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        url = a.get("href") if tag == "link" and set((a.get("rel") or "").split()) & {"icon", "apple-touch-icon"} else \
            a.get("content") if tag == "meta" and a.get("property") == "og:image" else None
        if url: self.found.add(urlsplit(urljoin(self.base, url)).path.lstrip("/"))
for page in (p for p in served if p.endswith(".html") and not p.startswith(("adii/", "awc-os/"))):   # the project pages ship their reviewed set (tools/test-site.py)
    named = Named(page); named.feed(open(os.path.join(ROOT, page), encoding="utf-8").read())
    required |= named.found

d = audit(log, files, CANON, CHECKSUM, required)
check(not d, "D1 every promoted asset matches its receipt and every DERIVED asset is bound to %s (%d receipts, %d files)%s" % (CHECKSUM, len(receipts(log)), len(paths), "" if not d else " — " + "; ".join(d)))
mut = dict(files); og = "assets/og/og-card.png"; mut[og] = files[og][:-1] + bytes([files[og][-1] ^ 1])
check(any("og-card.png digest" in x for x in audit(log, mut, CANON, CHECKSUM, required)), "D2 a one-byte change to the OG card is a digest defect")
mut = dict(files); mut[og] = files["assets/icons/icon-512.png"]
check(any("og-card.png digest" in x for x in audit(log, mut, CANON, CHECKSUM, required)), "D3 a valid image substituted for the OG card is a digest defect")
# a live DERIVED receipt, made from the retired card's (its bytes at a served path), for D4 and D5 to move
v1 = "\n## " + next(s for s in log.split("\n## ") if s.startswith("OG-CARD-V1"))
live = v1.replace("OG-CARD-V1", "LIVE-DERIVED").replace("backup/og-card-v1/og-card.png", "assets/og/live-derived.png")
lfiles = dict(files, **{"assets/og/live-derived.png": files["backup/og-card-v1/og-card.png"]})
d = audit(log + live, lfiles, CANON, "0000:0000", required)
check(live != v1 and [x for x in d if "current state is 0000:0000" in x] == ["LIVE-DERIVED — the derived link-preview plate, retired: derived from state 75D1:89D1, current state is 0000:0000"],
      "D4 a moved canonical state stales the live DERIVED receipt and none of the %d retired ones" % sum(r["classification"] == "DERIVED" for r in receipts(log)))
d = audit(log + live, lfiles, [c + 1e-3 for c in CANON], CHECKSUM, required)
check([x for x in d if "other canonical parameters" in x] == ["LIVE-DERIVED — the derived link-preview plate, retired: derived from other canonical parameters"],
      "D5 moved canonical parameters stale the live receipt that writes them, and no retired one")
dropped = log.replace(" · 192 `5b35146f6a916a44285c8f1068c2e8fe5c1c5b16474d76ab4736ab5e7f630469`", "")
check(dropped != log and any("icon-192.png is named" in x for x in audit(dropped, files, CANON, CHECKSUM, required)), "D6 an output dropped from the icon receipt is a coverage defect")
bad = log.replace("bd59c137b1c5eb29bacf9347b149f73a703079c2b61d96233b6c418953ab1d9d", "not-a-digest")
dup = log + "\n## OG-CARD — the link-preview plate\n\n| SHA-256 | `bd59c137b1c5eb29bacf9347b149f73a703079c2b61d96233b6c418953ab1d9d` |\n| Output | `assets/og/og-card.png` |\n"
undigested = log.replace("\n| SHA-256 | `ff344466b0cfb4c48c8326144e4687012bc9b83d25165c0736316feb85c72149` |", "", 1)   # EXHIBIT-B keeps its Output row, loses its digest row
check(any("not a sha256" in x for x in audit(bad, files, CANON, CHECKSUM, required)) and any("duplicated" in x for x in audit(dup, files, CANON, CHECKSUM, required))
      and undigested != log and any("EXHIBIT-B" in x and "no digest" in x for x in audit(undigested, files, CANON, CHECKSUM, required)),
      "D7 a malformed digest, a duplicated receipt and a receipt with no digest row each fail closed")
check(required <= set(paths), "D8 every icon and card the manifest and pages name has a receipt: %s" % ", ".join(sorted(required)))

print()
if fails:
    print("DERIVED ASSET RECEIPTS: %d FAILURE(S)" % len(fails)); sys.exit(1)
print("DERIVED ASSET RECEIPTS: all pass")
