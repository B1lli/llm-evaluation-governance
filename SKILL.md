---
name: llm-evaluation-governance
description: Route and govern regression work for stochastic, multi-stage LLM systems. Use when designing or changing recorded-output replay, stage fixtures, prompt clauses, statistical quality gates, safety acceptance, canary or blind-test datasets, bounded test concurrency, or evidence reports. Also use when repeated prompt fixes make different cases alternate between passing and failing.
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
