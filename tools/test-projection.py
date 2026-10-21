#!/usr/bin/env python3
"""test-projection.py — the manifest is the only authority for the facts the pages print.

P1  the committed pages equal their projection (tools/project-manifest.py --check);
P2  the validation display rows are the checksum-bearing identifiers, in order;
P3  the brief and CytherCAD's rooms print every identifier (a new record cannot be silently omitted); the
    front doors print no projection (since 2026-10-21: the comparison they printed, 0.00% against DeepCAD's 10.00%
    on "an external benchmark", was not what the run's own record shows; docs/deploy.md §5ad), and no count;
P4  a projected value corrupted in a page is detected;
P5  an unknown projection name is refused by the manifest itself, and never written;
P6  a manifest edit moves every printed site of the value it owns, on every page, and nothing else;
P7  no figure the record holds, printed or not (each display field of each row), survives as text outside a marked
    element, anywhere in a page's text.

The drawing set's P8 (CL-02's runtime read-back) and P9 (Sheet 7's obligations block) retired
with it on 2026-10-04 and run against its snapshot: backup/drawing-set-v1/verify.sh.

Run: python3 tools/test-projection.py   ·   exit nonzero on any failure.
"""
import json, os, re, shutil, subprocess, sys, tempfile
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
FIGURE = "validation:T2C192-INV-1-384:cyther"

# P1
run = subprocess.run([sys.executable, "-B", os.path.join(ROOT, "tools/project-manifest.py"), "--check"], capture_output=True, text=True)
check(all(PM.project(s, values) == s for s in pages.values()) and run.returncode == 0 and run.stdout.startswith("0 page(s) stale"),
      "P1 committed pages equal their projection (%d marked facts)%s" % (sum(len(v) for v in names.values()), "" if run.returncode == 0 else " — " + run.stdout + run.stderr))
# P2
check(record["ids"] == record["index"], "P2 VALIDATION rows are validation_index, in order: %s" % record["index"])
# P3
for page in ("pages/brief.html", "cythercad/index.html", "ar/cythercad.html"):
    printed = {n.split(":")[1] for n in names[page] if n.startswith("validation:") and n.endswith(":cyther")}
    check(printed == set(record["index"]), "P3 %s prints every validation identifier" % page)
check(names["index.html"] == [] and names["ar/index.html"] == [], "P3 the front doors print no projection, and no count")
# P4 — on CytherCAD's room, which prints the record's figure
idx = pages["cythercad/index.html"]
corrupt = idx.replace('data-m="%s">1 of 384<' % FIGURE, 'data-m="%s">0 of 384<' % FIGURE, 1)
check(corrupt != idx and PM.project(corrupt, values) == idx, "P4 a corrupted projected value is restored by projection — the check would report it stale")
# P5 — the manifest's own refusal (null), not a lookup the projector happens to miss; then the projector's
unknown = ["validation:nonsense:cyther", FIGURE + ":extra", "count:nonsense", "__checksum", "validation:T2C192-INV-1-384:id",
           "outcome:cad", "validation:T2C192-IR-0.00:deepcad"]   # the last two: the withdrawn comparison, refused
refusals = PM.projections(unknown)[0]
bogus = idx.replace('data-m="%s"' % FIGURE, 'data-m="validation:nonsense:cyther"', 1)
unwritable = idx.replace('<span data-m="%s">1 of 384</span>' % FIGURE, '<span data-m="%s"><b>1 of 384</b></span>' % FIGURE, 1)
def refused(source):
    try:
        PM.project(source, dict(values, **refusals)); return False
    except ValueError:
        return True
check(all(refusals[n] is None for n in unknown) and refused(bogus) and refused(unwritable) and unwritable != idx,
      "P5 an unknown projection name is null in the manifest and refused by the projector, as is a mark it cannot rewrite")
# P6 — over every page and every name: the figure moves wherever it is printed, and nothing else moves
src = open(os.path.join(ROOT, "js/manifest.js"), encoding="utf-8").read()
assert src.count('cyther: "1 of 384"') == 1
scratch = tempfile.mkdtemp()                    # never inside the repository: verify.sh writes nothing there
try:
    mut = os.path.join(scratch, "manifest.js")
    open(mut, "w", encoding="utf-8").write(src.replace('cyther: "1 of 384"', 'cyther: "2 of 384"'))
    mv = PM.projections([n for ns in names.values() for n in ns], mut)[0]
finally:
    shutil.rmtree(scratch)
for p, source in pages.items():
    moved = PM.project(source, mv)
    owned = [m.group(3) for m in PM.MARK.finditer(source) if re.search("1 (of|من) 384", m.group(4))]
    check(moved.replace("2 of 384", "1 of 384").replace("2 من 384", "1 من 384") == source and all(re.search("2 (of|من) 384", mv[n]) for n in owned),
          "P6 %s: the figure 1 of 384→2 of 384 moves its %d printed site(s), and nothing it does not own" % (p, len(owned)))
# P7 — every value the record holds (an Arabic room's figure is a field of its own), searched in the text a reader sees
class Text(HTMLParser):
    def __init__(self):
        super().__init__(); self.parts, self.skip = [], False
    def handle_starttag(self, tag, attrs): self.skip = tag in ("style", "script")
    def handle_endtag(self, tag): self.skip = False
    def handle_data(self, data):
        if not self.skip: self.parts.append(data)
rows = json.loads(subprocess.run([PM.JSC, os.path.join(ROOT, "js/manifest.js"), "-e", "print(JSON.stringify(CytherManifest.VALIDATION))"],
                                  check=True, capture_output=True, text=True).stdout)
held = [v for r in rows for k, v in r.items() if k not in ("id", "mark")]
figures = sorted({v for v in [*values.values(), *held] if isinstance(v, str) and re.search(r"\d", v)}, key=len, reverse=True)
for p in PM.PAGES:
    reader = Text(); reader.feed(PM.MARK.sub(lambda m: m.group(1) + m.group(5), pages[p]))
    text = " ".join(reader.parts)
    survivors = [f for f in figures if re.search(r"(?<![\d.])" + re.escape(f), text)]
    check(not survivors, "P7 %s: no projected figure survives as text outside a marked element%s" % (p, "" if not survivors else " — " + ", ".join(survivors)))
check(re.search(r"(?<![\d.])" + re.escape("1 of 384"), "in prose, 1 of 384 parts was invalid"), "P7 the search has teeth on prose")

print()
if fails:
    print("PROJECTION LAWS: %d FAILURE(S)" % len(fails)); sys.exit(1)
print("PROJECTION LAWS: all pass")
