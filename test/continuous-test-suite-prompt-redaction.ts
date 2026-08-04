#!/usr/bin/env tsx

/**
 * Continuous Test Suite — Prompt Redaction Utilities
 *
 * Covers src/lib/utils/promptRedaction.ts: truncation boundaries, word counts,
 * the invalid-input fallback, and the classification/routing presets.
 *
 * Migrated from test/promptRedaction.test.ts — see CLAUDE.md: suites run via
 * tsx, not a Vitest runner. That file was referenced by no script, so none of
 * this had been executed since it was written.
 *
 * Run with: npx tsx test/continuous-test-suite-prompt-redaction.ts
 */

import {
  createSafeMask,
  redactForClassification,
  redactForRouting,
  redactPrompt,
} from "../src/lib/utils/promptRedaction.js";
import { assert, assertEqual, defineSuite } from "./helpers/harness.js";

const { test, runSuite } = defineSuite("Prompt Redaction");

const INVALID = "[INVALID_PROMPT]";

await test("keeps a short prompt intact and appends the word count", () => {
  assertEqual(
    redactPrompt("Search database for user records", { showWordCount: true }),
    "Search database for user records [5 words]",
  );
});

await test("omits the word count when showWordCount is false", () => {
  assertEqual(
    redactPrompt("Search database for user records", { showWordCount: false }),
    "Search database for user records",
  );
});

await test("truncates to maxLength with an ellipsis and the ORIGINAL word count", () => {
  // 27 'a's + "..." fills exactly maxLength, and the word count reflects the
  // original prompt rather than the truncated one.
  assertEqual(
    redactPrompt("a".repeat(50) + " " + "b".repeat(50), {
      maxLength: 30,
      showWordCount: true,
    }),
    "a".repeat(27) + "... [2 words]",
  );
});

await test("truncates without a word count when showWordCount is false", () => {
  assertEqual(
    redactPrompt("a".repeat(50), { maxLength: 30, showWordCount: false }),
    "a".repeat(27) + "...",
  );
});

await test("returns the fallback indicator for an empty prompt", () => {
  assertEqual(redactPrompt(""), INVALID);
});

await test("returns the fallback indicator for null and undefined", () => {
  assertEqual(redactPrompt(null as unknown as string), INVALID);
  assertEqual(redactPrompt(undefined as unknown as string), INVALID);
});

await test("returns the fallback indicator for non-string input", () => {
  assertEqual(redactPrompt(123 as unknown as string), INVALID);
  assertEqual(redactPrompt({} as unknown as string), INVALID);
});

await test("leaves a prompt of exactly maxLength untouched", () => {
  // Boundary pair with the test below: an off-by-one in either direction fails
  // exactly one of the two.
  assertEqual(
    redactPrompt("a".repeat(100), { maxLength: 100, showWordCount: false }),
    "a".repeat(100),
  );
});

await test("truncates a prompt of exactly maxLength + 1", () => {
  assertEqual(
    redactPrompt("a".repeat(101), { maxLength: 100, showWordCount: false }),
    "a".repeat(97) + "...",
  );
});

await test("createSafeMask reports character and word counts without content", () => {
  assertEqual(
    createSafeMask("a".repeat(50) + " " + "b".repeat(49)),
    "[REDACTED: 100 chars, 2 words]",
  );
});

await test("createSafeMask returns the fallback for null and undefined", () => {
  assertEqual(createSafeMask(null as unknown as string), INVALID);
  assertEqual(createSafeMask(undefined as unknown as string), INVALID);
});

await test("createSafeMask returns the fallback for an empty prompt", () => {
  assertEqual(createSafeMask(""), INVALID);
});

await test("createSafeMask returns the fallback for non-string input", () => {
  assertEqual(createSafeMask(123 as unknown as string), INVALID);
});

await test("redactForClassification keeps a short prompt intact", () => {
  assertEqual(redactForClassification("classify query"), "classify query");
});

await test("redactForClassification uses maxLength 100 with no word count", () => {
  assertEqual(redactForClassification("a".repeat(105)), "a".repeat(97) + "...");
});

await test("redactForRouting keeps a short prompt intact and adds the word count", () => {
  assertEqual(redactForRouting("route query"), "route query [2 words]");
});

await test("redactForRouting uses maxLength 100 with a word count", () => {
  // Asserted structurally rather than by rebuilding the expected string, so the
  // test does not reimplement the truncation arithmetic it is checking.
  const result = redactForRouting("a ".repeat(55));
  const redactedPart = result.split(" [")[0];
  assert(
    result.includes("... [55 words]"),
    `expected the original word count, got "${result}"`,
  );
  assertEqual(redactedPart.length, 100, "redacted part should fill maxLength");
  assert(
    redactedPart.endsWith("..."),
    "redacted part should end with ellipsis",
  );
});

await runSuite();
