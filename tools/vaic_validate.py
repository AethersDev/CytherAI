#!/usr/bin/env python3
"""Validate the VAIC-0 obligation corpus without pretending to evaluate it.

The validator checks the research object: schema completeness, monotone mandatory
sources, evaluator authority, coverage scope, receipt/candidate binding, evidence
references, dependency consistency, and the DSL kill criterion. It reports the
declared projection/origin result but does not turn a FAIL or NOT_EVALUATED into a
tool error. Structural invalidity does exit nonzero.

A receipt says WHAT WAS OBSERVED. Its binding says WHERE that observation applies.
The verdict for the current candidate is derived from both, and the three are kept
apart on purpose:

    OBSERVATION                 BINDING              EFFECTIVE
    PASS | FAIL | NOT_EVALUATED CURRENT | STALE      derived
    PASS  + CURRENT  -> PASS          PASS + STALE -> NOT_EVALUATED
    FAIL  + CURRENT  -> FAIL          FAIL + STALE -> NOT_EVALUATED

A new build does not erase an observation; it expires that observation's authority
over the candidate. A historical FAIL no longer condemns a new candidate and a
historical PASS no longer certifies one: both become history until reproduced.
Stale-but-well-formed evidence is therefore VALID data reporting INCOMPLETE current
evidence, never corpus corruption. INVALID is reserved for malformed data: a bad
digest, an unresolvable evidence pointer, a dependency cycle, a schema violation, or
contradictory binding metadata such as a receipt that claims the current build while
carrying another candidate's digest.

Evidence resolves by identity and semantic anchor, never by textual coordinate:

    receipt -> build identity -> covered file identity -> symbol or EVIDENCE marker

A cited file must belong to a declared identity set, and the anchor must be defined
in it exactly once. Line numbers may drift without invalidating evidence; anchors may
not. An anchor that has been deleted or become ambiguous is INVALID, not
NOT_EVALUATED, because the historical record itself has stopped resolving.

The boundary is total. For every input the tool answers with exactly one of:

    VALID report      exit 0    the corpus is well formed
    INVALID report    exit 1    a judgment about the DATA, errors enumerated
    INTERNAL_ERROR    exit 2    a defect in THIS TOOL, traceback printed

Only the third is a validator failure. Malformed data can never escape as a Python
exception, so a hostile or merely broken corpus cannot manufacture an apparent tooling
outage in place of the judgment it has earned.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import re
import sys
import traceback
from collections import Counter
from pathlib import Path
from typing import Any


ROOT = Path(__file__).resolve().parents[1]
DEFAULT_CORPUS = ROOT / "vaic/cytherai-obligations.v0.json"
DEFAULT_MATRIX = ROOT / "vaic/evaluator-matrix.v0.json"

RESULTS = {"PASS", "FAIL", "NOT_EVALUATED"}
IDENTITY_FIELDS = ("artifact_manifest_hash", "record_hash", "grammar_hash", "policy_hash")
DIGEST = re.compile(r"[0-9a-f]{64}")

# Identities are separated by epistemic role and never collapsed into one digest, so a
# receipt can state exactly what moved: a verifier-only change must not pretend the
# product grammar changed, and a substrate change must not inherit an old verifier.
IDENTITY_COVERAGE = {
    "record_hash": ("js/manifest.js",),
    "kernel_hash": ("js/manifest.js", "js/claims.js", "js/ledger.js"),
    "grammar_hash": ("index.html", "js/substrate.js", "js/site.js", "js/develop-worker.js"),
    "policy_hash": ("vaic/evaluator-matrix.v0.json",),
    "verification_identity": (
        "verify.sh", "deploy.sh", "generate-integrity.sh",
        "tools/vaic_validate.py", "tools/test-vaic.py", "tools/test-site.py",
        "tools/test-motion.py", "tools/test-claims.js", "tools/test-ledger.js",
        "tools/test-develop.js", "tools/test-poster.py", "tools/vaic_restamp.py",
        "tools/test-exposure.js", "tools/test-projection.py", "tools/test-projection.js",
        "tools/project-manifest.py", "tools/test-assets.py", "tools/project-obligations.py",
        "tools/test-api.py", "tools/test-boundary.js", "tools/test-drawing-set.js",
    ),
    "evidence_ledger": ("vaic/evidence/current-browser-observations.v0.json",),
}
# A receipt may only cite a file some identity set covers. Without this a future
# receipt could point into a new helper nobody remembered to bind.
COVERED = frozenset(path for paths in IDENTITY_COVERAGE.values() for path in paths)
# a verifier that is not the declared set, and a receipt issued before verifiers were
# recorded; UNRECORDED can never speak for the current candidate
EXTERNAL, UNRECORDED = "EXTERNAL", "UNRECORDED"
MANDATORY_SOURCES = {"core", "grammar", "profile", "origin"}
PROJECTION_MANDATORY = {"mandatory"}
# Shape is declared once, as types rather than names, so the SHAPE stage can hand
# later stages objects they may index without checking.
ROW_TYPES = {
    "id": str, "version": int, "scope": str, "layer": str, "severity": str,
    "contexts": dict, "quantifier": str, "trigger": str, "subject": str,
    "relation": str, "object": str, "bound": dict, "mandatory_source": str,
    "authorized_evaluators": list, "required_coverage": dict,
    "failure_semantics": str, "depends_on": list, "incompatible_with": list,
    "relation_implementation": str, "evaluation": dict,
}
EVALUATION_TYPES = {"result": str, "receipts": list}
RECEIPT_TYPES = {
    "evaluator": str, "coverage": str, "artifact_build": str,
    "artifact_manifest_hash": str, "record_hash": str, "grammar_hash": str,
    "policy_hash": str, "verification_identity": str, "environment": dict,
    "harness_identity": str, "harness_version": str, "method": dict,
    "result": str, "evidence": list, "observed_at": str,
}


class CorpusError(ValueError):
    pass


def load_json(path: Path) -> dict[str, Any]:
    try:
        value = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as exc:
        raise CorpusError(f"cannot load {path}: {exc}") from exc
    if not isinstance(value, dict):
        raise CorpusError(f"{path}: root must be an object")
    return value


def current_build(root: Path) -> str:
    source = (root / "index.html").read_text(encoding="utf-8")
    match = re.search(r'<meta name="build-hash" content="([0-9A-F]+)">', source)
    if not match:
        raise CorpusError("index.html: build-hash meta not found")
    return match.group(1)


def sha256_file(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def shasum_manifest_hash(root: Path, relatives: list[str]) -> str:
    manifest = "".join(f"{sha256_file(root / relative)}  {relative}\n" for relative in relatives)
    return hashlib.sha256(manifest.encode("utf-8")).hexdigest()


# The build identity is stamped INTO two of the files it identifies, so those two
# fields are blanked before hashing; generate-integrity.sh applies the same edits.
STAMPED_FIELDS = (
    (re.compile(r"\.html$"), re.compile(rb'(<meta name="build-hash" content=")[^"]*(">)'), rb"\1\2"),
    (re.compile(r"^sw\.js$"), re.compile(rb"(var CACHE = 'cytherai-substrate-)[0-9A-F]*"), rb"\1"),
)


def build_identity(root: Path) -> str:
    """The 16-hex identity the pages print: a projection of EVERY served byte.

    The same canonical manifest as artifact_identity, over deploy.paths, with the
    two stamped fields blanked so the identity can be written into what it names.
    An HTML, worker, or asset change moves it exactly as a module change does, so
    one identity names one served candidate.
    """
    lines = []
    for relative in deploy_paths(root):
        path = root / relative
        if not path.is_file():
            continue
        data = path.read_bytes()
        for name, field, blank in STAMPED_FIELDS:
            if name.search(relative):
                data = field.sub(blank, data)
        lines.append(f"{hashlib.sha256(data).hexdigest()}  {relative}\n")
    return hashlib.sha256("".join(lines).encode("utf-8")).hexdigest()[:16].upper()


def deploy_paths(root: Path) -> list[str]:
    """The single declaration of what is deployable, shared with deploy.sh.

    Sorted rather than kept in declaration order: reordering the declaration is an
    authoring detail, while a renamed or moved path is a different artifact topology
    and does change the identity, because the path is hashed beside its bytes.
    """
    declaration = root / "deploy.paths"
    if not declaration.is_file():
        return []
    return sorted(line.strip() for line in declaration.read_text(encoding="utf-8").splitlines()
                  if line.strip())


def artifact_identity(root: Path) -> tuple[str, list[str]]:
    """A deterministic projection of TRACKED SOURCE, never a hash of build residue.

    Two clean checkouts of one commit yield the same identity without building
    anything, a stray dist/.DS_Store cannot change it, and deleting dist/ entirely
    leaves it computable. It answers "exactly what bytes constitute this candidate",
    which is a different question from the one git answers about where they came from,
    so no commit id, dirty flag, timestamp or traversal order enters the digest.
    """
    declared = deploy_paths(root)
    missing = [path for path in declared if not (root / path).is_file()]
    present = [path for path in declared if path not in set(missing)]
    return shasum_manifest_hash(root, present), missing


def anchor_sites(source: str, anchor: str) -> list[int]:
    """Line numbers where `anchor` is DEFINED, in the small vocabulary receipts use.

    Program structure where the language provides it, an explicit EVIDENCE marker
    where it does not. Uses and calls are not definitions, so an anchor names one
    semantic object rather than every mention of a word.
    """
    name = re.escape(anchor)
    pattern = re.compile(
        rf"^[ \t]*(?:function|def)[ \t]+{name}\b"          # JavaScript / Python definition
        rf"|^[ \t]*(?:const|let|var)[ \t]+{name}[ \t]*="   # JavaScript binding
        rf"|^[ \t]*{name}[ \t]*\(\)[ \t]*\{{"              # shell function
        rf"|EVIDENCE:[ \t]*{name}(?![\w-])",               # explicit marker
        re.MULTILINE)
    return [source.count("\n", 0, match.start()) + 1 for match in pattern.finditer(source)]


def evidence_defect(root: Path, reference: str, observed_build: str) -> str | None:
    """Why this evidence reference does not resolve, or None when it does.

    A location is not an identity. A citation resolves through the identity that
    covers the file and then through a semantic anchor inside it, so inserting
    lines above the cited code cannot invalidate a receipt and deleting the cited
    object cannot silently keep one alive.
    """
    path_text, separator, anchor = reference.partition("#")
    if path_text not in COVERED:
        return f"cites {path_text}, which no identity set covers"
    path = root / path_text
    if not path.is_file():
        return f"cites missing file {path_text}"
    source = path.read_text(encoding="utf-8")
    if not separator:
        return None
    if path.suffix == ".json":
        try:
            document = json.loads(source)
        except json.JSONDecodeError:
            return f"cites unparseable {path_text}"
        observation = document.get("observations", {}).get(anchor)
        if not isinstance(observation, dict):
            return f"cites absent observation {anchor!r} in {path_text}"
        if observation.get("artifact_build") != observed_build:
            return f"cites observation {anchor!r}, which was not made on build {observed_build}"
        return None
    sites = anchor_sites(source, anchor)
    if not sites:
        return f"cites anchor {anchor!r}, which {path_text} does not define"
    if len(sites) > 1:
        return f"cites anchor {anchor!r}, which {path_text} defines {len(sites)} times"
    return None


def dependency_cycle(edges: dict[str, list[str]]) -> list[str] | None:
    """Walks an edge map of shape-valid rows only; an unknown node cannot participate."""
    visiting: set[str] = set()
    visited: set[str] = set()

    def walk(node: str, path: list[str]) -> list[str] | None:
        if node in visiting:
            return path[path.index(node):] + [node]
        if node in visited:
            return None
        visiting.add(node)
        for child in edges[node]:
            if child in edges:
                found = walk(child, path + [child])
                if found:
                    return found
        visiting.discard(node)
        visited.add(node)
        return None

    for node in edges:
        found = walk(node, [node])
        if found:
            return found
    return None


def shape_defects(value: Any, types: dict[str, type], label: str) -> list[str]:
    """Every way `value` fails to be the declared shape, described but not repaired."""
    if not isinstance(value, dict):
        return [f"{label} must be an object, not {type(value).__name__}"]
    defects = []
    for name, kind in types.items():
        if name not in value:
            defects.append(f"{label} is missing {name}")
        elif not isinstance(value[name], kind) or isinstance(value[name], bool) and kind is int:
            defects.append(f"{label} field {name} must be {kind.__name__}, "
                           f"not {type(value[name]).__name__}")
    return defects


def verifier_binding(value: Any) -> tuple[str, str | None]:
    """Provenance state first, digest second.

    EXTERNAL and UNRECORDED are states, not identities; resolving the state before
    any digest operation keeps a sentinel out of the digest namespace.
    """
    if value == EXTERNAL:
        return EXTERNAL, None
    if value == UNRECORDED:
        return UNRECORDED, None
    if isinstance(value, str) and DIGEST.fullmatch(value):
        return "DIGEST", value
    return "MALFORMED", None


def distribution(counts: Counter, licensed: bool) -> dict[str, Any]:
    """A distribution that a structurally invalid corpus cannot license.

    Counts taken while an obligation failed to parse describe the survivors, not the
    corpus. Publishing them as the corpus's verdict is how an eighteenth obligation
    disappears silently, so an invalid corpus reports them as diagnostic only.
    """
    tally = {name: counts.get(name, 0) for name in ("PASS", "FAIL", "NOT_EVALUATED")}
    return {"status": "LICENSED", "counts": tally} if licensed else \
           {"status": "NOT_LICENSED", "diagnostic_partial": tally}


def validate(corpus: dict[str, Any], matrix: dict[str, Any], root: Path = ROOT) -> dict[str, Any]:
    """Total over data: any input yields a VALID or INVALID report, never an exception.

    Validation is staged, and each stage consumes only what the previous one typed:
    SHAPE, then REFERENCE, then IDENTITY, then GRAPH, then admissibility, then the
    effective verdict. The governing rule is that invalid objects may be DESCRIBED
    but may not PARTICIPATE — a row that fails SHAPE never reaches the dependency
    graph, a malformed digest never reaches a binding comparison, and a receipt that
    cannot be typed binds nothing. Malformed data is a judgment about the corpus, so
    it is reported as INVALID; only a defect in this validator is a tool failure.
    """
    errors: list[str] = []

    # ---- RAW ---------------------------------------------------------------
    if not isinstance(corpus, dict):
        errors.append("corpus must be an object")
        corpus = {}
    if not isinstance(matrix, dict):
        errors.append("evaluator matrix must be an object")
        matrix = {}
    if corpus.get("specification") != "VAIC-0" or matrix.get("specification") != "VAIC-0":
        errors.append("corpus and evaluator matrix must identify VAIC-0")

    semantics = corpus.get("semantics")
    if not isinstance(semantics, dict):
        errors.append("corpus semantics must be an object")
        semantics = {}
    if semantics.get("compensatory_scoring") is not False:
        errors.append("compensatory scoring must be false")
    if semantics.get("policy_may_remove_core_or_grammar") is not False:
        errors.append("policy must not remove core or grammar obligations")

    # ---- IDENTITY (candidate) ----------------------------------------------
    candidate = corpus.get("candidate")
    if not isinstance(candidate, dict):
        errors.append("corpus candidate must be an object")
        candidate = {}
    build = current_build(root)
    served = build_identity(root)
    if build != served:
        errors.append(f"index.html build-hash {build!r} is stale: the served bytes identify as {served!r}")
    if candidate.get("build_identity") != build:
        errors.append(f"candidate build {candidate.get('build_identity')!r} "
                      f"does not match index.html {build!r}")
    artifact_digest, undeclared = artifact_identity(root)
    if not deploy_paths(root):
        errors.append("deploy.paths must declare the deployable set")
    for path in undeclared:
        errors.append(f"deploy.paths declares {path}, which is not in the tree")
    expected_identities = {
        "record_hash": sha256_file(root / "js/manifest.js"),
        "kernel_hash": shasum_manifest_hash(root, list(IDENTITY_COVERAGE["kernel_hash"])),
        "grammar_hash": shasum_manifest_hash(root, list(IDENTITY_COVERAGE["grammar_hash"])),
        "policy_hash": sha256_file(root / "vaic/evaluator-matrix.v0.json"),
        "artifact_manifest_hash": artifact_digest,
        "verification_identity": shasum_manifest_hash(root, list(IDENTITY_COVERAGE["verification_identity"])),
    }
    for name, expected in expected_identities.items():
        if candidate.get(name) != expected:
            errors.append(f"candidate {name} is stale: {candidate.get(name)!r} != {expected!r}")

    relations = corpus.get("relations")
    if not isinstance(relations, list):
        errors.append("corpus relations must be a list")
        relations = []
    declared_relations = {name for name in relations if isinstance(name, str)}
    falsification = corpus.get("falsification")
    if not isinstance(falsification, dict):
        errors.append("corpus falsification must be an object")
        falsification = {}
    escape = falsification.get("forbidden_escape_relations")
    if not isinstance(escape, list):
        errors.append("forbidden_escape_relations must be a list")
        escape = []
    forbidden = {name for name in escape if isinstance(name, str)}
    escaped = declared_relations & forbidden
    if escaped:
        errors.append(f"forbidden escape relations declared: {sorted(escaped)}")

    evaluator_rows = matrix.get("evaluators")
    if not isinstance(evaluator_rows, list):
        errors.append("evaluator matrix evaluators must be a list")
        evaluator_rows = []
    evaluators = {row["class"]: row for row in evaluator_rows
                  if isinstance(row, dict) and isinstance(row.get("class"), str)}
    if len(evaluators) != len(evaluator_rows):
        errors.append("evaluator classes must be present and unique")
    declared_coverage = matrix.get("coverage_classes")
    if not isinstance(declared_coverage, dict):
        errors.append("evaluator matrix coverage_classes must be an object")
        declared_coverage = {}
    coverage_classes = set(declared_coverage)

    # ---- SHAPE -------------------------------------------------------------
    raw_rows = corpus.get("obligations")
    if not isinstance(raw_rows, list) or not raw_rows:
        errors.append("corpus must contain a non-empty obligations list")
        raw_rows = []
    shaped: list[dict[str, Any]] = []
    for index, row in enumerate(raw_rows):
        label = row["id"] if isinstance(row, dict) and isinstance(row.get("id"), str) \
            else f"obligation[{index}]"
        defects = shape_defects(row, ROW_TYPES, label)
        if not defects:
            defects = shape_defects(row["evaluation"], EVALUATION_TYPES, f"{label} evaluation")
        if defects:
            errors.extend(defects)
            continue                    # described, but it enters no later stage
        shaped.append(row)

    ids = [row["id"] for row in shaped]
    if len(ids) != len(set(ids)):
        errors.append("obligation ids must be unique")
    by_id = {row["id"]: row for row in shaped}

    # ---- ADMISSIBILITY, REFERENCE and BINDING ------------------------------
    effective: dict[str, str] = {}
    for row in shaped:
        oid = row["id"]
        if row["mandatory_source"] not in MANDATORY_SOURCES:
            errors.append(f"{oid}: invalid mandatory_source {row['mandatory_source']!r}")
        if row["mandatory_source"] in {"core", "grammar"} and row["severity"] != "mandatory":
            errors.append(f"{oid}: inherited core/grammar obligation must be mandatory")
        if row["relation"] not in declared_relations:
            errors.append(f"{oid}: undeclared relation {row['relation']!r}")
        if row["relation"] in forbidden:
            errors.append(f"{oid}: uses forbidden escape relation {row['relation']!r}")
        if not row["contexts"] or not row["quantifier"] or not row["trigger"]:
            errors.append(f"{oid}: encounter scope, quantifier, and trigger must be explicit")

        classes = row["required_coverage"].get("classes")
        required_classes = {name for name in classes if isinstance(name, str)} \
            if isinstance(classes, list) else set()
        if not required_classes or not required_classes <= coverage_classes:
            errors.append(f"{oid}: invalid required coverage classes {sorted(required_classes)}")
        if not row["authorized_evaluators"]:
            errors.append(f"{oid}: no authorized evaluator")
        for evaluator in row["authorized_evaluators"]:
            if not isinstance(evaluator, str) or evaluator not in evaluators:
                errors.append(f"{oid}: unknown authorized evaluator {evaluator!r}")
                continue
            authority = evaluators[evaluator].get("relations")
            if not isinstance(authority, list) or row["relation"] not in authority:
                errors.append(f"{oid}: evaluator {evaluator} lacks authority for {row['relation']}")
        for linked in row["depends_on"] + row["incompatible_with"]:
            if not isinstance(linked, str) or linked not in by_id:
                errors.append(f"{oid}: references missing obligation {linked!r}")
        if oid in row["depends_on"] or oid in row["incompatible_with"]:
            errors.append(f"{oid}: cannot depend on or conflict with itself")

        evaluation = row["evaluation"]
        result, receipts = evaluation["result"], evaluation["receipts"]
        if result not in RESULTS:
            errors.append(f"{oid}: invalid result {result!r}")
            continue                    # cannot license a verdict it does not name
        if result in {"PASS", "FAIL"} and not receipts:
            errors.append(f"{oid}: {result} requires at least one receipt")
        if result == "NOT_EVALUATED":
            if receipts:
                errors.append(f"{oid}: NOT_EVALUATED must not carry authoritative receipts")
            if not evaluation.get("reason"):
                errors.append(f"{oid}: NOT_EVALUATED requires a reason")

        bindings: list[str] = []
        seen: set[tuple[str, str]] = set()
        for position, receipt in enumerate(receipts):
            label = f"{oid} receipt[{position}]"
            defects = shape_defects(receipt, RECEIPT_TYPES, label)
            if defects:
                errors.extend(defects)
                continue                # a receipt that cannot be typed binds nothing
            if receipt["evaluator"] not in row["authorized_evaluators"]:
                errors.append(f"{label}: evaluator {receipt['evaluator']!r} is not authorized")
            if receipt["coverage"] not in required_classes:
                errors.append(f"{label}: coverage {receipt['coverage']!r} is not licensed by the obligation")
            if receipt["result"] != result:
                errors.append(f"{label}: result does not match the obligation result")
            if not receipt["environment"]:
                errors.append(f"{label}: environment must be explicit")
            if not receipt["method"]:
                errors.append(f"{label}: method must be explicit")

            # An observation binds BOTH the candidate it was made on and the verifier
            # that produced it; either moving expires its authority over the candidate
            # without touching what was observed. A receipt that claims THIS build
            # while carrying another candidate's digest is contradictory metadata,
            # which is malformed data rather than staleness.
            observed_build = receipt["artifact_build"]
            state, digest = verifier_binding(receipt["verification_identity"])
            if state == "MALFORMED":
                errors.append(f"{label}: verification_identity must be a digest, "
                              f"{EXTERNAL} or {UNRECORDED}")
                continue
            verifier_current = state == EXTERNAL or (
                state == "DIGEST" and digest == candidate.get("verification_identity"))
            # a receipt is identified by what it observed and who observed it; two
            # receipts with one identity make admitted history ambiguous to audit
            identity = (observed_build, receipt["verification_identity"])
            if identity in seen:
                errors.append(f"{label}: duplicate receipt identity {identity[0]} / "
                              f"{identity[1][:12]}")
            seen.add(identity)
            malformed_identity = False
            for identity in IDENTITY_FIELDS:
                value = receipt[identity]
                if not DIGEST.fullmatch(value):
                    errors.append(f"{label}: {identity} is not a sha256 digest")
                    malformed_identity = True
                # Contradiction requires the receipt to claim this exact candidate AND
                # this exact verifier: the same verifier on the same build could not
                # have recorded a different product digest. A receipt from an older
                # verification epoch is history, and its digests are that epoch's.
                elif observed_build == build and verifier_current and value != candidate.get(identity):
                    errors.append(f"{label}: claims build {build} but its {identity} "
                                  f"is another candidate's")
                    malformed_identity = True
            if malformed_identity:
                continue                # an unresolvable identity binds nothing

            if not receipt["evidence"]:
                errors.append(f"{label}: carries no evidence references")
            resolved = True
            for reference in receipt["evidence"]:
                if not isinstance(reference, str):
                    errors.append(f"{label}: evidence reference must be a string")
                    resolved = False
                    continue
                # evidence resolves against the build the observation names, so a
                # historical receipt keeps pointing at the record it was drawn from
                defect = evidence_defect(root, reference, observed_build)
                if defect:
                    errors.append(f"{label}: {defect}")
                    resolved = False
            if not resolved:
                continue                # unresolved evidence cannot license anything
            bindings.append("CURRENT" if observed_build == build and verifier_current else "STALE")

        # the observation stands as recorded; only a receipt bound to this candidate
        # licenses that observation to speak for it
        effective[oid] = result if "CURRENT" in bindings else "NOT_EVALUATED"

    # ---- GRAPH -------------------------------------------------------------
    edges = {row["id"]: [link for link in row["depends_on"] if isinstance(link, str)]
             for row in shaped}
    cycle = dependency_cycle(edges)
    if cycle:
        errors.append("dependency cycle: " + " -> ".join(cycle))

    bespoke = sum(row["relation_implementation"] != "reusable" for row in shaped)
    ratio = bespoke / len(shaped) if shaped else 0.0
    kill_ratio = falsification.get("bespoke_relation_kill_ratio", 0.25)
    if isinstance(kill_ratio, bool) or not isinstance(kill_ratio, (int, float)):
        errors.append(f"bespoke_relation_kill_ratio must be a number, not {type(kill_ratio).__name__}")
        kill_ratio = 0.25
    if ratio > kill_ratio:
        errors.append(f"bespoke relation ratio {ratio:.1%} exceeds kill criterion {kill_ratio:.1%}")

    # ---- EFFECTIVE VERDICT -------------------------------------------------
    licensed = not errors
    observed = Counter(row["evaluation"]["result"] for row in shaped)
    counts = Counter(effective.values())
    projection_rows = [row for row in shaped
                       if row["scope"] == "projection" and row["severity"] in PROJECTION_MANDATORY]
    origin_rows = [row for row in shaped
                   if row["scope"] == "origin" and row["severity"] == "release_mandatory"]
    projection_valid = licensed and bool(projection_rows) and \
        all(effective.get(row["id"]) == "PASS" for row in projection_rows)
    origin_valid = licensed and bool(origin_rows) and \
        all(effective.get(row["id"]) == "PASS" for row in origin_rows)
    # an obligation that recorded an observation but has no receipt bound to this
    # candidate is not missing evidence — it is holding evidence that has expired
    expired = sorted(oid for oid, verdict in effective.items()
                     if verdict == "NOT_EVALUATED" and by_id[oid]["evaluation"]["receipts"])
    return {
        "structure": "VALID" if licensed else "INVALID",
        "obligations": len(raw_rows),
        "effective_distribution": distribution(counts, licensed),
        "observed_distribution": distribution(observed, licensed),
        "current_evidence": "COMPLETE" if licensed and not expired else "INCOMPLETE",
        "expired_bindings": expired,
        "projection": "VALID" if projection_valid else "INVALID",
        "origin": "VALID" if origin_valid else "NOT_CERTIFIED",
        "release": "CERTIFIED" if projection_valid and origin_valid else "NOT_CERTIFIED",
        "bespoke_relation_ratio": ratio,
        "errors": errors,
    }


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--corpus", type=Path, default=DEFAULT_CORPUS)
    parser.add_argument("--matrix", type=Path, default=DEFAULT_MATRIX)
    parser.add_argument("--json", action="store_true")
    args = parser.parse_args()
    try:
        summary = validate(load_json(args.corpus), load_json(args.matrix))
    except CorpusError as exc:
        # the corpus could not be read at all: still a judgment about the input
        print(f"VAIC-0 STRUCTURE INVALID: {exc}", file=sys.stderr)
        return 1
    except Exception:                     # noqa: BLE001 - the process boundary
        # Malformed data is INVALID above; reaching here means THIS TOOL failed, and a
        # corpus must never be able to manufacture an apparent outage instead of the
        # judgment it has earned. The traceback is re-raised as output, not swallowed.
        traceback.print_exc()
        print("VAIC-0 INTERNAL_ERROR: the validator failed; this is a defect in the "
              "validator, not a verdict on the corpus", file=sys.stderr)
        return 2
    if args.json:
        print(json.dumps(summary, indent=2, sort_keys=True))
    else:
        effective, observed = summary["effective_distribution"], summary["observed_distribution"]
        if effective["status"] == "LICENSED":
            counts, seen = effective["counts"], observed["counts"]
            print(f"VAIC-0 corpus: {summary['obligations']} obligations · "
                  f"{counts['PASS']} PASS · {counts['FAIL']} FAIL · "
                  f"{counts['NOT_EVALUATED']} NOT_EVALUATED  (verdict for this candidate)")
            print(f"VAIC-0 observed: {seen['PASS']} PASS · {seen['FAIL']} FAIL · "
                  f"{seen['NOT_EVALUATED']} NOT_EVALUATED  (as recorded, any build)")
        else:
            partial = effective["diagnostic_partial"]
            print(f"VAIC-0 corpus: {summary['obligations']} obligations · "
                  f"verdict distribution NOT LICENSED by an invalid corpus")
            print(f"VAIC-0 diagnostic only, over parsed survivors: {partial['PASS']} PASS · "
                  f"{partial['FAIL']} FAIL · {partial['NOT_EVALUATED']} NOT_EVALUATED")
        print(f"VAIC-0 current evidence: {summary['current_evidence']}"
              + (" · expired bindings: " + ", ".join(summary["expired_bindings"])
                 if summary["expired_bindings"] else ""))
        print(f"VAIC-0 structure: {summary['structure']}")
        print(f"VAIC-0 projection: {summary['projection']}")
        print(f"VAIC-0 origin: {summary['origin']}")
        print(f"VAIC-0 release: {summary['release']}")
        print(f"VAIC-0 bespoke relation ratio: {summary['bespoke_relation_ratio']:.1%}")
        for error in summary["errors"]:
            print("ERROR " + error, file=sys.stderr)
    return 0 if summary["structure"] == "VALID" else 1


if __name__ == "__main__":
    raise SystemExit(main())
