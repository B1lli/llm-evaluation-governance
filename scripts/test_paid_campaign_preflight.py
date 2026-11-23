"""Zero-model launch regressions for the paid campaign receipt."""

import json
from pathlib import Path
import tempfile
import unittest

from paid_campaign_preflight import (
    PreflightError,
    REQUIRED_CHECKS,
    require_review,
    snapshot_campaign,
)


class PaidCampaignPreflightTest(unittest.TestCase):
    def setUp(self):
        directory = tempfile.TemporaryDirectory()
        self.addCleanup(directory.cleanup)
        self.root = Path(directory.name)
        self.plan_path = self.root / "campaign.json"
        self.plan = {
            "corpus": "project-one",
            "recipe": "candidate-one",
            "source": "source.txt",
            "batches": {"pilot": ["a", "b", "c"], "rest": ["d"]},
        }
        self.write_json(self.plan_path, self.plan)
        self.receipt_path = self.root / "audit.json"
        for path in ("recipe.py", "source.txt", "pilot.jobs.jsonl", "rest.jobs.jsonl"):
            (self.root / path).write_text(path, encoding="utf-8")
        self.dispatched = []

    def write_json(self, path, content):
        path.write_text(json.dumps(content), encoding="utf-8")

    def reviewed_files(self):
        plan = json.loads(self.plan_path.read_text(encoding="utf-8"))
        names = ["recipe.py", plan["source"]]
        names.extend(f"{batch}.jobs.jsonl" for batch in plan["batches"])
        return [self.root / name for name in names]

    def write_valid_receipt(self, **changes):
        receipt = {
            "reviewed_by": "independent-audit",
            "implemented_by": "implementation",
            "blocking_findings": [],
            "evidence": {check: f"fixture evidence for {check}" for check in REQUIRED_CHECKS},
            "snapshot": snapshot_campaign(self.plan_path, self.reviewed_files()),
        }
        receipt.update(changes)
        self.write_json(self.receipt_path, receipt)

    def launch(self, first=1, last=None):
        require_review(self.receipt_path, self.plan_path, self.reviewed_files())
        self.dispatched.extend(list(self.plan["batches"])[first - 1:last])

    def assert_blocked(self, reason, **selection):
        with self.assertRaisesRegex(PreflightError, reason):
            self.launch(**selection)
        self.assertEqual(self.dispatched, [])

    def test_missing_audit_blocks_full_campaign(self):
        self.assert_blocked("Missing independent audit")

    def test_open_finding_blocks(self):
        self.write_valid_receipt(blocking_findings=["Only the tuned project triggered"])
        self.assert_blocked("Only the tuned project triggered")

    def test_changed_execution_code_blocks(self):
        self.write_valid_receipt()
        (self.root / "recipe.py").write_text("updated execution", encoding="utf-8")
        self.assert_blocked("Changed files: .*recipe.py")

    def test_changed_input_plan_blocks(self):
        self.write_valid_receipt()
        self.plan["batches"]["rest"] = ["e"]
        self.write_json(self.plan_path, self.plan)
        self.assert_blocked("campaign plan changed")

    def test_changed_source_blocks(self):
        self.write_valid_receipt()
        (self.root / "source.txt").write_text("updated source", encoding="utf-8")
        self.assert_blocked("Changed files: .*source.txt")

    def test_valid_audit_allows_dispatch(self):
        self.write_valid_receipt()
        self.launch()
        self.assertEqual(self.dispatched, ["pilot", "rest"])

    def test_first_three_still_require_full_campaign_audit(self):
        self.assert_blocked("Missing independent audit", last=1)
        self.write_valid_receipt()
        (self.root / "rest.jobs.jsonl").write_text("changed later batch", encoding="utf-8")
        self.assert_blocked("Changed files: .*rest.jobs.jsonl", last=1)

    def test_valid_full_audit_allows_first_three(self):
        self.write_valid_receipt()
        self.launch(last=1)
        self.assertEqual(self.dispatched, ["pilot"])

    def test_self_review_does_not_authorize_dispatch(self):
        self.write_valid_receipt(reviewed_by=" Implementation ")
        self.assert_blocked("distinct independent reviewer")

    def test_absent_evidence_does_not_authorize_dispatch(self):
        self.write_valid_receipt(evidence={})
        self.assert_blocked("Complete the independent audit evidence")


if __name__ == "__main__":
    unittest.main()
