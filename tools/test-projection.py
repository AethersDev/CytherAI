#!/usr/bin/env python3
"""test-projection.py — the manifest is the only authority for the facts the pages print.

P1  the committed pages equal their projection (tools/project-manifest.py --check);
P2  the validation display rows are the checksum-bearing identifiers, in order;
P3  the brief prints every identifier (a new record cannot be silently omitted); the front
    door prints exactly its headline figure and the baseline it states it against, and no count;
P4  a projected value corrupted in a page is detected;
P5  an unknown projection name is refused by the manifest itself, and never written;
P6  a manifest edit moves every printed site of the value it owns, on every page, and nothing else;
P7  no projected figure survives as text outside a marked element, anywhere in a page's text.

The drawing set's P8 (CL-02's runtime read-back) and P9 (Sheet 7's obligations block) retired
with it on 2026-10-04 and run against its snapshot: backup/drawing-set-v1/verify.sh.

Run: python3 tools/test-projection.py   ·   exit nonzero on any failure.
"""
import os, re, shutil, subprocess, sys, tempfile
from html.parser import HTMLParser

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
values, record = PM.projections([n for ns in names.values() for n in ns])
HEADLINE = ["validation:T2C192-IR-0.00:cyther", "validation:T2C192-IR-0.00:deepcad"]

# P1
run = subprocess.run([sys.executable, "-B", os.path.join(ROOT, "tools/project-manifest.py"), "--check"], capture_output=True, text=True)
check(all(PM.project(s, values) == s for s in pages.values()) and run.returncode == 0 and run.stdout.startswith("0 page(s) stale"),
      "P1 committed pages equal their projection (%d marked facts)%s" % (sum(len(v) for v in names.values()), "" if run.returncode == 0 else " — " + run.stdout + run.stderr))
# P2
check(record["ids"] == record["index"], "P2 VALIDATION rows are validation_index, in order: %s" % record["index"])
# P3
printed = {n.split(":")[1] for n in names["pages/brief.html"] if n.startswith("validation:") and n.endswith(":cyther")}
check(printed == set(record["index"]), "P3 pages/brief.html prints every validation identifier")
check(sorted(names["index.html"]) == sorted(HEADLINE),
      "P3 index.html prints exactly the invalid rate and its DeepCAD baseline as projections, and no count")
check(sorted(names["ar/index.html"]) == sorted(HEADLINE),
      "P3 ar/index.html prints the same two projections, and no count")
# P4
idx = pages["index.html"]
corrupt = idx.replace('data-m="validation:T2C192-IR-0.00:cyther">0.00%<', 'data-m="validation:T2C192-IR-0.00:cyther">0.01%<', 1)
check(corrupt != idx and PM.project(corrupt, values) == idx, "P4 a corrupted projected value is restored by projection — the check would report it stale")
# P5 — the manifest's own refusal (null), not a lookup the projector happens to miss; then the projector's
unknown = ["validation:nonsense:cyther", "validation:T2C192-IR-0.00:cyther:extra", "count:nonsense", "__checksum", "validation:T2C192-IR-0.00:id"]
refusals = PM.projections(unknown)[0]
bogus = idx.replace('data-m="validation:T2C192-IR-0.00:cyther"', 'data-m="validation:nonsense:cyther"', 1)
unwritable = idx.replace('<span data-m="validation:T2C192-IR-0.00:cyther">0.00%</span>', '<span data-m="validation:T2C192-IR-0.00:cyther"><b>0.00%</b></span>', 1)
def refused(source):
    try:
        PM.project(source, dict(values, **refusals)); return False
    except ValueError:
        return True
check(all(refusals[n] is None for n in unknown) and refused(bogus) and refused(unwritable) and unwritable != idx,
      "P5 an unknown projection name is null in the manifest and refused by the projector, as is a mark it cannot rewrite")
# P6 — over every page and every name: the baseline moves wherever it is printed, and nothing else moves
src = open(os.path.join(ROOT, "js/manifest.js"), encoding="utf-8").read()
assert src.count('deepcad: "10.00%"') == 1
scratch = tempfile.mkdtemp()                    # never inside the repository: verify.sh writes nothing there
try:
    mut = os.path.join(scratch, "manifest.js")
    open(mut, "w", encoding="utf-8").write(src.replace('deepcad: "10.00%"', 'deepcad: "10.50%"'))
    mv = PM.projections([n for ns in names.values() for n in ns], mut)[0]
finally:
    shutil.rmtree(scratch)
for p, source in pages.items():
    moved = PM.project(source, mv)
    owned = [m.group(3) for m in PM.MARK.finditer(source) if "10.00%" in m.group(4)]
    check(moved.replace("10.50%", "10.00%") == source and all("10.50%" in mv[n] for n in owned),
          "P6 %s: the baseline 10.00%%→10.50%% moves its %d printed site(s), and nothing it does not own" % (p, len(owned)))
# P7 — every projected value, searched in the text a reader sees, wherever it falls
class Text(HTMLParser):
    def __init__(self):
        super().__init__(); self.parts, self.skip = [], False
    def handle_starttag(self, tag, attrs): self.skip = tag in ("style", "script")
    def handle_endtag(self, tag): self.skip = False
    def handle_data(self, data):
        if not self.skip: self.parts.append(data)
figures = sorted({v for v in values.values() if isinstance(v, str) and re.search(r"\d", v)}, key=len, reverse=True)
for p in PM.PAGES:
    reader = Text(); reader.feed(PM.MARK.sub(lambda m: m.group(1) + m.group(5), pages[p]))
    text = " ".join(reader.parts)
    survivors = [f for f in figures if re.search(r"(?<![\d.])" + re.escape(f), text)]
    check(not survivors, "P7 %s: no projected figure survives as text outside a marked element%s" % (p, "" if not survivors else " — " + ", ".join(survivors)))
check(re.search(r"(?<![\d.])" + re.escape("10.00%"), "an invalid rate of 0.00% against DeepCAD at 10.00% in prose"), "P7 the search has teeth on prose")

print()
if fails:
    print("PROJECTION LAWS: %d FAILURE(S)" % len(fails)); sys.exit(1)
print("PROJECTION LAWS: all pass")
