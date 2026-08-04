#!/usr/bin/env tsx

/**
 * Continuous Test Suite — Registry-Driven Sampling Parameters (N3)
 *
 * Covers the rejecting-family patterns (Sonnet 5 / Opus 4.7+ / Opus 5 /
 * Fable-Mythos, including Vertex dated ids and gateway prefixes), registry
 * capability overrides, and the resolveSamplingParams strip helper.
 *
 * Migrated from test/samplingParams.test.ts — see CLAUDE.md: suites run via
 * tsx, not a Vitest runner.
 *
 * Run with: npx tsx test/continuous-test-suite-sampling-params.ts
 */

import {
  MODEL_REGISTRY,
  modelSupportsSamplingParams,
  resolveSamplingParams,
} from "../src/lib/models/modelRegistry.js";
import { assert, assertEqual, defineSuite } from "./helpers/harness.js";

const { test, runSuite } = defineSuite("Sampling Parameter Registry");

/** Families that must have sampling params stripped, on every provider. */
const REJECTING_MODELS = [
  "claude-sonnet-5",
  "claude-sonnet-5@20260203",
  "claude-sonnet-5-v2",
  "vertex_ai/claude-sonnet-5@20260203",
  "claude-opus-4-7",
  "claude-opus-4-8",
  "claude-opus-4.8",
  "claude-opus-4-10",
  "claude-opus-5",
  "claude-fable-5",
  "claude-mythos-5",
];

/** Families that must keep them. */
const SUPPORTING_MODELS = [
  "claude-sonnet-4-5",
  "claude-sonnet-4-6",
  "claude-opus-4-5",
  "claude-opus-4-6",
  "claude-haiku-4-5",
  "claude-3-5-sonnet-20241022",
  "gpt-4o",
  "gemini-2.5-pro",
];

await test("rejecting families are rejected on every provider", () => {
  const supported = REJECTING_MODELS.filter((model) =>
    ["vertex", "anthropic", "openai-compatible"].some((provider) =>
      modelSupportsSamplingParams(provider, model),
    ),
  );
  assert(
    supported.length === 0,
    `expected every rejecting family to be stripped, but these were supported: ${supported.join(", ")}`,
  );
});

await test("supporting families keep sampling params", () => {
  const rejected = SUPPORTING_MODELS.filter(
    (model) => !modelSupportsSamplingParams("anthropic", model),
  );
  assert(
    rejected.length === 0,
    `expected every supporting family to be kept, but these were rejected: ${rejected.join(", ")}`,
  );
});

await test("defaults to supported for empty/undefined models", () => {
  assert(
    modelSupportsSamplingParams("anthropic", undefined),
    "undefined model should fail open to supported",
  );
  assert(
    modelSupportsSamplingParams("anthropic", ""),
    "empty model should fail open to supported",
  );
});

await test("an explicit capabilities.samplingParams=false wins over patterns", () => {
  const entry = MODEL_REGISTRY["gpt-4o"];
  assert(entry !== undefined, "gpt-4o is expected in the registry");
  const original = entry.capabilities.samplingParams;
  try {
    entry.capabilities.samplingParams = false;
    assert(
      !modelSupportsSamplingParams("openai", "gpt-4o"),
      "explicit false should beat the pattern match",
    );
    assert(
      modelSupportsSamplingParams("azure", "gpt-4o"),
      "provider mismatch should fall back to pattern matching (fail-open)",
    );
  } finally {
    // Restored in `finally` so a failed assertion cannot leak the override into
    // every later test in this process.
    if (original === undefined) {
      delete entry.capabilities.samplingParams;
    } else {
      entry.capabilities.samplingParams = original;
    }
  }
});

await test("resolveSamplingParams passes params through for supporting models", () => {
  const resolved = resolveSamplingParams(
    "anthropic",
    "claude-sonnet-4-6",
    { temperature: 0.3, topP: 0.9 },
    "test",
  );
  assertEqual(resolved.temperature, 0.3, "temperature should survive");
  assertEqual(resolved.topP, 0.9, "topP should survive");
});

await test("resolveSamplingParams strips params for rejecting models", () => {
  const stripped = resolveSamplingParams(
    "vertex",
    "claude-sonnet-5@20260203",
    { temperature: 0.3, topP: 0.9 },
    "test",
  );
  assertEqual(
    Object.keys(stripped).length,
    0,
    `expected all params stripped, got ${JSON.stringify(stripped)}`,
  );
  const empty = resolveSamplingParams(
    "anthropic",
    "claude-fable-5",
    {},
    "test",
  );
  assertEqual(Object.keys(empty).length, 0, "empty input should stay empty");
});

await runSuite();
