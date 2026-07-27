---
name: llm-eval-bounded-concurrency
description: Speed up expensive multi-stage LLM evaluations with bounded sample-level concurrency while preserving first-decision semantics, rate-limit evidence, and per-sample audit trails. Use when test runs are slow or currently serial.
---

# Bounded Sample Concurrency

## Correct parallelization unit

Represent one evaluation sample as a dependency chain:

```text
input
  -> generation stage
  -> classification or review stages
  -> normalization
  -> independent evaluation
  -> classified outcome
```

Stages that consume earlier outputs remain sequential inside the sample.
Independent samples may run concurrently.

Do not start every model request in the workflow at once. Parallelize sample
chains through a bounded worker pool.

## Preserve semantics

Concurrency must not change the quality definition:

- keep the first completed semantic decision for each sample;
- do not replace a red sample with another draw;
- permit transport retries only under a preregistered policy that cannot choose
  among completed semantic outputs;
- keep structure repair inside the original sample audit;
- assign stable sample identifiers before execution;
- preserve every request, response, stage, elapsed time, and outcome.

Use `../../scripts/bounded-pool.mjs` as a dependency-free pool primitive.

## Capacity ramp

Benchmark increasing concurrency, for example:

```text
1 -> 4 -> 8 -> 16 -> provider-supported limit
```

At each level record:

- wall-clock duration;
- queue time;
- request latency distribution;
- active-request peak;
- rate-limit responses;
- timeouts;
- relay reconnects;
- invalid structures;
- semantic outcome distribution.

Choose the highest level that improves wall time without materially increasing
infrastructure or quality failures.

## Generation and evaluator pools

When the independent evaluator uses the same provider, consider separate
bounded pools or a two-phase schedule:

1. generate all sample outcomes;
2. evaluate non-empty candidates.

This prevents evaluator traffic from unpredictably starving generation calls.
Keep the report linked by stable sample identifier.

## Expected wall time

For independent sample chains, the lower bound is the larger of:

- total service time divided by concurrency;
- the longest dependency chain.

Provider queueing, shared relays, rate limits, and tail latency can raise the
actual value. Never promise ideal speedup without a concurrency benchmark.
