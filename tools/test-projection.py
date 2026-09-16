#!/usr/bin/env python3
"""test-projection.py — the manifest is the only authority for the facts the pages print.

P1  the committed pages equal their projection (tools/project-manifest.py --check);
P2  the validation display rows are the checksum-bearing identifiers, in order;
P3  every identifier is printed on both pages (a new record cannot be silently omitted);
P4  a projected value corrupted in a page is detected;
P5  an unknown projection name is refused, never written;
P6  a manifest edit moves every visible count it owns AND the canonical derivation —
    systems_indexed 6 → 7 changes 06 → 07 at every site and changes the checksum;
P7  no retired literal survives outside a marked element;
P8  CL-02 reads the same elements back at runtime (tools/test-projection.js under jsc);
P9  the floor's obligations block is the corpus's obligations — current, complete, citing
    every id a served module names, and carrying no verdict, receipt, digest or build.

Run: python3 tools/test-projection.py   ·   exit nonzero on any failure.
"""
import json, os, re, subprocess, sys, tempfile

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(ROOT, "tools"))
import importlib
PM = importlib.import_module("project-manifest")
JSC = "/System/Library/Frameworks/JavaScriptCore.framework/Versions/A/Helpers/jsc"
fails = []
def check(cond, name):
    print(("PASS  " if cond else "FAIL  ") + name)
    if not cond: fails.append(name)

pages = {p: open(os.path.join(ROOT, p), encoding="utf-8").read() for p in PM.PAGES}
names = {p: PM.names_in(s) for p, s in pages.items()}
values = PM.projections([n for ns in names.values() for n in ns])

# P1
check(all(PM.project(s, values) == s for s in pages.values()) and subprocess.run([sys.executable, os.path.join(ROOT, "tools/project-manifest.py"), "--check"], capture_output=True).returncode == 0,
      "P1 committed pages equal their projection (%d marked facts)" % sum(len(v) for v in names.values()))
# P2
check(values["__ids"] == values["__index"], "P2 VALIDATION rows are validation_index, in order: %s" % values["__index"])
# P3
for p in PM.PAGES:
    printed = {n.split(":")[1] for n in names[p] if n.startswith("validation:") and n.endswith(":cyther")}
    check(printed == set(values["__index"]), "P3 %s prints every validation identifier" % p)
# the set prints the sealed count (three sites) and leaves the indexed/disclosed counts to the
# brief — an editorial omission (owner, 2026-09-16), never a literal: what it prints, it projects
check(names["index.html"].count("count:controlled_references") >= 3 and not any(n.startswith("count:") and n != "count:controlled_references" for n in names["index.html"]),
      "P3 index.html prints the controlled-records count as a projection at every site, and no other count as a literal")
# P4
idx = pages["index.html"]
corrupt = idx.replace('data-m="count:controlled_references">03<', 'data-m="count:controlled_references">04<', 1)
check(corrupt != idx and PM.project(corrupt, values) == idx, "P4 a corrupted projected value is restored by projection — the check would report it stale")
# P5
bogus = idx.replace('data-m="count:controlled_references"', 'data-m="count:nonsense"', 1)
try:
    PM.project(bogus, values); refused = False
except ValueError:
    refused = True
check(refused, "P5 an unknown projection name is refused")
# P6
src = open(os.path.join(ROOT, "js/manifest.js"), encoding="utf-8").read()
assert src.count("controlled_references: 3,") == 1
with tempfile.NamedTemporaryFile("w", suffix=".js", delete=False, dir=os.path.join(ROOT, "tools"), prefix=".mut-") as f:
    f.write(src.replace("controlled_references: 3,", "controlled_references: 4,")); mut = f.name
try:
    mv = PM.projections(names["index.html"], mut)
finally:
    os.remove(mut)
projected = PM.project(idx, mv)
sites = [m for m in PM.MARK.finditer(projected) if m.group(3) == "count:controlled_references"]
check(mv["__checksum"] != values["__checksum"] and sites and all(m.group(4) == "04" for m in sites)
      and all(m.group(4) == "03" for m in PM.MARK.finditer(idx) if m.group(3) == "count:controlled_references")
      and mv["validation:T2C192-IR-0.00:cyther"] == values["validation:T2C192-IR-0.00:cyther"],
      "P6 controlled_references 3→4 moves the checksum (%s→%s) and every 03 site to 04, and nothing it does not own" % (values["__checksum"], mv["__checksum"]))
# P7
stripped = PM.MARK.sub(lambda m: m.group(1) + m.group(5), idx)
check(not re.search(r">0?3 ·|>03<|>0\.00%<|>10\.00%<|>0\.93%<|>(100|99|97|91)%<", stripped) and "IR 0.00% vs" not in stripped,
      "P7 no count or figure literal survives outside a marked element")
stripped_b = PM.MARK.sub(lambda m: m.group(1) + m.group(5), pages["pages/brief.html"])
check("IR 0.00% vs" not in stripped_b and not re.search(r">(100|99|97|91)%<", stripped_b), "P7 brief.html likewise")
# P9 — the obligations block: current, complete, and carrying no verdict, receipt, digest or build
PO = importlib.import_module("project-obligations")
corpus = json.load(open(PO.CORPUS, encoding="utf-8"))
blk = idx[idx.index(PO.BEGIN):idx.index(PO.END)]; blk = blk[blk.index("-->") + 3:]   # the rows, past the marker's own comment
cited = sorted({c for f in ("js/claims.js", "js/drawing-set.js", "js/instrument.js") for c in re.findall(r"CY-[A-Z]+-\d{3}", open(os.path.join(ROOT, f), encoding="utf-8").read())})
check(PO.project(idx, corpus) == idx and blk.count('<details class="ob">') == len(corpus["obligations"]) >= 19,
      "P9 the floor's obligations block is the corpus's %d obligations, current" % len(corpus["obligations"]))
check(not re.search(r"\b[0-9a-f]{64}\b|\b[0-9A-F]{16}\b|\b(PASS|FAIL|NOT_EVALUATED)\b|receipt", blk),
      "P9 the block carries no digest, build identity, result or receipt — only what is owed")
check(all(c in blk for c in cited) and cited, "P9 every obligation a served module cites is disclosed: %s" % ", ".join(cited))
mut = json.loads(json.dumps(corpus)); mut["obligations"][2]["quantifier"] += " (mutated)"
check(PO.project(idx, mut) != idx, "P9 a changed obligation makes the block stale")
# P8
r = subprocess.run([JSC, "js/manifest.js", "tools/test-projection.js"], cwd=ROOT, capture_output=True, text=True)
print(r.stdout.rstrip())
check(r.returncode == 0 and "projection claim: all pass" in r.stdout, "P8 CL-02 reads the projected facts back at runtime (jsc)")

print()
if fails:
    print("PROJECTION LAWS: %d FAILURE(S)" % len(fails)); sys.exit(1)
print("PROJECTION LAWS: all pass")
