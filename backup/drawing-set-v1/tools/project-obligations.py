#!/usr/bin/env python3
"""project-obligations.py — disclose what the set owes, never whether it paid.

Classification: GENERATOR (must reproduce committed bytes). Sheet 7 of index.html
carries every obligation of vaic/cytherai-obligations.v1.json as a static, script-free
record between two markers: first the obligations the set OWES (carried forward from
instrument-v1 with their successor surface), then the obligations SUPERSEDED with that
world — preserved, named with the mechanism that retired, not owed. Only build-stable
fields are projected — id, layer, severity, quantifier, trigger, subject, relation,
object, authorized evaluators, coverage classes, failure semantics, transition — never a
receipt, result, digest or build identity: a receipt for this build cannot be inside
this build, so the block is stable across restamps and the verdict stays outside the
artifact it would certify.

    python3 tools/project-obligations.py           rewrite the block in place
    python3 tools/project-obligations.py --check   exit 1 if the block would change
"""
import html as H, json, os, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CORPUS = os.path.join(ROOT, "vaic/cytherai-obligations.v1.json")
PAGE = os.path.join(ROOT, "index.html")
BEGIN, END = "<!-- obligations:begin", "<!-- obligations:end -->"
FIELDS = ("id", "layer", "severity", "quantifier", "trigger", "subject", "relation", "object", "authorized_evaluators", "required_coverage", "failure_semantics", "transition")
e = lambda s: H.escape(str(s), quote=True)


def owed(o):
    return ('      <details class="ob"><summary class="m-row"><span class="m-k">%s · %s · %s</span><span class="m-v anti-v">%s</span></summary>'
            '<div class="m-evidence"><div><span class="e-k">OWED — </span>%s: %s <b>%s</b> %s</div>'
            '<div><span class="e-k">WHEN — </span>%s</div>'
            '<div><span class="e-k">MAY BE ESTABLISHED BY — </span>%s · coverage %s</div>'
            '<div><span class="e-k">IF UNPAID — </span>%s</div>'
            '<div><span class="e-k">ON THIS SET — </span>%s</div>'
            '<div><span class="e-k">THIS ARTIFACT — </span>OBLIGATION DISCLOSED · VERDICT NOT ASSERTED HERE</div></div></details>'
            % (e(o["id"]), e(o["layer"].upper()), e(o["severity"].upper().replace("_", " ")), e(o["relation"]),
               e(o["quantifier"]), e(o["subject"]), e(o["relation"]), e(o["object"]), e(o["trigger"]),
               e(" · ".join(o["authorized_evaluators"])), e(" · ".join(o["required_coverage"]["classes"])),
               e(o["failure_semantics"].upper().replace("_", " ")), e(o["transition"]["successor_surface"])))


def superseded(o):
    return ('      <details class="ob sup"><summary class="m-row"><span class="m-k">%s · %s · SUPERSEDED</span><span class="m-v anti-v">%s</span></summary>'
            '<div class="m-evidence"><div><span class="e-k">OWED BY INSTRUMENT-V1 — </span>%s: %s <b>%s</b> %s</div>'
            '<div><span class="e-k">RETIRED MECHANISM — </span>%s</div>'
            '<div><span class="e-k">STANDING — </span>%s</div>'
            '<div><span class="e-k">PRESERVED IN — </span>%s · with its recorded observations</div></div></details>'
            % (e(o["id"]), e(o["layer"].upper()), e(o["relation"]),
               e(o["quantifier"]), e(o["subject"]), e(o["relation"]), e(o["object"]),
               e(o["transition"]["retired_mechanism"]), e(o["transition"]["statement"]), e(o["transition"]["preserved_in"])))


def block(corpus):
    rows = [{k: o[k] for k in FIELDS} for o in corpus["obligations"]]    # build-stable fields only, by construction
    live = [owed(o) for o in rows if o["transition"]["disposition"] == "CARRIED_FORWARD"]
    gone = [superseded(o) for o in rows if o["transition"]["disposition"] == "SUPERSEDED"]
    head = ('      <div class="hd sup">SUPERSEDED WITH INSTRUMENT-V1 — %d OBLIGATIONS · PRESERVED WITH THEIR EVIDENCE · NOT OWED BY THIS SET · '
            'SUPERSESSION IS NOT SATISFACTION, FAILURE, OR REVOCATION</div>' % len(gone))
    return ("%s — %d obligations projected from vaic/cytherai-obligations.v1.json by tools/project-obligations.py:\n"
            "           %d owed by this set, %d superseded with instrument-v1; build-stable fields only; no receipt, result, digest\n"
            "           or build identity is ever written here -->\n%s\n%s\n%s\n      %s"
            % (BEGIN, len(rows), len(live), len(gone), "\n".join(live), head, "\n".join(gone), END))


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
