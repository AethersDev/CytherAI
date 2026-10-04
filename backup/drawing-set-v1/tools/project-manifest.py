#!/usr/bin/env python3
"""project-manifest.py — write the manifest's facts into the pages that print them.

Classification: GENERATOR (must reproduce committed bytes). index.html and
pages/brief.html print counts and validation figures that js/manifest.js owns.
Each printed fact is a marked element — <span data-m="count:systems_indexed">06</span>
— and this tool rewrites every marked element's text to CytherManifest.project(name),
read by executing js/manifest.js under jsc, never hand-copied. The documents keep
their facts as bytes (a reader without scripts still has them) while the manifest
stays the single authority; CL-02 reads the same elements back at runtime.

    python3 tools/project-manifest.py           rewrite the pages in place
    python3 tools/project-manifest.py --check   exit 1 if any page would change

An unknown projection name is INVALID: the tool refuses to write and exits 1.
"""
import json, os, re, subprocess, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
JSC = "/System/Library/Frameworks/JavaScriptCore.framework/Versions/A/Helpers/jsc"
PAGES = ("index.html", "pages/brief.html")
MARK = re.compile(r'(<(span|td|div)\b[^>]*\bdata-m="([^"]+)"[^>]*>)([^<]*)(</\2>)')


def projections(names, manifest_js=os.path.join(ROOT, "js/manifest.js")):
    """{name: string | None} from js/manifest.js via jsc."""
    driver = os.path.join(ROOT, "tools", ".project-driver.js")
    with open(driver, "w") as f:
        f.write("var N=%s;var o={};N.forEach(function(n){o[n]=CytherManifest.project(n)});"
                "o.__ids=CytherManifest.VALIDATION.map(function(r){return r.id});"
                "o.__index=CytherManifest.MANIFEST.validation_index;o.__checksum=CytherManifest.CHECKSUM;"
                "print(JSON.stringify(o))" % json.dumps(sorted(set(names))))
    try:
        out = subprocess.run([JSC, manifest_js, driver], check=True, capture_output=True, text=True).stdout
    finally:
        os.remove(driver)
    return json.loads(out)


def project(source, values):
    """The page with every marked element's text replaced; raises on an unknown name."""
    def sub(m):
        value = values.get(m.group(3))
        if value is None:
            raise ValueError("unknown projection %r" % m.group(3))
        return m.group(1) + value + m.group(5)
    return MARK.sub(sub, source)


def names_in(source):
    return [m.group(3) for m in MARK.finditer(source)]


def main(argv):
    check = "--check" in argv
    sources = {page: open(os.path.join(ROOT, page), encoding="utf-8").read() for page in PAGES}
    values = projections([n for s in sources.values() for n in names_in(s)])
    changed = 0
    for page, source in sources.items():
        try:
            out = project(source, values)
        except ValueError as exc:
            print("%s: %s" % (page, exc)); return 1
        if out != source:
            changed += 1
            print("%s: %s" % (page, "STALE" if check else "projected"))
            if not check:
                open(os.path.join(ROOT, page), "w", encoding="utf-8").write(out)
    print("%d page(s) %s · %d marked facts · checksum %s" % (changed, "stale" if check else "rewritten", sum(len(names_in(s)) for s in sources.values()), values["__checksum"]))
    return 1 if (check and changed) else 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
