#!/usr/bin/env tsx
/**
 * Continuous Test Suite: unified-files prompt sync (pure, no API).
 *
 * Regression guard for the file-drop defect on the native Claude generate path:
 * `neurolink.ts` snapshots `prompt: options.input?.text` at baseOptions
 * creation, BEFORE `processUnifiedFilesArray` appends attached-file content to
 * `input.text`. `executeNativeAnthropicGenerate` then read `options.prompt`
 * first, so the stale snapshot won without the file content — the model
 * answered "no file attached" to a request that carried a real CSV. (The native
 * Gemini path reads input.text first and never had the bug, which is why it
 * was Claude-specific.)
 *
 * Two fixes lock together and both are covered here at the shared layer:
 *  - `processUnifiedFilesArray` now mirrors the enriched text onto
 *    `options.prompt` when a prompt snapshot exists (the same dual-write
 *    `processCSVFilesForNativeSDK` already documents for this exact trap).
 *  - the Anthropic generate path reads `input.text` first (belt and braces —
 *    not unit-testable here because the method is private to the client).
 *
 * Run: npx tsx test/continuous-test-suite-unified-files-prompt-sync.ts
 */

import { defineSuite, assert, assertEqual } from "./helpers/harness.js";
import { processUnifiedFilesArray } from "../src/lib/utils/messageBuilder.js";
import type { GenerateOptions } from "../src/lib/types/index.js";

const { test, runSuite } = defineSuite("Unified-files prompt sync");

const QUESTION =
  "What is the exact sum of the amount column in the attached CSV file?";
const CSV = Buffer.from("txn_id,amount\nA,10.50\nB,20.25\n", "utf8");

const makeOptions = (withPrompt: boolean): GenerateOptions => {
  const options = {
    input: {
      text: QUESTION,
      files: [{ buffer: CSV, filename: "mini.csv", mimetype: "text/csv" }],
    },
  } as unknown as GenerateOptions;
  if (withPrompt) {
    // Mirrors neurolink.ts baseOptions: prompt snapshotted from the ORIGINAL
    // input.text before any file preprocessing runs.
    (options as { prompt?: string }).prompt = QUESTION;
  }
  return options;
};

await test("prompt snapshot is re-synced with the file-enriched input.text", async () => {
  const options = makeOptions(true);
  await processUnifiedFilesArray(options, 100 * 1024 * 1024, "vertex");

  const prompt = (options as { prompt?: string }).prompt ?? "";
  const text = options.input?.text ?? "";

  assert(
    text.includes("10.50") && text.includes("20.25"),
    "input.text carries the inlined CSV content",
  );
  assertEqual(
    prompt,
    text,
    "options.prompt must equal the enriched input.text — a stale snapshot is exactly the state that dropped attachments on the Claude generate path",
  );
});

await test("no prompt snapshot means none is invented", async () => {
  const options = makeOptions(false);
  await processUnifiedFilesArray(options, 100 * 1024 * 1024, "vertex");

  assertEqual(
    (options as { prompt?: string }).prompt,
    undefined,
    "prompt stays absent when the caller never set one",
  );
  assert(
    (options.input?.text ?? "").includes("10.50"),
    "input.text still carries the inlined CSV content",
  );
});

await runSuite();
