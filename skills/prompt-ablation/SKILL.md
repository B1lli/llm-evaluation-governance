---
name: llm-eval-prompt-ablation
description: Govern prompt changes in multi-stage LLM workflows through structure-first repair, clause registries, positive and negative fixtures, and repeated ablation. Use when prompts are growing, fixes alternate between cases, or a semantic failure may be better expressed as code.
---

# Structure-First Repair and Prompt Ablation

## Repair order

For every failure, classify the source before editing:

1. incorrect case, label, or evaluator;
2. deterministic consumer defect;
3. duplicated or contradictory protocol field;
4. responsibility assigned to the wrong model stage;
5. genuine semantic instruction gap;
6. stochastic fluctuation without evidence of a regression.

Apply the first applicable repair:

1. fix the case or evaluator when the product output is already correct;
2. encode a domain-independent monotonic invariant in code;
3. remove redundant fields or duplicate decision sources;
4. move the decision to the stage that owns it;
5. simplify or add a prompt clause only when semantic interpretation is
   genuinely required.

Do not add domain terms, fixture wording, identifiers, or sample-specific
branches to production code.

## Good code invariants

Prefer code for facts such as:

- capabilities or authorization may be preserved or narrowed, never enlarged;
- evidence must bind to a real source;
- immutable content cannot change after freezing;
- each expected index appears exactly once;
- ignored fields cannot grant authority;
- one invalid sibling cannot mutate another sibling;
- invalid structure fails closed without inventing content.

Do not hard-code code for questions such as pronoun reference, semantic
equivalence, whether a statement implies an unstated constraint, or whether an
exception applies to the current input. Those require semantic judgment.

## Clause registry

Register every new or materially changed clause using
`../../templates/prompt-clause-registry.md`.

Each entry must contain:

- invariant protected;
- original failure class;
- positive fixtures;
- negative fixtures;
- cross-domain fixture;
- stage owner;
- known overlapping clauses;
- token cost;
- addition evidence;
- later ablation evidence.

## Ablation

Do not keep a clause because one sample passed after it was added.

Compare the current prompt with the prompt minus that clause:

1. use the same fixture set;
2. perform enough repeated draws to distinguish a persistent effect from
   ordinary variability;
3. check positive and negative fixtures;
4. check at least one cross-domain fixture;
5. inspect interactions with neighboring clauses;
6. remove the clause if its absence causes no material regression.

Merge clauses that protect the same invariant. Prefer one clear responsibility
statement over a growing list of incident narratives.

## Stop conditions

Stop editing prompts when:

- the red result is consistent with the declared noise model;
- the failure belongs to infrastructure;
- the evaluator is wrong;
- a deterministic invariant can solve it more safely;
- the same clause helps one fixture but harms an unrelated fixture;
- the prompt is becoming a history of past incidents rather than a coherent
  contract.
