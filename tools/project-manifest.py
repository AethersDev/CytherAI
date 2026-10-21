#!/usr/bin/env python3
"""project-manifest.py — write the manifest's facts into the pages that print them.

Classification: GENERATOR (must reproduce committed bytes). The front doors, pages/brief.html
and CytherCAD's rooms (cythercad/, ar/cythercad.html) print validation figures that js/manifest.js owns. Each printed
fact is a marked element — <span data-m="validation:T2C192-IR-0.00:cyther">0.00%</span>
— and this tool rewrites every marked element's text to CytherManifest.project(name),
read by executing js/manifest.js under jsc, never hand-copied. The documents keep
their facts as bytes (a reader without scripts still has them) while the manifest
stays the single authority; no page reads its marks back.

    python3 tools/project-manifest.py           rewrite the pages in place
    python3 tools/project-manifest.py --check   exit 1 if any page would change

An unknown projection name is INVALID, and so is a mark this tool cannot rewrite
(one whose element holds markup): the tool refuses before writing any page and exits 1.
"""
import json, os, re, subprocess, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
JSC = "/System/Library/Frameworks/JavaScriptCore.framework/Versions/A/Helpers/jsc"
PAGES = ("index.html", "ar/index.html", "pages/brief.html", "cythercad/index.html", "ar/cythercad.html")
MARK = re.compile(r'(<([a-z][a-z0-9]*)\b[^>]*\bdata-m="([^"]+)"[^>]*>)([^<]*)(</\2>)')


def projections(names, manifest_js=os.path.join(ROOT, "js/manifest.js")):
    """({name: string | None}, record) from js/manifest.js via jsc. The record (the validation ids, the index,
    the checksum) is apart from the projections, so no reserved name can be printed as a fact."""
    driver = ("var o={};%s.forEach(function(n){o[n]=CytherManifest.project(n)});"
              "print(JSON.stringify([o,{ids:CytherManifest.VALIDATION.map(function(r){return r.id}),"
              "index:CytherManifest.MANIFEST.validation_index,checksum:CytherManifest.CHECKSUM}]))" % json.dumps(sorted(set(names))))
    out = subprocess.run([JSC, manifest_js, "-e", driver], check=True, capture_output=True, text=True).stdout
    values, record = json.loads(out)
    return values, record


def project(source, values):
    """The page with every marked element's text replaced; raises on an unknown name or an unrewritable mark."""
    if len(re.findall(r'\bdata-m="', source)) != len(MARK.findall(source)):
        raise ValueError("a data-m mark whose element this tool cannot rewrite")
    def sub(m):
        value = values.get(m.group(3))
        if not isinstance(value, str):
            raise ValueError("unknown projection %r" % m.group(3))
        return m.group(1) + value + m.group(5)
    return MARK.sub(sub, source)


def names_in(source):
    return [m.group(3) for m in MARK.finditer(source)]


def main(argv):
    check = "--check" in argv
    sources = {page: open(os.path.join(ROOT, page), encoding="utf-8").read() for page in PAGES}
    values, record = projections([n for s in sources.values() for n in names_in(s)])
    projected = {}
    for page, source in sources.items():            # every page is judged before any is written
        try:
            projected[page] = project(source, values)
        except ValueError as exc:
            print("%s: %s" % (page, exc)); return 1
    changed = [page for page in PAGES if projected[page] != sources[page]]
    for page in changed:
        print("%s: %s" % (page, "STALE" if check else "projected"))
        if not check:
            open(os.path.join(ROOT, page), "w", encoding="utf-8").write(projected[page])
    print("%d page(s) %s · %d marked facts · checksum %s" % (len(changed), "stale" if check else "rewritten", sum(len(names_in(s)) for s in sources.values()), record["checksum"]))
    return 1 if (check and changed) else 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
