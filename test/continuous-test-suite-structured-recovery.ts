#!/usr/bin/env tsx

/**
 * Continuous Test Suite — Structured-Recovery Candidate Ladder (N4)
 *
 * Covers the order candidates are tried in (provider structuredData → raw JSON
 * → ```json fence → brace span → top-level array), the fall-through to the
 * first schema-valid candidate, coercion, and error reporting.
 *
 * Migrated from test/structuredRecovery.test.ts — see CLAUDE.md: suites run via
 * tsx, not a Vitest runner.
 *
 * Run with: npx tsx test/continuous-test-suite-structured-recovery.ts
 */

import { z } from "zod";
import {
  collectStructuredCandidates,
  recoverStructuredData,
} from "../src/lib/agent/structuredRecovery.js";
import {
  assert,
  assertEqual,
  assertIncludes,
  defineSuite,
} from "./helpers/harness.js";

const { test, runSuite } = defineSuite("Structured Recovery Ladder");

const schema = z.object({ findings: z.array(z.string()) });

await test("ladder puts structuredData first and still finds the brace span", () => {
  const candidates = collectStructuredCandidates(
    'prefix {"findings":["a"]} suffix',
    { findings: ["sd"] },
  );
  assertEqual(
    candidates[0]?.source,
    "structured-data",
    "provider structuredData must be tried first",
  );
  assert(
    candidates.map((c) => c.source).includes("brace-span"),
    "the embedded object should still be offered as a later candidate",
  );
});

await test("extracts a ```json fence", () => {
  const sources = collectStructuredCandidates(
    'Here you go:\n```json\n{"findings":["x"]}\n```\nDone.',
  ).map((c) => c.source);
  assert(
    sources.includes("json-fence"),
    `expected a json-fence candidate, got: ${sources.join(", ")}`,
  );
});

await test("extracts a top-level array span", () => {
  const arr = collectStructuredCandidates(
    'Results: ["a","b"] — as requested.',
  ).find((c) => c.source === "top-level-array");
  assertEqual(
    JSON.stringify(arr?.value),
    JSON.stringify(["a", "b"]),
    "the array span should be parsed verbatim",
  );
});

await test("returns nothing for prose", () => {
  assertEqual(
    collectStructuredCandidates("no json here").length,
    0,
    "prose should yield no candidates",
  );
});

await test("prefers provider structuredData when valid", () => {
  const result = recoverStructuredData({
    content: '{"findings":["text"]}',
    structuredData: { findings: ["provider"] },
    schema,
  });
  assertEqual(
    result.source,
    "structured-data",
    "source should be the provider",
  );
  assertEqual(
    JSON.stringify(result.data),
    JSON.stringify({ findings: ["provider"] }),
    "provider data should win over the content-embedded object",
  );
});

await test("falls through invalid candidates to the first valid one", () => {
  const result = recoverStructuredData({
    content: 'garbage then {"findings":["ok"]} trailing',
    structuredData: { wrong: true },
    schema,
  });
  assertEqual(result.source, "brace-span", "should land on the brace span");
  assertEqual(
    JSON.stringify(result.data),
    JSON.stringify({ findings: ["ok"] }),
    "recovered data should come from the valid candidate",
  );
  assert(
    result.errors.length > 0,
    "the rejected structuredData should be reported as an error",
  );
});

await test("runs candidates through coerce (top-level array envelope)", () => {
  const result = recoverStructuredData({
    content: '["a","b"]',
    schema,
    coerce: (candidate) =>
      Array.isArray(candidate) ? { findings: candidate } : candidate,
  });
  assertEqual(
    JSON.stringify(result.data),
    JSON.stringify({ findings: ["a", "b"] }),
    "coerce should run before schema validation",
  );
});

await test("collects validation errors when nothing survives", () => {
  const result = recoverStructuredData({
    content: '{"findings": "not-an-array"}',
    schema,
  });
  assertEqual(result.data, undefined, "no candidate should validate");
  assertIncludes(
    result.errors.join(" "),
    "findings",
    "the error should name the offending field",
  );
});

await test("reports when no candidates exist at all", () => {
  const result = recoverStructuredData({ content: "prose only", schema });
  assertIncludes(
    result.errors.join(" "),
    "no JSON-shaped candidates",
    "the no-candidate case should be distinguishable from a validation failure",
  );
});

await test("a throwing coerce is an error entry, not a crash", () => {
  // A coerce callback is caller-supplied, so it has to be treated as hostile:
  // a throw belongs in the error list, not propagated out of recovery.
  const result = recoverStructuredData({
    content: '{"findings":["x"]}',
    schema,
    coerce: () => {
      throw new Error("coerce exploded");
    },
  });
  assertEqual(result.data, undefined, "a throwing coerce should yield no data");
  assertIncludes(
    result.errors.join(" "),
    "coerce exploded",
    "the coerce failure should be reported",
  );
});

await runSuite();
