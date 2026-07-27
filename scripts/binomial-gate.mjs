#!/usr/bin/env node

import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

function parseNumber(value, label) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) throw new Error(`${label} must be a finite number`);
  return parsed;
}

function validateDistributionInput(n, p) {
  if (!Number.isInteger(n) || n < 0) throw new Error("n must be a non-negative integer");
  if (!Number.isFinite(p) || p < 0 || p > 1) throw new Error("p must be between 0 and 1");
}

function logCombination(n, k) {
  const selected = Math.min(k, n - k);
  let result = 0;
  for (let index = 1; index <= selected; index += 1) {
    result += Math.log(n - selected + index) - Math.log(index);
  }
  return result;
}

export function binomialDistribution(n, p) {
  validateDistributionInput(n, p);
  const distribution = Array(n + 1).fill(0);
  if (p === 0) {
    distribution[0] = 1;
    return distribution;
  }
  if (p === 1) {
    distribution[n] = 1;
    return distribution;
  }

  const mode = Math.min(n, Math.floor((n + 1) * p));
  distribution[mode] = Math.exp(
    logCombination(n, mode) + mode * Math.log(p) + (n - mode) * Math.log1p(-p),
  );

  for (let successes = mode; successes > 0; successes -= 1) {
    distribution[successes - 1] =
      distribution[successes] *
      (successes / (n - successes + 1)) *
      ((1 - p) / p);
  }
  for (let successes = mode; successes < n; successes += 1) {
    distribution[successes + 1] =
      distribution[successes] *
      ((n - successes) / (successes + 1)) *
      (p / (1 - p));
  }

  const total = distribution.reduce((sum, probability) => sum + probability, 0);
  if (!Number.isFinite(total) || total <= 0) {
    throw new Error("Unable to calculate a stable binomial distribution");
  }
  return distribution.map((probability) => probability / total);
}

export function binomialPmf(n, p, k) {
  if (!Number.isInteger(k) || k < 0 || k > n) return 0;
  return binomialDistribution(n, p)[k];
}

export function binomialTail(n, p, minimum) {
  validateDistributionInput(n, p);
  if (!Number.isInteger(minimum)) throw new Error("minimum must be an integer");
  if (minimum <= 0) return 1;
  if (minimum > n) return 0;
  return binomialDistribution(n, p)
    .slice(minimum)
    .reduce((sum, probability) => sum + probability, 0);
}

export function chooseThreshold(n, targetRate, maxFalseAlarm) {
  validateDistributionInput(n, targetRate);
  if (!Number.isFinite(maxFalseAlarm) || maxFalseAlarm < 0 || maxFalseAlarm > 1) {
    throw new Error("maxFalseAlarm must be between 0 and 1");
  }
  const distribution = binomialDistribution(n, targetRate);
  let selected = 0;
  let lowerTail = 0;
  for (let threshold = 1; threshold <= n; threshold += 1) {
    lowerTail += distribution[threshold - 1];
    if (lowerTail <= maxFalseAlarm + Number.EPSILON) selected = threshold;
  }
  const falseAlarmProbability = distribution
    .slice(0, selected)
    .reduce((sum, probability) => sum + probability, 0);
  return {
    threshold: selected,
    passProbability: 1 - falseAlarmProbability,
    falseAlarmProbability,
  };
}

function convolve(left, right) {
  const output = Array(left.length + right.length - 1).fill(0);
  for (let leftIndex = 0; leftIndex < left.length; leftIndex += 1) {
    for (let rightIndex = 0; rightIndex < right.length; rightIndex += 1) {
      output[leftIndex + rightIndex] += left[leftIndex] * right[rightIndex];
    }
  }
  return output;
}

export function stratifiedPassProbability({
  strata,
  perStratum,
  targetRate,
  aggregateThreshold,
  minimumPerStratum,
}) {
  let distribution = [1];
  const oneStratum = binomialDistribution(perStratum, targetRate).map((probability, successes) =>
    successes >= minimumPerStratum ? probability : 0,
  );
  for (let index = 0; index < strata; index += 1) {
    distribution = convolve(distribution, oneStratum);
  }
  return distribution.slice(aggregateThreshold).reduce((sum, value) => sum + value, 0);
}

function parseArgs(argv) {
  const options = {};
  for (let index = 0; index < argv.length; index += 2) {
    const key = argv[index];
    const value = argv[index + 1];
    if (!key?.startsWith("--") || value === undefined) throw new Error(`Invalid argument near ${key ?? "<end>"}`);
    options[key.slice(2)] = value;
  }
  const n = parseNumber(options.n, "n");
  const targetRate = parseNumber(options["target-rate"], "target-rate");
  const maxFalseAlarm = parseNumber(options["max-false-alarm"], "max-false-alarm");
  if (!Number.isInteger(n) || n <= 0) throw new Error("n must be a positive integer");
  if (targetRate <= 0 || targetRate >= 1) throw new Error("target-rate must be between 0 and 1");
  if (maxFalseAlarm <= 0 || maxFalseAlarm >= 1) {
    throw new Error("max-false-alarm must be between 0 and 1");
  }
  const optionalIntegers = ["strata", "per-stratum", "min-per-stratum"];
  for (const key of optionalIntegers) {
    if (options[key] !== undefined) {
      options[key] = parseNumber(options[key], key);
      if (!Number.isInteger(options[key]) || options[key] < 0) throw new Error(`${key} must be an integer`);
    }
  }
  return { n, targetRate, maxFalseAlarm, options };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  try {
    const { n, targetRate, maxFalseAlarm, options } = parseArgs(process.argv.slice(2));
    const threshold = chooseThreshold(n, targetRate, maxFalseAlarm);
    const output = { n, targetRate, maxFalseAlarm, ...threshold };
    if (options.strata !== undefined || options["per-stratum"] !== undefined || options["min-per-stratum"] !== undefined) {
      const strata = options.strata;
      const perStratum = options["per-stratum"];
      const minimumPerStratum = options["min-per-stratum"];
      if (!strata || !perStratum || minimumPerStratum === undefined || strata * perStratum !== n) {
        throw new Error("strata * per-stratum must equal n, and min-per-stratum is required");
      }
      const passProbability = stratifiedPassProbability({
        strata,
        perStratum,
        targetRate,
        aggregateThreshold: threshold.threshold,
        minimumPerStratum,
      });
      output.stratified = {
        strata,
        perStratum,
        minimumPerStratum,
        passProbability,
        falseAlarmProbability: 1 - passProbability,
      };
    }
    process.stdout.write(`${JSON.stringify(output, null, 2)}\n`);
  } catch (error) {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
    process.exitCode = 1;
  }
}
