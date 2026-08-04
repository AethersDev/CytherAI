"""The canonical derivation surface shared by the asset tools.

dsin/dcos are ports of js/manifest.js — the engine-invariant polynomial sine
the admission domain runs on (IEEE-exact +,*,floor). The Python port is
bit-identical to jsc; canon_from_source() never hand-copies parameters, it
executes the repository's own js/manifest.js under jsc and reads them out.
"""
import json, math, os, subprocess

JSC = "/System/Library/Frameworks/JavaScriptCore.framework/Versions/A/Helpers/jsc"
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

TWO_PI, HALF_PI, D_PI = 6.283185307179586, 1.5707963267948966, 3.141592653589793


def dsin(x):
    x = x - TWO_PI * math.floor(x / TWO_PI + 0.5)
    if x > HALF_PI: x = D_PI - x
    elif x < -HALF_PI: x = -D_PI - x
    x2 = x * x
    return x * (1 + x2 * (-1/6 + x2 * (1/120 + x2 * (-1/5040 + x2 * (1/362880 + x2 * (-1/39916800))))))


def dcos(x):
    return dsin(x + HALF_PI)


def canon_from_source():
    """(CANON, ADMISSION_NONCE, CHECKSUM) — from js/manifest.js, via jsc."""
    driver = ('print(JSON.stringify({p:CytherManifest.CANON,'
              'n:CytherManifest.ADMISSION_NONCE,c:CytherManifest.CHECKSUM}))')
    dpath = os.path.join(ROOT, "tools", ".canon-driver.js")
    with open(dpath, "w") as f:
        f.write(driver)
    try:
        out = subprocess.run([JSC, os.path.join(ROOT, "js/manifest.js"), dpath],
                             check=True, capture_output=True, text=True).stdout
    finally:
        os.remove(dpath)
    j = json.loads(out)
    return j["p"], j["n"], j["c"]


def warmed_orbit(P):
    """(x, y) after the canonical 40-step warmup from (0.08, 0.12)."""
    a, b, c, d = P
    x, y = 0.08, 0.12
    for _ in range(40):
        nx = dsin(a*y) + c*dcos(a*x); ny = dsin(b*x) + d*dcos(b*y)
        x, y = nx, ny
    return x, y
