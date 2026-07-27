#!/usr/bin/env node

import { createHash } from "node:crypto";
import { readFile, realpath } from "node:fs/promises";
import { relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

function stableJson(value) {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${stableJson(value[key])}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}

export async function fingerprintManifest({ root, files, metadata = {} }) {
  const canonicalRoot = await realpath(root);
  const hash = createHash("sha256");
  hash.update(`${stableJson(metadata)}\n`);
  const entries = [];
  for (const suppliedPath of [...files].sort()) {
    const absolutePath = resolve(canonicalRoot, suppliedPath);
    const canonicalPath = await realpath(absolutePath);
    const relativePath = relative(canonicalRoot, canonicalPath);
    if (!relativePath || relativePath.startsWith("..")) {
      throw new Error(`File is outside the declared root: ${suppliedPath}`);
    }
    const content = await readFile(canonicalPath);
    const contentDigest = createHash("sha256").update(content).digest("hex");
    hash.update(`${relativePath}\0${contentDigest}\n`);
    entries.push({ path: relativePath, sha256: contentDigest });
  }
  return { algorithm: "sha256", fingerprint: hash.digest("hex"), metadata, entries };
}

function parseArgs(argv) {
  let root = ".";
  const files = [];
  let metadata = {};
  for (let index = 0; index < argv.length; index += 1) {
    const key = argv[index];
    const value = argv[index + 1];
    if (key === "--root") {
      root = value;
      index += 1;
    } else if (key === "--file") {
      files.push(value);
      index += 1;
    } else if (key === "--metadata") {
      metadata = JSON.parse(value);
      index += 1;
    } else {
      throw new Error(`Unknown argument: ${key}`);
    }
  }
  if (files.length === 0) throw new Error("At least one --file is required");
  return { root, files, metadata };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  try {
    process.stdout.write(`${JSON.stringify(await fingerprintManifest(parseArgs(process.argv.slice(2))), null, 2)}\n`);
  } catch (error) {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
    process.exitCode = 1;
  }
}
