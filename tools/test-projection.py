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
P8  CL-02 reads the same elements back at runtime (tools/test-projection.js under jsc).

Run: python3 tools/test-projection.py   ·   exit nonzero on any failure.
"""
import os, re, subprocess, sys, tempfile

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
check(all(n in names["index.html"] for n in ("count:systems_indexed", "count:systems_disclosed", "count:controlled_references")),
      "P3 index.html prints the three manifest counts as projections")
# P4
idx = pages["index.html"]
corrupt = idx.replace('data-m="count:systems_indexed">06<', 'data-m="count:systems_indexed">07<', 1)
check(corrupt != idx and PM.project(corrupt, values) == idx, "P4 a corrupted projected value is restored by projection — the check would report it stale")
# P5
bogus = idx.replace('data-m="count:systems_indexed"', 'data-m="count:nonsense"', 1)
try:
    PM.project(bogus, values); refused = False
except ValueError:
    refused = True
check(refused, "P5 an unknown projection name is refused")
# P6
src = open(os.path.join(ROOT, "js/manifest.js"), encoding="utf-8").read()
assert src.count("systems_indexed: 6,") == 1
with tempfile.NamedTemporaryFile("w", suffix=".js", delete=False, dir=os.path.join(ROOT, "tools"), prefix=".mut-") as f:
    f.write(src.replace("systems_indexed: 6,", "systems_indexed: 7,")); mut = f.name
try:
    mv = PM.projections(names["index.html"], mut)
finally:
    os.remove(mut)
projected = PM.project(idx, mv)
sites = [m for m in PM.MARK.finditer(projected) if m.group(3) == "count:systems_indexed"]
check(mv["__checksum"] != values["__checksum"] and sites and all(m.group(4) == "07" for m in sites)
      and all(m.group(4) == "06" for m in PM.MARK.finditer(idx) if m.group(3) == "count:systems_indexed")
      and mv["count:systems_disclosed"] == values["count:systems_disclosed"],
      "P6 systems_indexed 6→7 moves the checksum (%s→%s) and every 06 site to 07, and nothing it does not own" % (values["__checksum"], mv["__checksum"]))
# P7
stripped = PM.MARK.sub(lambda m: m.group(1) + m.group(5), idx)
check("06 INDEXED" not in stripped and "02 DISCLOSED" not in stripped and ">03 · structure" not in stripped
      and not re.search(r"<td class=\"cy\">\d", stripped) and "IR 0.00% vs" not in stripped,
      "P7 no retired count or figure literal survives outside a marked element")
stripped_b = PM.MARK.sub(lambda m: m.group(1) + m.group(5), pages["pages/brief.html"])
check("IR 0.00% vs" not in stripped_b and not re.search(r">(100|99|97|91)%<", stripped_b), "P7 brief.html likewise")
# P8
r = subprocess.run([JSC, "js/manifest.js", "tools/test-projection.js"], cwd=ROOT, capture_output=True, text=True)
print(r.stdout.rstrip())
check(r.returncode == 0 and "projection claim: all pass" in r.stdout, "P8 CL-02 reads the projected facts back at runtime (jsc)")

print()
if fails:
    print("PROJECTION LAWS: %d FAILURE(S)" % len(fails)); sys.exit(1)
print("PROJECTION LAWS: all pass")
