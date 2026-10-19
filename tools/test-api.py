#!/usr/bin/env python3
"""test-api.py — the public surface is an inventory, and every symbol has a caller.

Each record module publishes one object (globalThis.Cyther*). No page loads them since THE
EXCEPTION retired (2026-10-16, backup/exception-v1/): the projector and the verifiers read them
under jsc. The doctrine is the smallest API: a public symbol exists because a verifier calls it —
never "just in case". This harness loads each module under jsc and reads the keys of the object it
publishes (so no form of assignment can add one unseen), holds the set equal to the declared
inventory below, and proves each symbol is referenced by the CODE of a tool under tools/ (test or
generator): a JavaScript comment, a Python comment or a docstring that names it is not a caller.
A page that loads a module again fails here, so the role it would give a symbol is declared, not
inferred.

A symbol with no caller is dead surface and fails here; a new symbol must be added to the
inventory in the same change that adds its caller.

Run: python3 tools/test-api.py   ·   exit nonzero on any failure.
"""
import ast, glob, json, os, re, subprocess, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
fails = []
def check(cond, name):
    print(("PASS  " if cond else "FAIL  ") + name)
    if not cond: fails.append(name)

MODULES = {"CytherManifest": "js/manifest.js", "CytherInstrument": "js/instrument.js"}
INVENTORY = {
    "CytherManifest": ["project", "MANIFEST", "VALIDATION", "CANON", "ADMISSION_NONCE", "CHECKSUM"],
    "CytherInstrument": ["judge", "biEngine", "audit"],
}
JSC = "/System/Library/Frameworks/JavaScriptCore.framework/Versions/A/Helpers/jsc"
SERVED = [line.strip() for line in open(os.path.join(ROOT, "deploy.paths"), encoding="utf-8") if line.strip()]
PAGES = {p: open(os.path.join(ROOT, p), encoding="utf-8").read() for p in SERVED if p.endswith(".html")}
def code(path, text):
    """what a tool executes: JavaScript without its comments; for Python, the strings it builds jsc drivers from,
    never its comments or docstrings — a symbol named in prose is not a call"""
    if path.endswith(".js"):
        return re.sub(r"(?<![:\w])//[^\n]*", "", re.sub(r"/\*.*?\*/", "", text, flags=re.S))
    tree = ast.parse(text)
    docs = {id(node.body[0].value) for node in ast.walk(tree)
            if isinstance(node, (ast.Module, ast.FunctionDef, ast.AsyncFunctionDef, ast.ClassDef))
            and node.body and isinstance(node.body[0], ast.Expr) and isinstance(node.body[0].value, ast.Constant)}
    return "\n".join(n.value for n in ast.walk(tree) if isinstance(n, ast.Constant) and isinstance(n.value, str) and id(n) not in docs)
tools = {f: code(f, open(f, encoding="utf-8").read()) for f in glob.glob(os.path.join(ROOT, "tools", "*.js")) + glob.glob(os.path.join(ROOT, "tools", "*.py"))
         if not f.endswith("test-api.py")}

def published(g, path):
    out = subprocess.run([JSC, os.path.join(ROOT, path), "-e", "print(JSON.stringify(Object.keys(%s)))" % g],
                         check=True, capture_output=True, text=True).stdout
    return set(json.loads(out))

for g, path in MODULES.items():
    check(path not in SERVED and not [p for p, text in PAGES.items() if re.search(r"\bjs/%s\b" % re.escape(os.path.basename(path)), text)],
          "%s is loaded by no page (%s is not in deploy.paths, and no served page names it)" % (g, path))
    got = published(g, path)
    declared = set(INVENTORY[g])
    check(got == declared, "%s publishes exactly its inventory (%d symbols)%s" % (g, len(declared),
          "" if got == declared else " — extra %s · missing %s" % (sorted(got - declared), sorted(declared - got))))
    names = [g, "root.%s" % g, "window.%s" % g, "globalThis.%s" % g]
    ref = lambda sym, text: re.search(r"(?<![\w.])(?:%s)\.%s\b" % ("|".join(re.escape(n) for n in names), re.escape(sym)), text) is not None
    for sym in INVENTORY[g]:
        callers = [os.path.basename(f) for f, t in tools.items() if ref(sym, t) or re.search(r"\b%s\b" % re.escape(sym), t) and f.endswith(".js")]
        check(bool(callers), "%s.%s is verifier surface: used by %s" % (g, sym, ", ".join(sorted(callers)) or "NOBODY"))

print()
if fails:
    print("PUBLIC API: %d FAILURE(S)" % len(fails)); sys.exit(1)
print("PUBLIC API: %d symbols, every one with a real caller" % sum(len(v) for v in INVENTORY.values()))
