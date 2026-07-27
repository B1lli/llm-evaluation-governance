# Aggregate Canary Preregistration

Complete and freeze this document before querying the canary.

## Frozen implementation

- Source-state fingerprint:
- Prompt and schema fingerprint:
- Evaluator fingerprint:
- Model identifier:
- Provider or endpoint class:
- Routing and retry policy:

## Query contract

- Dataset identifier:
- Dataset lifecycle state:
- Maximum query count:
- Aggregate fields returned:
- Sample-level fields prohibited:

## Decision rule

- Pass threshold:
- Abstention or omission threshold:
- Unsafe-output threshold:
- Invalid-structure threshold:
- Infrastructure policy:
- Stratum-collapse guard:

## Permitted actions

- On pass:
- On rollback signal:
- On infrastructure failure:
- On ambiguous result:

## Retirement

- Does this query make the dataset a validation set?
- Where is the untouched sealed holdout?
- Who owns the per-sample report?
