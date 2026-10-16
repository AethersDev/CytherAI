#!/usr/bin/env python3
"""test-api.py — the public surface is an inventory, and every symbol has a caller.

Each record module publishes one object (globalThis.Cyther*). No page loads them since THE
EXCEPTION retired (2026-10-16, backup/exception-v1/): the projector and the verifiers read them
under jsc. The doctrine is the smallest API: a public symbol exists because a verifier calls it —
never "just in case". This harness reads the API object literal and the `API.x =` assignments of
every module from source, holds the set equal to the declared inventory below, and proves each
symbol is referenced by a tool under tools/ (test or generator). A page that loads a module again
fails here, so the role it would give a symbol is declared, not inferred.

A symbol with no caller is dead surface and fails here; a new symbol must be added to the
inventory in the same change that adds its caller.

Run: python3 tools/test-api.py   ·   exit nonzero on any failure.
"""
import glob, os, re, sys

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
SERVED = {line.strip() for line in open(os.path.join(ROOT, "deploy.paths"), encoding="utf-8") if line.strip()}
def code(text):
    """the file without its comments — a symbol named in prose is not a call"""
    return re.sub(r"/\*.*?\*/", "", text, flags=re.S)
tools = {f: open(f, encoding="utf-8").read() for f in glob.glob(os.path.join(ROOT, "tools", "*.js")) + glob.glob(os.path.join(ROOT, "tools", "*.py"))
         if not f.endswith("test-api.py")}

def published(src):
    body = re.search(r"const API = \{(.*?)\};", src, re.S).group(1)
    keys = {m.group(1) for m in (re.match(r"\s*([A-Za-z_]\w*)", entry) for entry in body.split(",")) if m}
    return keys | set(re.findall(r"^\s*API\.(\w+)\s*=", src, re.M))

for g, path in MODULES.items():
    check(path not in SERVED, "%s is loaded by no page (%s is not in deploy.paths)" % (g, path))
    got = published(code(open(os.path.join(ROOT, path), encoding="utf-8").read()))
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
