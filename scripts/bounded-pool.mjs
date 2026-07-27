#!/usr/bin/env node

import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

export async function mapWithConcurrency(items, concurrency, worker) {
  if (!Number.isInteger(concurrency) || concurrency <= 0) {
    throw new Error("concurrency must be a positive integer");
  }
  const results = Array(items.length);
  let nextIndex = 0;
  const runWorker = async () => {
    while (true) {
      const index = nextIndex;
      nextIndex += 1;
      if (index >= items.length) return;
      results[index] = await worker(items[index], index);
    }
  };
  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, runWorker));
  return results;
}

function parseArgs(argv) {
  const options = {};
  for (let index = 0; index < argv.length; index += 2) {
    const key = argv[index];
    const value = argv[index + 1];
    if (!key?.startsWith("--") || value === undefined) throw new Error(`Invalid argument near ${key ?? "<end>"}`);
    options[key.slice(2)] = value;
  }
  const concurrency = Number(options.concurrency);
  const durations = String(options.durations ?? "")
    .split(",")
    .filter(Boolean)
    .map(Number);
  if (!Number.isInteger(concurrency) || concurrency <= 0) throw new Error("Provide --concurrency");
  if (durations.length === 0 || durations.some((value) => !Number.isFinite(value) || value < 0)) {
    throw new Error("Provide comma-separated non-negative --durations");
  }
  return { concurrency, durations };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  try {
    const { concurrency, durations } = parseArgs(process.argv.slice(2));
    const started = performance.now();
    const results = await mapWithConcurrency(durations, concurrency, async (duration, index) => {
      await new Promise((resolve) => setTimeout(resolve, duration));
      return { index, duration };
    });
    process.stdout.write(
      `${JSON.stringify({ concurrency, elapsedMs: Math.round(performance.now() - started), results }, null, 2)}\n`,
    );
  } catch (error) {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
    process.exitCode = 1;
  }
}
