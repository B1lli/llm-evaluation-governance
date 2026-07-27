# LLM Evaluation Governance Skill

A dependency-free agent skill package for testing and governing stochastic,
multi-stage language-model workflows.

It provides one router and five focused subskills:

- recorded-output replay and stage fixtures;
- structure-first prompt repair and clause ablation;
- statistical acceptance gates;
- regression, canary, and sealed-holdout governance;
- bounded sample-level concurrency.

## Install

Copy this directory into a compatible agent skills directory:

```text
<skills-root>/llm-evaluation-governance/
```

The discoverable entry point is `SKILL.md`. It routes to the nested subskills
only when their responsibilities apply.

## Requirements

- A recent Node.js runtime for the optional scripts.
- No third-party packages.

## Validate

```bash
node scripts/test.mjs
```

## Design principles

- Give semantic models broad evidence and deterministic systems narrow
  authority.
- Separate abstentions and safe degradation from unsafe or incorrect outputs.
- Replay deterministic consumers before spending model calls.
- Test changed model stages directly before complete workflows.
- Calculate statistical gates from product targets and false-alarm budgets.
- Treat repeatedly queried aggregate canaries as validation data.
- Parallelize independent sample chains, not dependent stages.

## License

MIT. See `LICENSE`.
