#!/usr/bin/env python3
"""test-api.py — the public surface is an inventory, and every symbol has a caller.

Each homepage module publishes one object (window.Cyther*). The doctrine is the
smallest API: a public symbol exists because a served module or a verifier calls
it — never "just in case". This harness reads the API object literal and the
DOM-block `API.x =` assignments of every module from source, holds the set equal
to the declared inventory below, and proves each symbol's role:

  production  — referenced by a served module other than its own
  verifier    — referenced by a tool under tools/ (test or generator)

A symbol with neither role is dead surface and fails here; a new symbol must be
added to the inventory with its role in the same change that adds its caller.

Run: python3 tools/test-api.py   ·   exit nonzero on any failure.
"""
import glob, os, re, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
fails = []
def check(cond, name):
    print(("PASS  " if cond else "FAIL  ") + name)
    if not cond: fails.append(name)

MODULES = {
    "CytherManifest": "js/manifest.js", "CytherSubstrate": "js/substrate.js", "CytherClaims": "js/claims.js",
    "CytherLedger": "js/ledger.js", "CytherInstrument": "js/instrument.js",
}
# the local names served modules bind each global to
ALIASES = {"CytherManifest": ["CM"], "CytherSubstrate": ["S"], "CytherClaims": ["Claims", "C"], "CytherLedger": ["Ledger"], "CytherInstrument": ["Inst"]}
INVENTORY = {
    "CytherManifest": {
        "production": ["MANIFEST", "EPOCHS", "COMMITMENTS", "PUBLISHED_NONCES", "NORM", "CANON", "ADMISSION_NONCE", "CHECKSUM",
                       "LEGIBILITY_CAP", "project", "fnv", "dsin", "dcos", "datan2", "dsinOrbit", "legibility", "paramsFor", "admit",
                       "normalizeManifest", "stateChecksum"],
        "verifier": ["VALIDATION"],
    },
    "CytherSubstrate": {
        "production": ["READING", "deriveAnchors", "readingGroundAt", "developServer", "boot", "observe", "redevelop", "step", "setFork",
                       "resetToCanonical", "isForking", "isCanonical", "canonicalAnchors", "params", "serial", "status", "isDeveloping",
                       "exposure", "receipt", "fieldEnergy", "corridors", "depthAtMap"],
        "verifier": ["ZOOMS", "BGS", "ACCENTS", "computeOrbit", "pathPoint", "depthFor", "cameraAt", "composeTile", "ambientAt", "bgRgbAt",
                     "dprCapFor", "binTargetFor", "DEV_BATCH", "frameFor", "plateState", "developStep", "stateHash", "exposureLog",
                     "tonemapInto", "summarizeField"],
    },
    "CytherClaims": {
        "production": ["setClaim", "recomputeClaims", "renderClaims", "checkRenderManifest"],
        "verifier": ["CLAIMS", "CLAIMSTATE", "recomputeOne", "summary"],
    },
    "CytherLedger": {
        "production": ["recordAct", "wire", "upgradeCta"],
        "verifier": ["ACTS", "diligenceCount", "mailtoBody", "clear", "conduct"],
    },
    "CytherInstrument": {
        "production": ["lastAudit", "step", "wire"],
        "verifier": ["audit", "biEngine", "judge"],
    },
}
SERVED = ["index.html", "js/manifest.js", "js/substrate.js", "js/claims.js", "js/ledger.js", "js/instrument.js", "js/site.js", "js/develop-worker.js"]
def code(text, path):
    """the file without its comments — a symbol named in prose is not a call"""
    if path.endswith(".html"): return re.sub(r"<!--.*?-->", "", text, flags=re.S)
    return re.sub(r"/\*.*?\*/", "", text, flags=re.S)
served = {f: code(open(os.path.join(ROOT, f), encoding="utf-8").read(), f) for f in SERVED}
tools = {f: open(f, encoding="utf-8").read() for f in glob.glob(os.path.join(ROOT, "tools", "*.js")) + glob.glob(os.path.join(ROOT, "tools", "*.py"))
         if not f.endswith("test-api.py")}

def published(src):
    body = re.search(r"const API = \{(.*?)\};", src, re.S).group(1)
    keys = {m.group(1) for m in (re.match(r"\s*([A-Za-z_]\w*)", entry) for entry in body.split(",")) if m}
    return keys | set(re.findall(r"^\s*API\.(\w+)\s*=", src, re.M))

for g, path in MODULES.items():
    src = served[path]
    got = published(src)
    inv = INVENTORY[g]; declared = set(inv["production"]) | set(inv["verifier"])
    check(got == declared, "%s publishes exactly its inventory (%d symbols)%s" % (g, len(declared),
          "" if got == declared else " — extra %s · missing %s" % (sorted(got - declared), sorted(declared - got))))
    names = [g] + ALIASES[g] + ["root.%s" % g, "window.%s" % g, "globalThis.%s" % g]
    ref = lambda sym, text: re.search(r"(?<![\w.])(?:%s)\.%s\b" % ("|".join(re.escape(n) for n in names), re.escape(sym)), text) is not None
    for sym in inv["production"]:
        callers = [f for f, t in served.items() if f != path and ref(sym, t)]
        check(bool(callers), "%s.%s is production: called by %s" % (g, sym, ", ".join(callers) or "NOBODY"))
    for sym in inv["verifier"]:
        callers = [os.path.basename(f) for f, t in tools.items() if ref(sym, t) or re.search(r"\b%s\b" % re.escape(sym), t) and f.endswith(".js")]
        check(bool(callers), "%s.%s is verifier surface: used by %s" % (g, sym, ", ".join(sorted(callers)) or "NOBODY"))
    for sym in inv["verifier"]:
        check(not any(f != path and ref(sym, t) for f, t in served.items()), "%s.%s is not also a production symbol (roles are declared, not inferred)" % (g, sym))

print()
if fails:
    print("PUBLIC API: %d FAILURE(S)" % len(fails)); sys.exit(1)
print("PUBLIC API: %d symbols, every one with a declared role and a real caller" % sum(len(v["production"]) + len(v["verifier"]) for v in INVENTORY.values()))
