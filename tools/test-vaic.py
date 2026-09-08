#!/usr/bin/env python3
"""Structural and fail-closed negative controls for the VAIC-0 corpus."""

from __future__ import annotations

import copy
import importlib.util
import json
import subprocess
import sys
import tempfile
import unittest
from collections import Counter
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
CORPUS = "vaic/cytherai-obligations.v0.json"
# A commit records a state; canonical reachability ADMITS it. Without a designated
# lineage, a receipt on any throwaway branch would become institutional history, and
# deleting that branch would make admitted history vanish. Both cannot be acceptable.
CANONICAL_REF = "refs/heads/master"
sys.dont_write_bytecode = True
SPEC = importlib.util.spec_from_file_location("vaic_validate", ROOT / "tools/vaic_validate.py")
assert SPEC and SPEC.loader
VAIC = sys.modules["vaic_validate"] = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(VAIC)
RESTAMP_SPEC = importlib.util.spec_from_file_location("vaic_restamp", ROOT / "tools/vaic_restamp.py")
assert RESTAMP_SPEC and RESTAMP_SPEC.loader
RESTAMP = importlib.util.module_from_spec(RESTAMP_SPEC)
RESTAMP_SPEC.loader.exec_module(RESTAMP)


class VaicCorpusTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        cls.corpus = VAIC.load_json(ROOT / CORPUS)
        cls.matrix = VAIC.load_json(ROOT / "vaic/evaluator-matrix.v0.json")

    def validate(self, corpus=None, matrix=None):
        # `is None`, not truthiness: an empty corpus is an input under test, not a default
        return VAIC.validate(self.corpus if corpus is None else corpus,
                             self.matrix if matrix is None else matrix, ROOT)

    @staticmethod
    def tally(distribution):
        return distribution["counts"] if distribution["status"] == "LICENSED" \
            else distribution["diagnostic_partial"]

    def counts(self, result):
        return self.tally(result["effective_distribution"])

    def observed(self, result):
        return self.tally(result["observed_distribution"])

    @staticmethod
    def is_current(receipt, candidate):
        """Fully current: every binding coordinate matches, not just the build."""
        return receipt.get("artifact_build") == candidate["build_identity"] and \
            receipt.get("verification_identity") in (candidate["verification_identity"], VAIC.EXTERNAL)

    @classmethod
    def current_receipt(cls, corpus):
        for row in corpus["obligations"]:
            for receipt in row["evaluation"].get("receipts") or []:
                if cls.is_current(receipt, corpus["candidate"]):
                    return copy.deepcopy(receipt)
        raise AssertionError("corpus carries no receipt bound to the current candidate")

    @staticmethod
    def admitted_corpus(root: Path = ROOT, ref: str = CANONICAL_REF):
        """The corpus at the tip of the admission lineage, or None if it carries none.

        Admission is where immutability begins, and it is reachability from the
        canonical ref that admits — not the mere existence of a commit. A corpus on a
        development branch is a CANDIDATE state: still provisional, still replaceable.
        """
        run = subprocess.run(["git", "show", f"{ref}:{CORPUS}"], cwd=root,
                             capture_output=True, text=True)
        return json.loads(run.stdout) if run.returncode == 0 else None

    @staticmethod
    def receipts_by_key(corpus) -> dict[tuple[str, str, str], dict]:
        """A receipt is identified by what it observed and who observed it."""
        return {(row["id"], receipt.get("artifact_build"), receipt.get("verification_identity")): receipt
                for row in corpus["obligations"]
                for receipt in row["evaluation"].get("receipts") or []}

    @classmethod
    def receipt_keys(cls, corpus) -> set[tuple[str, str, str]]:
        return set(cls.receipts_by_key(corpus))

    @staticmethod
    def admitted_states(root: Path, ref: str = CANONICAL_REF):
        """Every corpus state reachable from the admission lineage, oldest first.

        The tip guard asks "am I about to delete or mutate admitted history?". This
        asks "has admitted history ever disappeared at any earlier transition?" — a
        receipt admitted in commit A and dropped in B is invisible from C. Walking the
        canonical ref rather than HEAD also means a bogus receipt committed on a branch
        that is never merged creates no institutional history at all.
        """
        listing = subprocess.run(["git", "log", "--format=%H", ref, "--", CORPUS],
                                 cwd=root, capture_output=True, text=True)
        if listing.returncode != 0:
            return []
        states = []
        for commit in reversed(listing.stdout.split()):
            blob = subprocess.run(["git", "show", f"{commit}:{CORPUS}"],
                                  cwd=root, capture_output=True, text=True)
            if blob.returncode == 0:
                states.append((commit, json.loads(blob.stdout)))
        return states

    @classmethod
    def history_violations(cls, root: Path, current, ref: str = CANONICAL_REF) -> list[str]:
        """Receipts admitted at any retained point that are now gone or rewritten.

        Admission freezes MEANING. Exact equality is today's implementation of that
        because the corpus has seen no schema migration; a future representation
        change would compare the immutable semantics through a verified bijection
        instead of comparing bytes.
        """
        live = cls.receipts_by_key(current)
        violations = []
        for commit, corpus in cls.admitted_states(root, ref):
            for key, receipt in cls.receipts_by_key(corpus).items():
                if key not in live:
                    violations.append(f"{key[0]} receipt admitted in {commit[:9]} has disappeared")
                elif live[key] != receipt:
                    violations.append(f"{key[0]} receipt admitted in {commit[:9]} was rewritten")
        return violations

    def test_no_admitted_receipt_has_ever_disappeared_from_retained_history(self) -> None:
        """The audit invariant across ALL admitted transitions, not just the next one.

        Its altitude is append-only relative to RETAINED repository history. It does
        not prove nobody rewrote that history: a force-push or repository replacement
        rewrites the universe being inspected. That is the same boundary the site
        already draws between a commitment and a notarization.
        """
        self.assertEqual(self.history_violations(ROOT, self.corpus), [])

    def test_the_history_guard_catches_deletion_and_rewriting(self) -> None:
        def receipt(build, verifier, **overrides):
            base = {"artifact_build": build, "verification_identity": verifier,
                    "result": "PASS", "method": {"measurement": "m"},
                    "environment": {"runtime": "r"}, "evidence": ["x"]}
            return {**base, **overrides}

        def corpus(receipts):
            return {"obligations": [{"id": "CY-X-001",
                                     "evaluation": {"result": "PASS", "receipts": receipts}}]}

        r1, r2, r3 = receipt("AAAA", "V1"), receipt("BBBB", "V2"), receipt("CCCC", "V3")
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            (root / "vaic").mkdir()
            def commit(state, message):
                (root / CORPUS).write_text(json.dumps(state), encoding="utf-8")
                subprocess.run(["git", "add", "-A"], cwd=root, capture_output=True, check=True)
                subprocess.run(["git", "-c", "user.email=t", "-c", "user.name=t",
                                "commit", "-qm", message], cwd=root, capture_output=True, check=True)
            subprocess.run(["git", "init", "-q", "."], cwd=root, capture_output=True, check=True)
            commit(corpus([r1]), "admit r1")

            for label, state, expect in (
                ("unchanged", corpus([r1]), []),
                ("append r2", corpus([r1, r2]), []),
                ("delete r1", corpus([r2]), ["disappeared"]),
                ("alter verdict", corpus([receipt("AAAA", "V1", result="FAIL")]), ["rewritten"]),
                ("alter method", corpus([receipt("AAAA", "V1", method={"measurement": "other"})]), ["rewritten"]),
                ("alter environment", corpus([receipt("AAAA", "V1", environment={"runtime": "other"})]), ["rewritten"]),
                ("alter evidence", corpus([receipt("AAAA", "V1", evidence=["y"])]), ["rewritten"]),
            ):
                with self.subTest(label):
                    found = self.history_violations(root, state, ref="HEAD")
                    self.assertEqual(len(found), len(expect), f"{label}: {found}")
                    for fragment, message in zip(expect, found):
                        self.assertIn(fragment, message)

            # a later transition cannot hide an earlier deletion
            commit(corpus([r1, r2]), "admit r2")
            commit(corpus([r1, r3]), "drop r2, admit r3")
            self.assertEqual(len(self.history_violations(root, corpus([r1, r3]), ref="HEAD")), 1)

    def test_an_admitted_receipt_can_never_be_reclassified_as_a_draft(self) -> None:
        """"It was only intermediate" must be knowable at the time, not asserted later."""
        admitted = self.admitted_corpus()
        if admitted is None:
            # A stated fact rather than a silently skipped assertion: the admission
            # lineage carries no corpus yet, so nothing is admitted and every receipt
            # is provisional — including any committed on a development branch, which
            # is a CANDIDATE genesis state. Assert the ref exists so a mistyped ref
            # cannot masquerade as an empty ledger.
            exists = subprocess.run(["git", "rev-parse", "--verify", "--quiet", CANONICAL_REF],
                                    cwd=ROOT, capture_output=True)
            self.assertEqual(exists.returncode, 0,
                             f"{CANONICAL_REF} must exist to serve as the admission lineage")
            return
        lost = self.receipt_keys(admitted) - self.receipt_keys(self.corpus)
        self.assertEqual(sorted(lost), [],
                         "an admitted receipt was dropped; admitted history is append-only")

    def test_current_corpus_is_structurally_valid_but_not_projection_valid(self) -> None:
        result = self.validate()
        self.assertEqual(result["structure"], "VALID")
        self.assertEqual(result["projection"], "INVALID")
        self.assertEqual(result["origin"], "NOT_CERTIFIED")
        self.assertEqual(result["release"], "NOT_CERTIFIED")

    def test_effective_verdicts_are_derived_not_declared(self) -> None:
        """The validator's aggregation must equal an independent derivation.

        No distribution is written down here. A hard-coded population preserves
        yesterday's corpus shape after the corpus legitimately changes, and turns
        a corpus FAIL into a harness failure, which this project's rule forbids.
        """
        result = self.validate()
        build = self.corpus["candidate"]["build_identity"]
        expected: Counter[str] = Counter()
        expired = []
        for row in self.corpus["obligations"]:
            receipts = row["evaluation"].get("receipts") or []
            current = any(receipt.get("artifact_build") == build for receipt in receipts)
            expected[row["evaluation"]["result"] if current else "NOT_EVALUATED"] += 1
            if receipts and not current:
                expired.append(row["id"])
        self.assertEqual(self.counts(result),
                         {key: expected.get(key, 0) for key in ("PASS", "FAIL", "NOT_EVALUATED")})
        self.assertEqual(result["expired_bindings"], sorted(expired))
        self.assertEqual(result["current_evidence"], "INCOMPLETE" if expired else "COMPLETE")

    def test_expired_binding_expires_authority_without_erasing_the_observation(self) -> None:
        before = self.validate()
        corpus = copy.deepcopy(self.corpus)
        row = next(r for r in corpus["obligations"] if r["id"] == "CY-ART-001")
        # only the CURRENT binding expires: earlier receipts already carry other
        # builds, and rebinding them all onto one fake build would collide two
        # recorded-verifier receipts into a duplicate identity, which is corruption
        for receipt in row["evaluation"]["receipts"]:
            if self.is_current(receipt, corpus["candidate"]):
                receipt["artifact_build"] = "0000000000000000"
        result = self.validate(corpus)
        # well-formed data describing evidence that has expired is not corruption
        self.assertEqual(result["structure"], "VALID")
        # the observation stands exactly as recorded
        self.assertEqual(result["observed_distribution"], before["observed_distribution"])
        # but it no longer licenses a verdict for this candidate
        self.assertIn("CY-ART-001", result["expired_bindings"])
        self.assertEqual(self.counts(result)["PASS"], self.counts(before)["PASS"] - 1)

    def test_a_historical_failure_does_not_condemn_a_new_candidate(self) -> None:
        corpus = copy.deepcopy(self.corpus)
        row = next(r for r in corpus["obligations"] if r["id"] == "CY-ART-001")
        row["evaluation"]["result"] = "FAIL"
        for receipt in row["evaluation"]["receipts"]:
            receipt["result"] = "FAIL"
            if self.is_current(receipt, corpus["candidate"]):
                receipt["artifact_build"] = "0000000000000000"
        result = self.validate(corpus)
        self.assertEqual(result["structure"], "VALID")
        self.assertEqual(self.observed(result)["FAIL"], 1)
        self.assertEqual(self.counts(result)["FAIL"], 0)
        self.assertIn("CY-ART-001", result["expired_bindings"])

    def test_a_current_failure_is_reported_and_is_not_corruption(self) -> None:
        corpus = copy.deepcopy(self.corpus)
        row = next(r for r in corpus["obligations"] if r["id"] == "CY-ART-001")
        row["evaluation"]["result"] = "FAIL"
        for receipt in row["evaluation"]["receipts"]:
            receipt["result"] = "FAIL"
        result = self.validate(corpus)
        self.assertEqual(result["structure"], "VALID")
        self.assertEqual(self.counts(result)["FAIL"], 1)
        self.assertEqual(result["projection"], "INVALID")

    def test_a_receipt_claiming_this_build_must_carry_this_candidates_identity(self) -> None:
        corpus = copy.deepcopy(self.corpus)
        row = next(r for r in corpus["obligations"] if r["id"] == "CY-ART-001")
        current = next(receipt for receipt in row["evaluation"]["receipts"]
                       if self.is_current(receipt, corpus["candidate"]))
        current["grammar_hash"] = "0" * 64
        result = self.validate(corpus)
        self.assertEqual(result["structure"], "INVALID")
        self.assertTrue(any("another candidate" in error for error in result["errors"]))

    def anchored(self, source: str, reference: str = "js/ledger.js#mailtoBody"):
        """Resolve a reference against a throwaway tree holding just the cited file."""
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            path = root / reference.partition("#")[0]
            path.parent.mkdir(parents=True, exist_ok=True)
            path.write_text(source, encoding="utf-8")
            return VAIC.evidence_defect(root, reference, "IRRELEVANT")

    def test_line_drift_cannot_invalidate_an_anchored_citation(self) -> None:
        body = "function mailtoBody() {\n  return 'READING SELF-REPORT';\n}\n"
        self.assertIsNone(self.anchored(body))
        # the headline property: 200 lines above the cited code change nothing
        self.assertIsNone(self.anchored("// pad\n" * 200 + body))
        self.assertIsNone(self.anchored("\n" * 200 + body))

    def test_a_deleted_or_renamed_anchor_is_corruption(self) -> None:
        defect = self.anchored("function mailtoPayload() {\n  return 1;\n}\n")
        self.assertIsNotNone(defect)
        self.assertIn("does not define", defect)

    def test_a_duplicated_anchor_is_corruption(self) -> None:
        body = "function mailtoBody() {\n  return 1;\n}\n"
        defect = self.anchored(body * 2)
        self.assertIsNotNone(defect)
        self.assertIn("defines 2 times", defect)

    def test_a_call_site_is_not_a_definition(self) -> None:
        # a mention of the name must not satisfy a citation that means the object
        source = "const out = mailtoBody();\nexport { mailtoBody };\n"
        self.assertIsNotNone(self.anchored(source))

    def test_explicit_markers_anchor_files_without_language_symbols(self) -> None:
        self.assertIsNone(self.anchored(
            "# EVIDENCE: artifact-source-allowlist\nFILES=\"index.html\"\n",
            "deploy.sh#artifact-source-allowlist"))

    def test_evidence_cannot_cite_a_file_outside_every_identity_set(self) -> None:
        defect = self.anchored("function helper() {}\n", "tools/unbound-helper.js#helper")
        self.assertIsNotNone(defect)
        self.assertIn("no identity set covers", defect)

    def test_corpus_evidence_cannot_escape_the_identity_sets(self) -> None:
        corpus = copy.deepcopy(self.corpus)
        corpus["obligations"][0]["evaluation"]["receipts"][0]["evidence"] = ["docs/deploy.md"]
        result = self.validate(corpus)
        self.assertEqual(result["structure"], "INVALID")
        self.assertTrue(any("no identity set covers" in error for error in result["errors"]))

    def test_a_changed_verifier_expires_authority_without_erasing_the_observation(self) -> None:
        before = self.validate()
        corpus = copy.deepcopy(self.corpus)
        row = next(r for r in corpus["obligations"] if r["id"] == "CY-ART-001")
        current = next(receipt for receipt in row["evaluation"]["receipts"]
                       if self.is_current(receipt, corpus["candidate"]))
        current["verification_identity"] = "b" * 64
        result = self.validate(corpus)
        # the product did not move, the verifier did: still valid data, expired authority
        self.assertEqual(result["structure"], "VALID")
        self.assertEqual(result["observed_distribution"], before["observed_distribution"])
        self.assertIn("CY-ART-001", result["expired_bindings"])

    def test_a_new_receipt_must_record_which_verifier_produced_it(self) -> None:
        corpus = copy.deepcopy(self.corpus)
        row = next(r for r in corpus["obligations"] if r["id"] == "CY-ART-001")
        for receipt in row["evaluation"]["receipts"]:
            receipt["verification_identity"] = "UNRECORDED"
        result = self.validate(corpus)
        self.assertEqual(result["structure"], "VALID")
        self.assertIn("CY-ART-001", result["expired_bindings"])

    def test_no_malformed_corpus_can_crash_the_validator(self) -> None:
        """Totality: every malformed input is a judgment, never an exception.

        A corpus that could raise would let broken or hostile data manufacture an
        apparent tooling outage in place of the INVALID verdict it has earned. Each
        case also asserts that an invalid corpus licenses no verdict distribution.
        """
        def first(corpus):
            return corpus["obligations"][0]

        def receipt(corpus):
            return first(corpus)["evaluation"]["receipts"][0]

        mutations = {
            "missing required field": lambda c: first(c).pop("evaluation"),
            "null where object expected": lambda c: first(c).update(contexts=None),
            "object where list expected": lambda c: first(c).update(depends_on={}),
            "list element wrong type": lambda c: first(c).update(authorized_evaluators=[1]),
            "row is not an object": lambda c: c["obligations"].__setitem__(0, "nope"),
            "obligations is not a list": lambda c: c.update(obligations={}),
            "obligations is empty": lambda c: c.update(obligations=[]),
            "semantics is not an object": lambda c: c.update(semantics="nope"),
            "relations is not a list": lambda c: c.update(relations="nope"),
            "candidate is not an object": lambda c: c.update(candidate=None),
            "falsification is not an object": lambda c: c.update(falsification=[]),
            "kill ratio is null": lambda c: c["falsification"].update(bespoke_relation_kill_ratio=None),
            "malformed verdict": lambda c: first(c)["evaluation"].update(result="MAYBE"),
            "receipts is not a list": lambda c: first(c)["evaluation"].update(receipts={}),
            "receipt is not an object": lambda c: first(c)["evaluation"]["receipts"].__setitem__(0, 7),
            "malformed digest": lambda c: receipt(c).update(record_hash="zz"),
            "non-string build reference": lambda c: receipt(c).update(artifact_build=123),
            "malformed verifier sentinel": lambda c: receipt(c).update(verification_identity="unrecorded"),
            "unknown evaluator class": lambda c: receipt(c).update(evaluator="NOPE"),
            "evidence is not a list": lambda c: receipt(c).update(evidence="js/ledger.js#mailtoBody"),
            "evidence element is not a string": lambda c: receipt(c).update(evidence=[42]),
            "bad anchor syntax": lambda c: receipt(c).update(evidence=["#anchor-with-no-file"]),
            "missing anchor": lambda c: receipt(c).update(evidence=["js/ledger.js#noSuchSymbol"]),
            "uncovered file": lambda c: receipt(c).update(evidence=["docs/deploy.md"]),
            "unknown obligation reference": lambda c: first(c).update(depends_on=["CY-NOPE-999"]),
            "self cycle": lambda c: first(c).update(depends_on=[first(c)["id"]]),
            "duplicate obligation id": lambda c: c["obligations"][1].update(id=first(c)["id"]),
            "duplicate receipt identity": lambda c: first(c)["evaluation"]["receipts"]
                .append(copy.deepcopy(receipt(c))),
        }

        def multi_node_cycle(corpus):
            a, b = corpus["obligations"][0], corpus["obligations"][1]
            a["depends_on"], b["depends_on"] = [b["id"]], [a["id"]]
        mutations["multi-node cycle"] = multi_node_cycle

        for label, mutate in mutations.items():
            with self.subTest(label):
                corpus = copy.deepcopy(self.corpus)
                mutate(corpus)
                result = self.validate(corpus)          # must not raise
                self.assertEqual(result["structure"], "INVALID", label)
                self.assertTrue(result["errors"], label)
                self.assertEqual(result["effective_distribution"]["status"], "NOT_LICENSED", label)
                self.assertEqual(result["observed_distribution"]["status"], "NOT_LICENSED", label)

    def test_a_validator_defect_reports_internal_error_not_a_verdict(self) -> None:
        """The third outcome must exist, or totality is only a claim.

        A defect in the tool is not a judgment about the corpus: it exits 2, says
        INTERNAL_ERROR, prints the traceback, and publishes no structure verdict.
        """
        driver = (
            "import importlib.util, sys\n"
            f"spec = importlib.util.spec_from_file_location('vv', {str(ROOT / 'tools/vaic_validate.py')!r})\n"
            "module = importlib.util.module_from_spec(spec); spec.loader.exec_module(module)\n"
            "def defect(*args, **kwargs): raise RuntimeError('simulated validator defect')\n"
            "module.validate = defect\n"
            "sys.argv = ['vaic_validate']\n"
            "raise SystemExit(module.main())\n"
        )
        run = subprocess.run([sys.executable, "-c", driver], cwd=ROOT, capture_output=True, text=True)
        self.assertEqual(run.returncode, 2)
        self.assertIn("INTERNAL_ERROR", run.stderr)
        self.assertIn("simulated validator defect", run.stderr)
        self.assertNotIn("structure:", run.stdout)

    def test_a_malformed_matrix_cannot_crash_the_validator(self) -> None:
        for label, matrix in {
            "matrix is not an object": "nope",
            "evaluators is not a list": {"specification": "VAIC-0", "evaluators": {}},
            "evaluator row is not an object": {"specification": "VAIC-0", "evaluators": ["x"]},
            "coverage classes are not an object": {"specification": "VAIC-0", "evaluators": [], "coverage_classes": []},
        }.items():
            with self.subTest(label):
                result = self.validate(matrix=matrix)
                self.assertEqual(result["structure"], "INVALID", label)
                self.assertTrue(result["errors"], label)

    def test_an_invalid_corpus_licenses_no_distribution(self) -> None:
        corpus = copy.deepcopy(self.corpus)
        corpus["obligations"][0].pop("evaluation")
        result = self.validate(corpus)
        distribution = result["effective_distribution"]
        self.assertEqual(distribution["status"], "NOT_LICENSED")
        # the surviving seventeen are diagnostic only; nobody may read them as the corpus
        self.assertNotIn("counts", distribution)
        self.assertIn("diagnostic_partial", distribution)
        self.assertEqual(sum(distribution["diagnostic_partial"].values()),
                         len(self.corpus["obligations"]) - 1)

    def test_an_invalid_row_never_reaches_a_later_stage(self) -> None:
        # the original crash was a malformed row skipped by one pass and indexed by
        # the next; a shape failure must remove the row from every later stage
        corpus = copy.deepcopy(self.corpus)
        corpus["obligations"][0]["depends_on"] = "not-a-list"
        result = self.validate(corpus)
        self.assertEqual(result["structure"], "INVALID")
        self.assertTrue(any("depends_on must be list" in error for error in result["errors"]))
        # no cycle walk, verdict, or binding error was reported for the dropped row
        oid = self.corpus["obligations"][0]["id"]
        self.assertEqual([error for error in result["errors"] if error.startswith(f"{oid} receipt")], [])

    def test_a_digest_that_is_not_a_digest_is_corruption(self) -> None:
        corpus = copy.deepcopy(self.corpus)
        corpus["obligations"][0]["evaluation"]["receipts"][0]["record_hash"] = "not-a-digest"
        result = self.validate(corpus)
        self.assertEqual(result["structure"], "INVALID")
        self.assertTrue(any("not a sha256 digest" in error for error in result["errors"]))

    def test_missing_pass_receipt_fails_closed(self) -> None:
        corpus = copy.deepcopy(self.corpus)
        corpus["obligations"][0]["evaluation"]["receipts"] = []
        result = self.validate(corpus)
        self.assertEqual(result["structure"], "INVALID")
        self.assertTrue(any("PASS requires" in error for error in result["errors"]))

    def test_prior_build_observation_cannot_back_current_receipt(self) -> None:
        corpus = copy.deepcopy(self.corpus)
        corpus["obligations"][0]["evaluation"]["receipts"][0]["evidence"] = [
            "vaic/evidence/current-browser-observations.v0.json#mobile_geometry"
        ]
        result = self.validate(corpus)
        self.assertEqual(result["structure"], "INVALID")
        self.assertTrue(any("was not made on build" in error for error in result["errors"]))

    def test_evaluator_cannot_exceed_relation_authority(self) -> None:
        corpus = copy.deepcopy(self.corpus)
        row = next(row for row in corpus["obligations"] if row["id"] == "CY-EPI-003")
        row["authorized_evaluators"] = ["STATIC_ANALYZER"]
        row["evaluation"]["receipts"][0]["evaluator"] = "STATIC_ANALYZER"
        result = self.validate(corpus)
        self.assertEqual(result["structure"], "INVALID")
        self.assertTrue(any("lacks authority" in error for error in result["errors"]))

    def test_bounded_receipt_cannot_satisfy_exhaustive_obligation(self) -> None:
        corpus = copy.deepcopy(self.corpus)
        row = next(row for row in corpus["obligations"] if row["id"] == "CY-ART-001")
        row["evaluation"]["receipts"][0]["coverage"] = "BOUNDED"
        result = self.validate(corpus)
        self.assertEqual(result["structure"], "INVALID")
        self.assertTrue(any("not licensed" in error for error in result["errors"]))

    def test_policy_cannot_remove_inherited_obligations(self) -> None:
        corpus = copy.deepcopy(self.corpus)
        corpus["semantics"]["policy_may_remove_core_or_grammar"] = True
        result = self.validate(corpus)
        self.assertEqual(result["structure"], "INVALID")
        self.assertTrue(any("must not remove" in error for error in result["errors"]))

    def test_not_evaluated_cannot_carry_pass_receipt(self) -> None:
        corpus = copy.deepcopy(self.corpus)
        pending = next(row for row in corpus["obligations"] if row["evaluation"]["result"] == "NOT_EVALUATED")
        pending["evaluation"]["receipts"] = copy.deepcopy(corpus["obligations"][0]["evaluation"]["receipts"])
        result = self.validate(corpus)
        self.assertEqual(result["structure"], "INVALID")
        self.assertTrue(any("must not carry" in error for error in result["errors"]))

    def test_origin_pass_cannot_compensate_for_projection_failure(self) -> None:
        corpus = copy.deepcopy(self.corpus)
        origin = next(row for row in corpus["obligations"] if row["scope"] == "origin")
        # a receipt only certifies the candidate it is bound to, so the synthetic
        # origin PASS has to be an observation of THIS build to license anything
        receipt = self.current_receipt(corpus)
        receipt.update({
            "evaluator": "ORIGIN_HARNESS", "coverage": "EXHAUSTIVE",
            "environment": {"capability_profile": "test_origin", "runtime": "test"},
            "harness_identity": "negative-control-origin-harness",
            "harness_version": "test",
            "method": {"measurement": "synthetic complete origin closure", "threshold": "all", "units": "boolean"},
            "evidence": ["deploy.sh#artifact-source-allowlist"], "observed_at": "test",
        })
        origin["evaluation"] = {
            "result": "PASS",
            "receipts": [receipt],
        }
        result = self.validate(corpus)
        self.assertEqual(result["structure"], "VALID")
        self.assertEqual(result["origin"], "VALID")
        self.assertEqual(result["projection"], "INVALID")
        self.assertEqual(result["release"], "NOT_CERTIFIED")

    def test_escape_relation_and_bespoke_kill_criterion_are_enforced(self) -> None:
        corpus = copy.deepcopy(self.corpus)
        corpus["relations"].append("CUSTOM")
        for row in corpus["obligations"][:5]:
            row["relation_implementation"] = "bespoke"
        result = self.validate(corpus)
        self.assertEqual(result["structure"], "INVALID")
        self.assertTrue(any("escape" in error for error in result["errors"]))
        self.assertTrue(any("kill criterion" in error for error in result["errors"]))


    # ---- the re-stamp tool: rebinding the candidate must never touch a receipt ----
    def scrambled(self, tmp: str) -> tuple[Path, str]:
        """A corpus whose candidate AND current receipts are bound to a fake build.

        Rebinding every occurrence of the current build leaves the receipts expired
        (one per obligation, so no duplicate identity) and the candidate stale — the
        state a build change leaves behind before anyone re-stamps.
        """
        path = Path(tmp) / "corpus.json"
        raw = (ROOT / CORPUS).read_text(encoding="utf-8")
        text = raw.replace(self.corpus["candidate"]["build_identity"], "0" * 16)
        path.write_text(text, encoding="utf-8")
        return path, text

    def test_restamp_rebinds_the_candidate_and_never_edits_a_receipt(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            path, before_text = self.scrambled(tmp)
            before = json.loads(before_text)
            self.assertEqual(RESTAMP.stamp(ROOT, path), ["build_identity"])
            added = RESTAMP.append(ROOT, path, harness={k: ["true"] for k in RESTAMP.HARNESS}, today="2099-01-01")
            text = path.read_text(encoding="utf-8")
        after = json.loads(text)
        self.assertEqual(after["candidate"], self.corpus["candidate"])
        self.assertTrue(added)
        for old_row, new_row in zip(before["obligations"], after["obligations"]):
            old = old_row["evaluation"].get("receipts") or []
            new = new_row["evaluation"].get("receipts") or []
            self.assertEqual(new[:len(old)], old, new_row["id"])     # history intact, in order
            self.assertLessEqual(len(new) - len(old), 1, new_row["id"])
        # a text-level insertion: every hand-formatted line survives, in order
        survivors = iter(line.rstrip(",") for line in text.splitlines())
        for line in before_text.splitlines():
            if line.strip().startswith('"build_identity"'):
                continue                                                # the one value stamp rewrites
            self.assertTrue(any(line.rstrip(",") == kept for kept in survivors), line)

    def test_restamp_appends_one_current_receipt_per_automated_obligation_with_its_real_result(self) -> None:
        failing = "deploy.sh plus tools/test-site.py"
        harness = {k: (["false"] if k == failing else ["true"]) for k in RESTAMP.HARNESS}
        with tempfile.TemporaryDirectory() as tmp:
            path, before_text = self.scrambled(tmp)
            before = json.loads(before_text)
            with self.assertRaises(VAIC.CorpusError):
                RESTAMP.append(ROOT, path, harness=harness)        # stale candidate: fail closed
            RESTAMP.stamp(ROOT, path)
            added = dict(RESTAMP.append(ROOT, path, harness=harness, today="2099-01-01"))
            self.assertEqual(RESTAMP.append(ROOT, path, harness=harness), [])   # idempotent
            after = json.loads(path.read_text(encoding="utf-8"))
        cand = after["candidate"]
        automated = {row["id"]: (row["evaluation"].get("receipts") or [])[-1]["harness_identity"]
                     for row in before["obligations"]
                     if any(r.get("harness_identity") in RESTAMP.HARNESS and r.get("verification_identity") != VAIC.EXTERNAL
                            for r in row["evaluation"].get("receipts") or [])}
        self.assertEqual(set(added), set(automated))
        external = {row["id"] for row in before["obligations"]
                    if any(r.get("verification_identity") == VAIC.EXTERNAL for r in row["evaluation"].get("receipts") or [])}
        self.assertTrue(external and external.isdisjoint(added), "browser observations are never re-run here")
        for row in after["obligations"]:
            if row["id"] not in added:
                continue
            current = [r for r in row["evaluation"]["receipts"]
                       if r["artifact_build"] == cand["build_identity"] and r["verification_identity"] == cand["verification_identity"]]
            self.assertEqual(len(current), 1, row["id"])
            receipt = current[0]
            expected = "FAIL" if automated[row["id"]] == failing else "PASS"
            self.assertEqual(receipt["result"], expected, row["id"])
            self.assertEqual(row["evaluation"]["result"], expected, row["id"])
            self.assertEqual(receipt["harness_version"], cand["build_identity"])
            self.assertEqual(receipt["observed_at"], "2099-01-01")
            self.assertEqual({k: receipt[k] for k in RESTAMP.RECEIPT_BINDING}, {k: cand[k] for k in RESTAMP.RECEIPT_BINDING})
        self.assertIn("FAIL", added.values())


if __name__ == "__main__":
    unittest.main(verbosity=2)
