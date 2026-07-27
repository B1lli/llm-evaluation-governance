---
name: llm-eval-statistical-gates
description: Design statistically meaningful acceptance gates for stochastic LLM workflows. Use for tolerated abstention or omission rates, sample-size decisions, false-alarm budgets, safety upper bounds, cumulative evidence, or distinguishing regression from sampling noise.
---

# Statistical Gates

## Start with product semantics

Declare separately:

- target success probability when abstentions or omissions are tolerated;
- maximum false-alarm probability for a conforming implementation;
- unsafe-output tolerance;
- invalid-structure policy;
- infrastructure-failure policy;
- strata that must not collapse independently.

Do not derive safety acceptance from an average pass rate.

## Abstention-or-omission threshold

For batch size `n`, target success rate `p0`, and false-alarm budget `alpha`,
choose the largest integer threshold `k` satisfying:

```text
P(X < k | X ~ Binomial(n, p0)) <= alpha
```

Then pass the abstention-or-omission batch when `X >= k`, subject to any preregistered
stratum-collapse guard.

Calculate rather than memorize thresholds:

```bash
node ../../scripts/binomial-gate.mjs \
  --n 40 \
  --target-rate 0.9 \
  --max-false-alarm 0.05
```

If the product requires coverage across categories, add a preregistered
per-stratum minimum and calculate the combined false-alarm rate:

```bash
node ../../scripts/binomial-gate.mjs \
  --n 40 \
  --target-rate 0.9 \
  --max-false-alarm 0.05 \
  --strata 4 \
  --per-stratum 10 \
  --min-per-stratum 5
```

The included stratified calculation assumes independent samples and the same
target success probability in each stratum. If those assumptions do not match
the product, declare a different model instead of reusing the number.

## Zero observed unsafe outputs

Zero observed failures does not prove a zero true failure rate. With `n`
independent clean samples, the one-sided upper confidence bound is:

```text
1 - alpha^(1/n)
```

Report both:

- observed unsafe count;
- confidence bound or equivalent evidence statement.

Accumulate safety evidence only within an exact evidence bucket:

- source-state fingerprint;
- prompt and schema fingerprint;
- evaluator fingerprint;
- model identifier;
- provider or endpoint class;
- relevant routing and retry policy.

Do not pool incompatible implementations to manufacture a larger clean sample.

## Separate outcome classes

Maintain distinct counters:

- pass;
- abstention, omission, or empty output;
- safe degraded or partial output;
- unsafe or incorrect output;
- invalid structure;
- transport or evaluator infrastructure failure.

Unsafe output remains an immediate batch failure when the declared tolerance is
zero. Invalid structure and infrastructure failures do not enter the abstention
denominator unless the preregistered product policy explicitly says otherwise.

## Noise baselines

Repeated runs under an identical evidence bucket can estimate ordinary
variation. Use them to decide whether a red result justifies an implementation
change.

Do not:

- use the observed minimum and maximum as a permanent acceptance interval;
- turn a formal failure into a pass after seeing the result;
- treat unsafe outputs as acceptable noise;
- rerun until one batch passes.

If the gate has low power against a gradual degradation, accumulate evidence or
increase the preregistered sample size. State the detectable effect size and
remaining uncertainty.
