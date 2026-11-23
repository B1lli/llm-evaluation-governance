#!/usr/bin/env python3
"""Bind a paid evaluation campaign launch to an independent audit receipt."""

import argparse
import hashlib
import json
from pathlib import Path


REQUIRED_CHECKS = (
    "data_exposure",
    "manual_source_selection",
    "cross_project_trigger",
    "source_version_binding",
    "authority_ceiling",
)


class PreflightError(ValueError):
    """The paid campaign has no applicable clear audit."""


def _file_sha256(path):
    digest = hashlib.sha256()
    with path.open("rb") as stream:
        for block in iter(lambda: stream.read(1024 * 1024), b""):
            digest.update(block)
    return digest.hexdigest()


def snapshot_campaign(plan_path, reviewed_files):
    """Read the plan and the runner-selected, full-campaign review inventory."""
    plan = Path(plan_path).resolve()
    paths = {Path(path).resolve() for path in reviewed_files}
    paths.discard(plan)
    if not paths:
        raise PreflightError("Add the campaign's execution code and input files to the review inventory.")
    try:
        return {
            "plan": {"path": str(plan), "sha256": _file_sha256(plan)},
            "files": {str(path): _file_sha256(path) for path in sorted(paths)},
        }
    except OSError as exc:
        raise PreflightError(f"Restore or prepare the review inventory, then retry: {exc}") from exc


def _has_text(value):
    return isinstance(value, str) and bool(value.strip())


def require_review(receipt_path, plan_path, reviewed_files):
    """Require the independent reviewer's evidence and a byte-matching snapshot."""
    receipt_path = Path(receipt_path)
    try:
        receipt = json.loads(receipt_path.read_text(encoding="utf-8"))
    except FileNotFoundError as exc:
        raise PreflightError(
            f"Missing independent audit at {receipt_path}. Run the preflight snapshot and have "
            "an independent reviewer check overfitting and generalization before dispatch."
        ) from exc
    except (OSError, ValueError) as exc:
        raise PreflightError(f"Correct the unreadable audit at {receipt_path}: {exc}") from exc
    if not isinstance(receipt, dict):
        raise PreflightError(f"Replace the malformed audit at {receipt_path} with a JSON object.")

    reviewer = receipt.get("reviewed_by")
    implementer = receipt.get("implemented_by")
    if (
        not _has_text(reviewer)
        or not _has_text(implementer)
        or reviewer.strip().casefold() == implementer.strip().casefold()
    ):
        raise PreflightError("Record the distinct independent reviewer and implementer identities.")

    blockers = receipt.get("blocking_findings")
    if not isinstance(blockers, list) or any(not _has_text(item) for item in blockers):
        raise PreflightError("Record open blocking findings as a list of descriptions.")
    if blockers:
        raise PreflightError("Resolve and independently re-review blocking findings: " + " | ".join(blockers))

    evidence = receipt.get("evidence")
    evidence = evidence if isinstance(evidence, dict) else {}
    missing = [check for check in REQUIRED_CHECKS if not _has_text(evidence.get(check))]
    if missing:
        raise PreflightError("Complete the independent audit evidence for: " + ", ".join(missing))

    expected = snapshot_campaign(plan_path, reviewed_files)
    reviewed = receipt.get("snapshot")
    if not isinstance(reviewed, dict):
        raise PreflightError("Attach the snapshot that the independent reviewer actually examined.")
    if reviewed.get("plan") != expected["plan"]:
        raise PreflightError("The campaign plan changed. Refresh the snapshot and obtain a new independent audit.")
    audited_files = reviewed.get("files")
    if not isinstance(audited_files, dict):
        raise PreflightError("Attach the reviewed file inventory from the campaign snapshot.")
    changed = sorted(
        path for path in audited_files.keys() | expected["files"].keys()
        if audited_files.get(path) != expected["files"].get(path)
    )
    if changed:
        raise PreflightError(
            "The campaign inputs or execution files changed. Refresh the snapshot and obtain a "
            "new independent audit. Changed files: " + ", ".join(changed)
        )
    return receipt


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    commands = parser.add_subparsers(dest="mode", required=True)
    snapshot = commands.add_parser("snapshot", help="Print the exact full-campaign review inventory")
    check = commands.add_parser("check", help="Verify an independent audit against current files")
    check.add_argument("receipt", type=Path)
    for command in (snapshot, check):
        command.add_argument("plan", type=Path)
        command.add_argument("files", type=Path, nargs="+")
    args = parser.parse_args()
    try:
        if args.mode == "snapshot":
            print(json.dumps(snapshot_campaign(args.plan, args.files), indent=2, ensure_ascii=False))
        else:
            require_review(args.receipt, args.plan, args.files)
            print("Independent paid-campaign audit matches the current plan and files.")
    except PreflightError as exc:
        parser.exit(2, f"Paid campaign preflight blocked: {exc}\n")


if __name__ == "__main__":
    main()
