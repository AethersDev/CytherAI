#!/usr/bin/env python3
"""Re-stamp the VAIC-0 candidate and APPEND the automated harness receipts.

Run after ./generate-integrity.sh whenever a served file or a verifier moved:

    python3 tools/vaic_restamp.py

Two policies, both tested in tools/test-vaic.py:

- stamp: the candidate block's identity values are rewritten IN PLACE (value
  substitution inside the candidate object only). No receipt is touched.
- append: each automated-set obligation gets ONE new receipt bound to the current
  candidate, carrying its harness's real exit status as the result and mirroring
  that result into the row. The template is the obligation's latest receipt this
  tool knows how to re-run; EXTERNAL (browser) receipts are never re-run here.
  Existing receipts are never edited: re-evaluation appends.

The corpus is hand-formatted, so both edits are text-level and the file is
re-parsed against the intended object before it is kept.
"""

from __future__ import annotations

import copy
import datetime
import importlib.util
import json
import re
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CORPUS = ROOT / "vaic/cytherai-obligations.v0.json"
JSC = "/System/Library/Frameworks/JavaScriptCore.framework/Versions/A/Helpers/jsc"
# harness_identity, as receipts name it -> the command whose exit status IS the observation
# The world's harnesses (tools/test-ledger.js; tools/test-site.py plus tools/test-motion.py)
# retired with it to backup/instrument-v1/: their obligations gain no receipt on a build
# that does not ship the mechanism they observed.
HARNESS = {
    "tools/test-claims.js": [JSC, "js/manifest.js", "js/claims.js", "tools/test-claims.js"],
    "deploy.sh plus tools/test-site.py": [
        "python3", "tools/test-site.py",
        "SiteContractTests.test_deploy_allowlist_and_service_worker_cannot_drift"],
}
RECEIPT_BINDING = ("artifact_manifest_hash", "record_hash", "grammar_hash", "policy_hash", "verification_identity")

sys.dont_write_bytecode = True
# one validator instance per process, so CorpusError is the same class everywhere
VAIC = sys.modules.get("vaic_validate")
if VAIC is None:
    _SPEC = importlib.util.spec_from_file_location("vaic_validate", ROOT / "tools/vaic_validate.py")
    assert _SPEC and _SPEC.loader
    VAIC = sys.modules["vaic_validate"] = importlib.util.module_from_spec(_SPEC)
    _SPEC.loader.exec_module(VAIC)


def candidate_identity(root: Path) -> dict[str, str]:
    cover = VAIC.IDENTITY_COVERAGE
    return {
        "build_identity": VAIC.build_identity(root),
        "record_hash": VAIC.sha256_file(root / "js/manifest.js"),
        "kernel_hash": VAIC.shasum_manifest_hash(root, list(cover["kernel_hash"])),
        "grammar_hash": VAIC.shasum_manifest_hash(root, list(cover["grammar_hash"])),
        "policy_hash": VAIC.sha256_file(root / "vaic/evaluator-matrix.v0.json"),
        "artifact_manifest_hash": VAIC.artifact_identity(root)[0],
        "verification_identity": VAIC.shasum_manifest_hash(root, list(cover["verification_identity"])),
    }


def _span(raw: str, start: int, opener: str, closer: str) -> tuple[int, int]:
    """Indices of the balanced pair opening at the first `opener` after `start`, string-aware."""
    i = raw.index(opener, start)
    depth, j, in_string = 0, i, False
    while True:
        ch = raw[j]
        if in_string:
            if ch == "\\":
                j += 1
            elif ch == '"':
                in_string = False
        elif ch == '"':
            in_string = True
        elif ch == opener:
            depth += 1
        elif ch == closer:
            depth -= 1
            if depth == 0:
                return i, j
        j += 1


def _set_value(block: str, key: str, value: str) -> str:
    pattern = re.compile(r'("%s"\s*:\s*")([^"]*)(")' % re.escape(key))
    if pattern.search(block) is None:
        raise VAIC.CorpusError(f"no {key!r} to rewrite")
    return pattern.sub(lambda m: m.group(1) + value + m.group(3), block, count=1)


def stamp(root: Path = ROOT, corpus: Path = CORPUS) -> list[str]:
    """Rewrite the candidate's identity values in place; returns the fields that moved."""
    raw = corpus.read_text(encoding="utf-8")
    i, j = _span(raw, raw.index('"candidate"'), "{", "}")
    block, moved = raw[i:j + 1], []
    before = json.loads(block)
    for key, value in candidate_identity(root).items():
        if before.get(key) != value:
            moved.append(key)
        block = _set_value(block, key, value)
    corpus.write_text(raw[:i] + block + raw[j + 1:], encoding="utf-8")
    return moved


def _row_span(raw: str, oid: str, key: str) -> tuple[int, int]:
    """The balanced span of `key`'s value inside obligation `oid` (its own evaluation)."""
    at = raw.index('"id": "%s"' % oid)
    opener, closer = ("[", "]") if key == "receipts" else ("{", "}")
    return _span(raw, raw.index('"%s"' % key, at), opener, closer)


def append(root: Path = ROOT, corpus: Path = CORPUS, harness=HARNESS, today: str | None = None) -> list[tuple[str, str]]:
    """Append one current receipt per automated obligation; returns (id, result) pairs."""
    raw = corpus.read_text(encoding="utf-8")
    parsed = json.loads(raw)
    cand = parsed["candidate"]
    if cand["build_identity"] != VAIC.build_identity(root):
        raise VAIC.CorpusError("candidate is stale: stamp before appending")
    today = today or datetime.date.today().isoformat()
    expected, added = copy.deepcopy(parsed), []
    for row, erow in zip(parsed["obligations"], expected["obligations"]):
        receipts = row["evaluation"].get("receipts") or []
        if any(r.get("artifact_build") == cand["build_identity"]
               and r.get("verification_identity") == cand["verification_identity"] for r in receipts):
            continue
        templates = [r for r in receipts
                     if r.get("harness_identity") in harness and r.get("verification_identity") != VAIC.EXTERNAL]
        if not templates:
            continue
        receipt = copy.deepcopy(templates[-1])
        run = subprocess.run(harness[receipt["harness_identity"]], cwd=root, capture_output=True, text=True)
        receipt["artifact_build"] = receipt["harness_version"] = cand["build_identity"]
        receipt.update({key: cand[key] for key in RECEIPT_BINDING})
        receipt["observed_at"] = today
        receipt["result"] = "PASS" if run.returncode == 0 else "FAIL"
        erow["evaluation"]["receipts"].append(receipt)
        erow["evaluation"]["result"] = receipt["result"]
        added.append((row["id"], receipt["result"]))
        # the row's recorded result mirrors its current receipt
        i, j = _row_span(raw, row["id"], "evaluation")
        raw = raw[:i] + _set_value(raw[i:j + 1], "result", receipt["result"]) + raw[j + 1:]
        # insert after the last receipt, one level in from the array's closing bracket
        i, j = _row_span(raw, row["id"], "receipts")
        indent = raw[raw.rfind("\n", 0, j) + 1:j]
        if indent.strip():
            raise VAIC.CorpusError(f"{row['id']}: receipts must close on their own line")
        body = "\n".join(indent + "  " + line for line in json.dumps(receipt, indent=2, ensure_ascii=False).splitlines())
        k = i + len(raw[i:j].rstrip())
        raw = raw[:k] + ",\n" + body + raw[k:]
    if json.loads(raw) != expected:
        raise VAIC.CorpusError("text insertion diverged from the intended corpus")
    corpus.write_text(raw, encoding="utf-8")
    return added


def main() -> int:
    moved = stamp()
    added = append()
    print("candidate:", "moved " + ", ".join(moved) if moved else "unchanged")
    print("receipts:", ", ".join(f"{oid}={result}" for oid, result in added) or "none appended (already current)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
