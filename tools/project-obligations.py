#!/usr/bin/env python3
"""project-obligations.py — disclose what the page owes, never whether it paid.

Classification: GENERATOR (must reproduce committed bytes). The floor of
index.html carries every obligation of vaic/cytherai-obligations.v0.json as a
static, script-free record between two markers. Only build-stable fields are
projected — id, layer, severity, quantifier, trigger, subject, relation, object,
authorized evaluators, coverage classes, failure semantics — never a receipt,
result, digest or build identity: a receipt for this build cannot be inside this
build, so the block is stable across restamps and the verdict stays outside the
artifact it would certify.

    python3 tools/project-obligations.py           rewrite the block in place
    python3 tools/project-obligations.py --check   exit 1 if the block would change
"""
import html as H, json, os, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CORPUS = os.path.join(ROOT, "vaic/cytherai-obligations.v0.json")
PAGE = os.path.join(ROOT, "index.html")
BEGIN, END = "<!-- obligations:begin", "<!-- obligations:end -->"
FIELDS = ("id", "layer", "severity", "quantifier", "trigger", "subject", "relation", "object", "authorized_evaluators", "required_coverage", "failure_semantics")


def block(corpus):
    rows = []
    for o in corpus["obligations"]:
        o = {k: o[k] for k in FIELDS}                      # build-stable fields only, by construction
        e = lambda s: H.escape(str(s), quote=True)
        rows.append(
            '      <details class="ob"><summary class="m-row"><span class="m-k">%s · %s · %s</span><span class="m-v anti-v">%s</span></summary>'
            '<div class="m-evidence"><div><span class="e-k">OWED — </span>%s: %s <b>%s</b> %s</div>'
            '<div><span class="e-k">WHEN — </span>%s</div>'
            '<div><span class="e-k">MAY BE ESTABLISHED BY — </span>%s · coverage %s</div>'
            '<div><span class="e-k">IF UNPAID — </span>%s</div>'
            '<div><span class="e-k">THIS ARTIFACT — </span>OBLIGATION DISCLOSED · VERDICT NOT ASSERTED HERE</div></div></details>'
            % (e(o["id"]), e(o["layer"].upper()), e(o["severity"].upper().replace("_", " ")), e(o["relation"]),
               e(o["quantifier"]), e(o["subject"]), e(o["relation"]), e(o["object"]), e(o["trigger"]),
               e(" · ".join(o["authorized_evaluators"])), e(" · ".join(o["required_coverage"]["classes"])),
               e(o["failure_semantics"].upper().replace("_", " "))))
    return ("%s — %d obligations projected from vaic/cytherai-obligations.v0.json by tools/project-obligations.py:\n"
            "           build-stable fields only; no receipt, result, digest or build identity is ever written here -->\n%s\n      %s"
            % (BEGIN, len(rows), "\n".join(rows), END))


def project(source, corpus):
    i, j = source.index(BEGIN), source.index(END) + len(END)
    return source[:i] + block(corpus) + source[j:]


def main(argv):
    corpus = json.load(open(CORPUS, encoding="utf-8"))
    source = open(PAGE, encoding="utf-8").read()
    out = project(source, corpus)
    if out == source:
        print("index.html: obligations current (%d)" % len(corpus["obligations"])); return 0
    if "--check" in argv:
        print("index.html: obligations STALE"); return 1
    open(PAGE, "w", encoding="utf-8").write(out); print("index.html: obligations projected (%d)" % len(corpus["obligations"])); return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
