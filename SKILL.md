---
name: llm-evaluation-governance
description: Route and govern regression work for stochastic, multi-stage LLM systems. Use for large paid evaluation kickoff, recorded-output replay, stage fixtures, prompt clauses, statistical quality gates, safety acceptance, canary or blind-test datasets, bounded test concurrency, or evidence reports. Also use when repeated prompt fixes make different cases alternate between passing and failing.
---

# LLM Evaluation Governance

Use this skill as the router for the package. It selects the smallest set of
specialized subskills needed for the request, keeps their evidence boundaries
separate, and prevents a green result in one layer from being reported as
end-to-end proof.

## Route the request

Classify the request semantically. Do not require the user to use the labels
below.

Before taking task actions, read every selected subskill file completely. Do
not read unselected subskills unless the scope expands.

| Request or change | Read and apply |
| --- | --- |
| Parser, provenance binding, capability ceiling, normalization, assembly, deduplication, fingerprinting, schema migration, or deterministic evaluator code | `skills/replay-fixtures/SKILL.md` |
| Prompt, model instruction, semantic reviewer, repair instruction, or repeated case-specific fixes | `skills/prompt-ablation/SKILL.md` and `skills/replay-fixtures/SKILL.md` |
| Model selection, model version, or endpoint-class change | `skills/prompt-ablation/SKILL.md`, `skills/replay-fixtures/SKILL.md`, and `skills/statistical-gates/SKILL.md` |
| Pass-rate threshold, tolerated abstention or omission rate, sample size, false-alarm budget, confidence bound, accumulated safety evidence, or noisy results | `skills/statistical-gates/SKILL.md` |
| Regression-suite design or execution | `skills/replay-fixtures/SKILL.md`, `skills/statistical-gates/SKILL.md`, and `skills/evaluation-data-governance/SKILL.md` |
| Large paid evaluation campaign, including a rollout split into small batches | `skills/replay-fixtures/SKILL.md`, `skills/prompt-ablation/SKILL.md`, and `skills/evaluation-data-governance/SKILL.md`, plus the paid kickoff check below |
| Aggregate canary design or execution | `skills/statistical-gates/SKILL.md` and `skills/evaluation-data-governance/SKILL.md` |
| Validation lifecycle, sealed holdout, blind-test access, preregistration, dataset retirement, or result isolation | `skills/evaluation-data-governance/SKILL.md` |
| Slow model tests, serial sampling, worker pools, rate limits, relay stability, or parallel execution | `skills/bounded-concurrency/SKILL.md` |

For a release or acceptance redesign, normally use all five subskills. For a
single deterministic bug, do not load unrelated subskills.

The optional deterministic router accepts declared facets:

```bash
node scripts/route.mjs \
  --change deterministic \
  --change prompt \
  --need threshold \
  --need blind \
  --need speed
```

The semantic classification performed by the agent is authoritative. The
script validates an explicit classification; it is not a keyword classifier
for natural-language requests.

Use `--change deterministic-evaluator` for code-only scoring or validation.
Use `--change semantic-evaluator` for a model-based reviewer or judge. The
`--need regression` facet selects replay, statistical gates, and dataset
governance because regression work spans execution, interpretation, and corpus
lifecycle. The `--change model` facet means a model, model-version, or
endpoint-class change, not an edit to a model instruction.

## Non-negotiable boundaries

1. Separate these outcomes before calculating any pass rate:
   - task-defined success;
   - abstention, omission, or empty output;
   - safe degraded or partial output;
   - unsafe or incorrect output;
   - invalid model structure;
   - transport, timeout, relay, or evaluator infrastructure failure.
2. A tolerated abstention or omission rate never permits task-defined safety,
   authorization, integrity, routing, or correctness violations.
3. Recorded-output replay proves deterministic compatibility only. It does not
   prove that the current prompt or model will generate the recorded output.
4. A stage fixture proves one stage's contract only. It does not prove the
   complete workflow.
5. A repeatedly queried aggregate canary is a validation set, not a sealed
   holdout.
6. A holdout used to choose or modify an implementation is retired from blind
   status.
7. Parallelize independent sample chains, not dependent stages inside one
   sample.
8. Prefer monotonic code invariants and capability ceilings over prompt
   clauses. Keep semantic interpretation in the model when it cannot be
   expressed as a domain-independent invariant.

## Before a large paid campaign

Recognize the campaign at planning time from its total intended scope, cost,
or downstream decision. Raise the overfitting/generalization check yourself
before any paid dispatch. A rollout in small batches is one campaign. Complete
the check in the working session without asking the user to drive or approve it.

1. Freeze the full input plan, runtime code and prompts, source versions, and
   prepared dispatch inputs. Run zero-model replay and focused counterexamples
   first. Obtain any remaining semantic evidence in a separate, narrowly
   justified verification using an appropriately priced model. Apply the
   full-campaign check before running any tranche of its declared plan.
2. Identify which samples the implementation, prompts, or evaluator have
   already seen. Mark tuning-influenced cases as regression. Identify any
   manually selected sources or exceptions and check the automatic source path
   without them. Verify real triggers on independent projects, including
   negative controls. Verify source-version binding through the executed path
   and prove that model output or `CONTEXT` cannot grant added authority.
3. Have an independent reviewer inspect the frozen evidence and record each
   conclusion and open blocking finding. Resolve blockers and obtain a fresh
   review of changed material before real dispatch. Unknown exposure, missing
   cross-project evidence, and missing source or authority evidence stay open.
4. Connect the actual paid runner to
   `scripts/paid_campaign_preflight.py` where feasible. Use
   `snapshot_campaign(plan, files)` for review and
   `require_review(receipt, plan, files)` before dispatch. Derive the complete
   file inventory from the runner and use the full plan even when launching
   one batch. Follow
   `templates/paid-campaign-audit.md` for the receipt. When the runner has no
   executable check, the agent must still finish this review before dispatch.

## Required report separation

Report these sections independently:

- deterministic replay;
- stage-fixture coverage;
- prompt-clause additions and ablations;
- stochastic semantic gate;
- unsafe-output evidence accumulation;
- invalid-structure reliability;
- transport and infrastructure reliability;
- aggregate canary;
- sealed holdout;
- end-to-end consumer verification.

Use `templates/separated-evaluation-report.md`. Never average these layers into
one score.
