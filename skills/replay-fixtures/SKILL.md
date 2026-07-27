---
name: llm-eval-replay-fixtures
description: Build and use zero-model recorded-output replay plus stage-specific semantic fixtures for multi-stage LLM workflows. Use for deterministic post-processing changes, schema changes, precise failure localization, or reducing expensive end-to-end model runs.
---

# Recorded Replay and Stage Fixtures

## Goal

Detect deterministic regressions in seconds and localize semantic regressions
to one model stage. Do not spend model calls proving behavior that is fully
determined by recorded inputs and outputs.

## Two different test layers

### Recorded-output replay

Freeze the model responses from a historical run and replay only deterministic
consumers, such as:

- schema parsing and normalization;
- provenance and source binding;
- capability and authorization ceilings;
- routing, selector, and guard validation;
- assembly and deduplication;
- immutable-content fingerprints;
- downstream action-plan construction.

Replay must not call a model. It answers:

> Given these exact model outputs, does the current deterministic code preserve
> the intended invariant?

It does not answer:

> Would the current model and prompt produce these outputs?

### Stage semantic fixtures

Freeze the upstream input to one model stage, call only that stage, and assert
semantic invariants on its output.

Examples:

- source material to structured extraction;
- structured input to classification;
- authoritative sources plus a candidate to fidelity review;
- accepted candidate to downstream normalization.

Do not require one exact output string when multiple equivalent outputs are
valid. Express:

- required semantic atoms;
- forbidden semantic atoms;
- allowed types, capabilities, categories, or modes;
- conditions and exceptions that must remain;
- structural constraints.

Use `../../templates/stage-fixture.schema.json` as the portable fixture
contract. Its fields are deliberately semantic descriptions rather than
fixture-specific regular expressions.

## Replay eligibility

Every recorded run must carry:

- source-state fingerprint;
- prompt and schema fingerprint;
- evaluator fingerprint;
- model identifier;
- provider or endpoint class;
- stage name;
- input digest;
- raw response digest;
- fixture version.

Only combine or compare runs when the dimensions relevant to the conclusion
match. If a schema changed, classify an old record as:

1. directly replayable;
2. replayable through an explicit lossless adapter;
3. historical evidence only.

Never silently coerce an incompatible response into the current schema.

Use `../../templates/evidence-manifest.schema.json` as the manifest contract.
Use `../../scripts/fingerprint-manifest.mjs` to create reproducible source
fingerprints.

## Workflow

1. Identify whether the changed behavior occurs before, inside, or after a
   model stage.
2. For deterministic changes, run the complete recorded-output corpus first.
3. For prompt or semantic changes, run the smallest affected stage fixture,
   including at least:
   - the original failure;
   - a neighboring valid case;
   - a counterexample that the change must still reject;
   - a cross-domain example.
4. Run the complete stochastic gate only after targeted layers pass.
5. Preserve every red sample; do not replace it with another draw.

## Acceptance language

Use precise conclusions:

- `PASS — deterministic replay`
- `PASS — stage contract`
- `FAIL — deterministic compatibility`
- `FAIL — stage semantic regression`
- `UNPROVEN — current model generation`
- `UNPROVEN — complete workflow`

Never report replay or a stage fixture as end-to-end completion.
