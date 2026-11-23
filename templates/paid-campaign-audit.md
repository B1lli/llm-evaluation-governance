# Paid campaign audit

The runner owns the review inventory. Include the full plan, source versions,
prepared dispatch inputs, and the execution, prompt, and evaluator files
that affect the result. When the runner executes remotely, verify its actual
runtime revision and inputs against the reviewed files. A local file snapshot
cannot establish remote parity by itself.

The independent reviewer captures a snapshot before reviewing it. The reviewer
records the following JSON beside the plan, with evidence specific to the
campaign. Point to the exact runs, fixtures, source records, or findings the
implementer can inspect. Keep the receipt with the internal evaluation evidence.

```json
{
  "reviewed_by": "<independent reviewer or session ID>",
  "implemented_by": "<implementer or session ID>",
  "blocking_findings": [],
  "evidence": {
    "data_exposure": "<who saw which inputs and how tuning-influenced cases are classified>",
    "manual_source_selection": "<manual selections and automatic-path counterexamples>",
    "cross_project_trigger": "<independent projects, real triggers, and negative controls>",
    "source_version_binding": "<proof the executed path uses the reviewed source versions>",
    "authority_ceiling": "<verification that semantic output and CONTEXT cannot expand authority>"
  },
  "snapshot": {
    "plan": {"path": "<generated>", "sha256": "<generated>"},
    "files": {"<generated path>": "<generated SHA-256>"}
  }
}
```

Leave unresolved findings in `blocking_findings`. Use the snapshot the reviewer
actually examined. When the plan or inventory changes, refresh the snapshot and
obtain a fresh independent review before dispatch.

The runner checks the receipt, recorded findings, and file identity. The
independent reviewer is responsible for evidence quality and reviewer provenance.
