#!/usr/bin/env node

import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const validChanges = new Set([
  "deterministic",
  "prompt",
  "schema",
  "model",
  "deterministic-evaluator",
  "semantic-evaluator",
  "none",
]);
const validNeeds = new Set(["regression", "threshold", "blind", "canary", "speed", "release"]);

export function selectSkills({ changes = [], needs = [] }) {
  const changeSet = new Set(changes);
  const needSet = new Set(needs);
  const selected = [];
  const add = (skill) => {
    if (!selected.includes(skill)) selected.push(skill);
  };

  if (
    ["deterministic", "schema", "deterministic-evaluator"].some((item) => changeSet.has(item)) ||
    needSet.has("regression") ||
    needSet.has("release")
  ) {
    add("skills/replay-fixtures/SKILL.md");
  }
  if (
    changeSet.has("prompt") ||
    changeSet.has("model") ||
    changeSet.has("semantic-evaluator")
  ) {
    add("skills/prompt-ablation/SKILL.md");
    add("skills/replay-fixtures/SKILL.md");
  }
  if (
    needSet.has("threshold") ||
    needSet.has("regression") ||
    needSet.has("canary") ||
    needSet.has("release") ||
    changeSet.has("model")
  ) {
    add("skills/statistical-gates/SKILL.md");
  }
  if (
    needSet.has("regression") ||
    needSet.has("blind") ||
    needSet.has("canary") ||
    needSet.has("release")
  ) {
    add("skills/evaluation-data-governance/SKILL.md");
  }
  if (needSet.has("speed")) {
    add("skills/bounded-concurrency/SKILL.md");
  }
  if (needSet.has("release")) {
    add("skills/prompt-ablation/SKILL.md");
    add("skills/bounded-concurrency/SKILL.md");
  }
  return selected;
}

function parseArgs(argv) {
  const changes = [];
  const needs = [];
  let json = false;
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--json") {
      json = true;
      continue;
    }
    if (arg !== "--change" && arg !== "--need") {
      throw new Error(`Unknown argument: ${arg}`);
    }
    const value = argv[index + 1];
    if (!value) throw new Error(`Missing value for ${arg}`);
    index += 1;
    if (arg === "--change") {
      if (!validChanges.has(value)) throw new Error(`Unknown change facet: ${value}`);
      changes.push(value);
    } else {
      if (!validNeeds.has(value)) throw new Error(`Unknown need facet: ${value}`);
      needs.push(value);
    }
  }
  return { changes, needs, json };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  try {
    const input = parseArgs(process.argv.slice(2));
    const result = {
      changes: [...new Set(input.changes)],
      needs: [...new Set(input.needs)],
      selectedSkills: selectSkills(input),
    };
    process.stdout.write(input.json ? `${JSON.stringify(result)}\n` : `${JSON.stringify(result, null, 2)}\n`);
  } catch (error) {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
    process.exitCode = 1;
  }
}
