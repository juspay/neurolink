#!/usr/bin/env tsx
/**
 * SKIP audit — parses a test-suite log and prints a per-suite tally of
 * PASS / FAIL / SKIP counts along with the SKIP reasons grouped by
 * envGuard pattern. Useful for verifying that no SKIPs have crept in
 * outside the expected provider/credential/quota gates.
 *
 * Usage:
 *   pnpm run test:matrix 2>&1 | tee /tmp/matrix.log
 *   npx tsx scripts/audit-skips.ts /tmp/matrix.log
 *
 *   # Aggregate across multiple suite logs:
 *   npx tsx scripts/audit-skips.ts /tmp/memory.log /tmp/matrix.log /tmp/ppt.log
 */

import { readFileSync } from "node:fs";
import { isExpectedProviderError } from "../test/helpers/envGuard.js";

type SuiteTally = {
  file: string;
  pass: number;
  fail: number;
  skip: number;
  unmatchedSkips: Array<{ name: string; reason: string }>;
  fails: Array<{ name: string; reason: string }>;
};

const ANSI = /\[[0-9;]*m/g;

function stripAnsi(line: string): string {
  return line.replace(ANSI, "");
}

function parseLog(file: string): SuiteTally {
  const raw = readFileSync(file, "utf-8");
  const lines = raw.split("\n").map(stripAnsi);
  const tally: SuiteTally = {
    file,
    pass: 0,
    fail: 0,
    skip: 0,
    unmatchedSkips: [],
    fails: [],
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!line) continue;

    if (/^\s*[✓✅]\s+/.test(line)) {
      tally.pass++;
    } else if (/^\s*[✗❌]\s+/.test(line)) {
      tally.fail++;
      const m = /^\s*[✗❌]\s+(.*?)$/.exec(line);
      const reason = (lines[i + 1] || "").trim().replace(/^→\s*/, "");
      tally.fails.push({ name: (m?.[1] || "").trim(), reason });
    } else if (/^\s*[⊘⏭️]\s+/.test(line)) {
      tally.skip++;
      const m = /^\s*[⊘⏭️]\s+(.*?)(?:\s+\((.*)\))?$/.exec(line);
      const name = (m?.[1] || "").trim();
      const inline = (m?.[2] || "").trim();
      const reason = inline || (lines[i + 1] || "").trim();
      if (!isExpectedProviderError(reason)) {
        tally.unmatchedSkips.push({ name, reason });
      }
    }
  }
  return tally;
}

function fmt(tally: SuiteTally): string {
  const total = tally.pass + tally.fail + tally.skip;
  const color =
    tally.fail > 0
      ? "\x1b[31m"
      : tally.unmatchedSkips.length > 0
        ? "\x1b[33m"
        : "\x1b[32m";
  const reset = "\x1b[0m";
  const header = `${color}${tally.file}${reset} — total=${total} pass=${tally.pass} fail=${tally.fail} skip=${tally.skip}`;
  const failLines = tally.fails.map(
    (f) => `  ✗ ${f.name}\n      → ${f.reason.slice(0, 200)}`,
  );
  const unmatchedLines = tally.unmatchedSkips.map(
    (s) =>
      `  ⊘ ${s.name} (UNMATCHED by envGuard)\n      → ${s.reason.slice(0, 200)}`,
  );
  return [header, ...failLines, ...unmatchedLines].join("\n");
}

const args = process.argv.slice(2);
if (args.length === 0) {
  console.error("Usage: audit-skips.ts <log-file> [log-file...]");
  process.exit(2);
}

let anyFail = false;
let anyUnmatched = false;
for (const arg of args) {
  const tally = parseLog(arg);
  console.log(fmt(tally));
  if (tally.fail > 0) anyFail = true;
  if (tally.unmatchedSkips.length > 0) anyUnmatched = true;
}

if (anyFail) {
  console.log("\n\x1b[31mRESULT: FAIL — at least one suite has FAIL\x1b[0m");
  process.exit(1);
}
if (anyUnmatched) {
  console.log(
    "\n\x1b[33mRESULT: WARN — some SKIPs are not classified by envGuard (verify they are legitimate or extend envGuard)\x1b[0m",
  );
  process.exit(0);
}
console.log(
  "\n\x1b[32mRESULT: PASS — all suites pass and all SKIPs are envGuard-classified\x1b[0m",
);
process.exit(0);
