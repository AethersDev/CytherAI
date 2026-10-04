#!/usr/bin/env python3
"""test-projection.py — the manifest is the only authority for the facts the pages print.

P1  the committed pages equal their projection (tools/project-manifest.py --check);
P2  the validation display rows are the checksum-bearing identifiers, in order;
P3  the brief prints every identifier (a new record cannot be silently omitted); the front
    door prints exactly its headline figure and the baseline it states it against, and no count;
P4  a projected value corrupted in a page is detected;
P5  an unknown projection name is refused, never written;
P6  a manifest edit moves every printed site of the value it owns, and nothing else;
P7  no figure survives outside a marked element (the front door prints no count: P3).

The drawing set's P8 (CL-02's runtime read-back) and P9 (Sheet 7's obligations block) retired
with it on 2026-10-04 and run against its snapshot: backup/drawing-set-v1/verify.sh.

Run: python3 tools/test-projection.py   ·   exit nonzero on any failure.
"""
import os, re, subprocess, sys, tempfile

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(ROOT, "tools"))
import importlib
PM = importlib.import_module("project-manifest")
fails = []
def check(cond, name):
    print(("PASS  " if cond else "FAIL  ") + name)
    if not cond: fails.append(name)

pages = {p: open(os.path.join(ROOT, p), encoding="utf-8").read() for p in PM.PAGES}
names = {p: PM.names_in(s) for p, s in pages.items()}
values = PM.projections([n for ns in names.values() for n in ns])
HEADLINE = ["validation:T2C192-IR-0.00:cyther", "validation:T2C192-IR-0.00:deepcad"]

# P1
check(all(PM.project(s, values) == s for s in pages.values()) and subprocess.run([sys.executable, os.path.join(ROOT, "tools/project-manifest.py"), "--check"], capture_output=True).returncode == 0,
      "P1 committed pages equal their projection (%d marked facts)" % sum(len(v) for v in names.values()))
# P2
check(values["__ids"] == values["__index"], "P2 VALIDATION rows are validation_index, in order: %s" % values["__index"])
# P3
printed = {n.split(":")[1] for n in names["pages/brief.html"] if n.startswith("validation:") and n.endswith(":cyther")}
check(printed == set(values["__index"]), "P3 pages/brief.html prints every validation identifier")
check(sorted(names["index.html"]) == sorted(HEADLINE),
      "P3 index.html prints exactly the invalid rate and its DeepCAD baseline as projections, and no count")
# P4
idx = pages["index.html"]
corrupt = idx.replace('data-m="validation:T2C192-IR-0.00:cyther">0.00%<', 'data-m="validation:T2C192-IR-0.00:cyther">0.01%<', 1)
check(corrupt != idx and PM.project(corrupt, values) == idx, "P4 a corrupted projected value is restored by projection — the check would report it stale")
# P5
bogus = idx.replace('data-m="validation:T2C192-IR-0.00:cyther"', 'data-m="validation:nonsense:cyther"', 1)
try:
    PM.project(bogus, values); refused = False
except ValueError:
    refused = True
check(refused, "P5 an unknown projection name is refused")
# P6
src = open(os.path.join(ROOT, "js/manifest.js"), encoding="utf-8").read()
assert src.count('deepcad: "10.00%"') == 1
with tempfile.NamedTemporaryFile("w", suffix=".js", delete=False, dir=os.path.join(ROOT, "tools"), prefix=".mut-") as f:
    f.write(src.replace('deepcad: "10.00%"', 'deepcad: "10.50%"')); mut = f.name
try:
    mv = PM.projections(names["index.html"], mut)
finally:
    os.remove(mut)
moved = PM.project(idx, mv)
sites = {m.group(3): m.group(4) for m in PM.MARK.finditer(moved)}
check(sites == {HEADLINE[0]: "0.00%", HEADLINE[1]: "10.50%"} and moved.replace("10.50%", "10.00%") == idx,
      "P6 the baseline 10.00%→10.50% moves its printed site, and nothing it does not own")
# P7
for p in PM.PAGES:
    stripped = PM.MARK.sub(lambda m: m.group(1) + m.group(5), pages[p])
    check(not re.search(r">0\.00%<|>10\.00%<|>0\.93%<|>(100|99|97|91)%<", stripped) and "IR 0.00% vs" not in stripped,
          "P7 %s: no figure literal survives outside a marked element" % p)

print()
if fails:
    print("PROJECTION LAWS: %d FAILURE(S)" % len(fails)); sys.exit(1)
print("PROJECTION LAWS: all pass")
