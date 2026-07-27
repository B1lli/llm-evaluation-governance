---
name: llm-eval-data-governance
description: Govern regression, aggregate canary, and sealed holdout datasets for LLM evaluation. Use for blind-test design, preregistered decisions, query budgets, dataset retirement, access isolation, or preventing validation-set overfitting.
---

# Evaluation Data Governance

## Dataset lifecycle

Use three explicit classes:

### Regression

- Sample details are visible.
- Developers may diagnose and repair against them.
- Once a blind or canary sample influences implementation, move it here.

### Aggregate canary

- The implementation side receives aggregate counts only.
- It may return success, abstention or omission, unsafe, invalid structure, and
  infrastructure counts, but no sample identifiers, inputs, outputs, or
  category mapping.
- Repeated queries make it a validation set.
- It is not final blind evidence.

### Sealed holdout

- The implementation side cannot access samples or per-sample reports.
- Run only after implementation, prompts, evaluators, and decision rules are
  frozen.
- If its result changes the implementation, retire it to regression and create
  a new sealed holdout for final evaluation.

## Preregister a canary decision

Before querying, complete
`../../templates/canary-preregistration.md` with:

- source-state fingerprint;
- exact evaluation configuration;
- query count;
- metric returned;
- pass, rollback, and escalation thresholds;
- actions permitted after each result;
- statement that no sample-level diagnosis will be requested.

Do not run several implementations and select the highest canary score unless
that model-selection procedure and its statistical correction were
preregistered.

## Isolation threat model

An instruction not to inspect a file is not isolation.

The holdout owner must prevent the implementation environment from reading:

- sample files;
- prompts;
- expected labels;
- per-sample requests and responses;
- temporary files;
- logs that reveal sample order or category;
- caches and artifacts.

Use an execution boundary that the implementation identity cannot bypass, such
as a separate service identity, operating-system identity, isolated worker, or
equivalent access-control boundary. A directory mode change is insufficient
when both processes have the same privileged identity.

The implementation side should receive only the preregistered aggregate
response. Log:

- query timestamp;
- source fingerprint;
- evaluator fingerprint;
- decision rule;
- returned aggregate;
- resulting action.

## Independence audit

Before calling a dataset sealed, check:

- who generated it;
- who could read it;
- whether its aggregate score was previously queried;
- whether its cases are paraphrases of known regression cases;
- whether its labels or examples appear in prompts, tests, reports, caches, or
  conversation history;
- whether the evaluator was tuned against it.

Unknown access history means `UNPROVEN`, not sealed.
