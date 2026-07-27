#!/usr/bin/env node

import assert from "node:assert/strict";
import { access, mkdtemp, readFile, readdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { binomialTail, chooseThreshold, stratifiedPassProbability } from "./binomial-gate.mjs";
import { mapWithConcurrency } from "./bounded-pool.mjs";
import { fingerprintManifest } from "./fingerprint-manifest.mjs";
import { selectSkills } from "./route.mjs";

const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const closeTo = (actual, expected, tolerance = 1e-12) => {
  assert.ok(Math.abs(actual - expected) <= tolerance, `${actual} is not within ${tolerance} of ${expected}`);
};

closeTo(binomialTail(10, 0.5, 5), 0.623046875);
const threshold = chooseThreshold(40, 0.9, 0.05);
assert.equal(threshold.threshold, 33);
closeTo(threshold.passProbability, 0.9580980573266364);
const largeThreshold = chooseThreshold(2000, 0.9, 0.05);
assert.ok(Number.isInteger(largeThreshold.threshold));
assert.ok(Number.isFinite(largeThreshold.passProbability));
assert.ok(Number.isFinite(largeThreshold.falseAlarmProbability));
assert.ok(largeThreshold.falseAlarmProbability <= 0.05);
assert.ok(1 - binomialTail(2000, 0.9, largeThreshold.threshold + 1) > 0.05);
const stratified = stratifiedPassProbability({
  strata: 4,
  perStratum: 10,
  targetRate: 0.9,
  aggregateThreshold: 33,
  minimumPerStratum: 5,
});
closeTo(stratified, 0.9579953352414687);

assert.deepEqual(selectSkills({ changes: ["deterministic"], needs: [] }), [
  "skills/replay-fixtures/SKILL.md",
]);
assert.deepEqual(selectSkills({ changes: ["schema"], needs: [] }), [
  "skills/replay-fixtures/SKILL.md",
]);
assert.deepEqual(selectSkills({ changes: ["model"], needs: [] }), [
  "skills/prompt-ablation/SKILL.md",
  "skills/replay-fixtures/SKILL.md",
  "skills/statistical-gates/SKILL.md",
]);
assert.deepEqual(selectSkills({ changes: ["prompt"], needs: ["blind", "speed"] }), [
  "skills/prompt-ablation/SKILL.md",
  "skills/replay-fixtures/SKILL.md",
  "skills/evaluation-data-governance/SKILL.md",
  "skills/bounded-concurrency/SKILL.md",
]);
assert.deepEqual(selectSkills({ changes: ["semantic-evaluator"], needs: [] }), [
  "skills/prompt-ablation/SKILL.md",
  "skills/replay-fixtures/SKILL.md",
]);
assert.deepEqual(selectSkills({ changes: ["deterministic-evaluator"], needs: [] }), [
  "skills/replay-fixtures/SKILL.md",
]);
assert.deepEqual(selectSkills({ changes: ["none"], needs: ["regression"] }), [
  "skills/replay-fixtures/SKILL.md",
  "skills/statistical-gates/SKILL.md",
  "skills/evaluation-data-governance/SKILL.md",
]);
assert.deepEqual(selectSkills({ changes: ["none"], needs: ["threshold"] }), [
  "skills/statistical-gates/SKILL.md",
]);
assert.deepEqual(selectSkills({ changes: ["none"], needs: ["blind"] }), [
  "skills/evaluation-data-governance/SKILL.md",
]);
assert.deepEqual(selectSkills({ changes: ["none"], needs: ["canary"] }), [
  "skills/statistical-gates/SKILL.md",
  "skills/evaluation-data-governance/SKILL.md",
]);
assert.deepEqual(selectSkills({ changes: ["none"], needs: ["speed"] }), [
  "skills/bounded-concurrency/SKILL.md",
]);
assert.deepEqual(
  new Set(selectSkills({ changes: ["none"], needs: ["release"] })),
  new Set([
    "skills/replay-fixtures/SKILL.md",
    "skills/prompt-ablation/SKILL.md",
    "skills/statistical-gates/SKILL.md",
    "skills/evaluation-data-governance/SKILL.md",
    "skills/bounded-concurrency/SKILL.md",
  ]),
);

let active = 0;
let peak = 0;
const poolOutput = await mapWithConcurrency([20, 10, 5, 1], 2, async (duration, index) => {
  active += 1;
  peak = Math.max(peak, active);
  await new Promise((resolve) => setTimeout(resolve, duration));
  active -= 1;
  return index;
});
assert.deepEqual(poolOutput, [0, 1, 2, 3]);
assert.equal(peak, 2);

const root = await mkdtemp(join(tmpdir(), "llm-eval-skill-"));
await writeFile(join(root, "a.txt"), "alpha\n");
await writeFile(join(root, "b.txt"), "beta\n");
const first = await fingerprintManifest({ root, files: ["a.txt", "b.txt"], metadata: { model: "example" } });
const second = await fingerprintManifest({ root, files: ["b.txt", "a.txt"], metadata: { model: "example" } });
assert.equal(first.fingerprint, second.fingerprint);
assert.equal(first.entries.length, 2);
const nestedFirst = await fingerprintManifest({
  root,
  files: ["a.txt"],
  metadata: { routing: { retry: 1, provider: "example" }, model: "example" },
});
const nestedSecond = await fingerprintManifest({
  root,
  files: ["a.txt"],
  metadata: { model: "example", routing: { provider: "example", retry: 1 } },
});
assert.equal(nestedFirst.fingerprint, nestedSecond.fingerprint);

async function collectSkillFiles(directory) {
  const output = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) output.push(...(await collectSkillFiles(path)));
    else if (entry.isFile() && entry.name === "SKILL.md") output.push(path);
  }
  return output;
}

const skillNames = new Set();
for (const skillPath of await collectSkillFiles(packageRoot)) {
  const text = await readFile(skillPath, "utf8");
  const match = text.match(/^---\nname:\s*([^\n]+)\ndescription:\s*([^\n]+)\n---\n/u);
  assert.ok(match, `Invalid skill frontmatter: ${skillPath}`);
  assert.ok(!skillNames.has(match[1]), `Duplicate skill name: ${match[1]}`);
  skillNames.add(match[1]);
}
assert.equal(skillNames.size, 6);
for (const schemaName of ["evidence-manifest.schema.json", "stage-fixture.schema.json"]) {
  JSON.parse(await readFile(join(packageRoot, "templates", schemaName), "utf8"));
}
for (const selected of selectSkills({
  changes: [
    "deterministic",
    "prompt",
    "schema",
    "model",
    "deterministic-evaluator",
    "semantic-evaluator",
  ],
  needs: ["regression", "threshold", "blind", "canary", "speed", "release"],
})) {
  await access(join(packageRoot, selected));
}

process.stdout.write("All skill package tests passed.\n");
