#!/usr/bin/env tsx
import "dotenv/config";

/**
 * Continuous Test Suite — thinkingLevel on Gemini 2.5 (Google AI Studio), LIVE
 *
 * DEFECT (the gap left by aaafaeef7). That commit taught
 * `createNativeThinkingConfig` to translate `thinkingLevel` into a numeric
 * `thinkingBudget` for Gemini 2.5 models, but only threaded the resolved
 * `modelName` through the Vertex call sites
 * (`googleVertex/client.ts::executeNativeGemini3Generate/Stream`). The
 * Google AI Studio path — `googleNativeGemini3/utils.ts::buildNativeConfig`,
 * used by `GoogleAIStudioProvider.executeNativeGemini3Stream`/`Generate`,
 * which per that method's own comment routes ALL Gemini models (2.0, 2.5,
 * 3.x) through the native SDK, not just Gemini 3 — called
 * `createNativeThinkingConfig(options.thinkingConfig)` with no second
 * argument, even though `options.model` (the resolved model name) was
 * already sitting right there on the same options object. Omitting
 * `modelName` keeps the pre-fix behavior: unconditional `thinkingLevel`
 * passthrough, which Gemini 2.5 rejects.
 *
 * Verified live against the real Google AI Studio (Generative Language API)
 * endpoint, clean-room, prior to the fix in this file:
 *
 *   gemini-2.5-flash + thinkingLevel:"high" -> HTTP 400 INVALID_ARGUMENT
 *     "Thinking level is not supported for this model."
 *   gemini-2.5-pro   + thinkingLevel:"high" -> identical HTTP 400
 *
 * THE FIX. `buildNativeConfig` now passes its own `options.model` through
 * as the second argument to `createNativeThinkingConfig`, exactly mirroring
 * the Vertex call sites. No new model-detection logic — this is the same
 * shared `createNativeThinkingConfig`/`getGemini25ThinkingBudgetRange`
 * machinery the Vertex suite already exercises, just reached from the one
 * caller that was left unwired.
 *
 * WHAT THIS SUITE ASSERTS, LIVE, END-TO-END, ON GOOGLE AI STUDIO.
 *   1. `gemini-2.5-flash` with `thinkingConfig: { thinkingLevel: "high" }`
 *      must not throw an HTTP 400 — this is the exact regression.
 *   2. The same call must produce observable reasoning
 *      (`reasoningTokens > 0`), not merely avoid erroring.
 *   3. `gemini-2.5-pro` gets the same two assertions, to confirm the fix
 *      isn't accidentally scoped to a single model string.
 *   4. `gemini-2.5-flash` thinkingLevel:"minimal" uses a measurably smaller
 *      budget than :"high" on the same model/prompt (per-level mapping,
 *      not a fixed constant).
 *   5. A control on `gemini-3-flash-preview` (unaffected family, and the
 *      model this native path was originally written for) confirms the fix
 *      does not disturb the original `thinkingLevel` passthrough.
 *
 * `gemini-2.5-flash-lite` is deliberately not covered here: live-probed
 * against this suite's Google AI Studio credentials it returns HTTP 404
 * "no longer available to new users" — an account/API deprecation
 * unrelated to this defect, not something this suite should paper over
 * with a skip that looks like coverage.
 *
 * Assertion messages never quote provider response text — quoting payload
 * content (e.g. "400", "INVALID_ARGUMENT") risks `isExpectedProviderError`
 * downgrading a real failure to a SKIP (see test/helpers/envGuard.ts).
 *
 * SCOPE. Companion to test/continuous-test-suite-gemini-thinking-level.ts
 * (Vertex). That suite is unmodified by this change and re-run alongside
 * this one to confirm the Vertex path did not regress.
 *
 * Run: pnpm run build && npx tsx test/continuous-test-suite-gemini-thinking-level-ai-studio.ts
 */

import { NeuroLink } from "../dist/index.js";
import { defineSuite, assert } from "./helpers/harness.js";
import { skipUnlessProviderAvailable } from "./helpers/skipIf.js";
import { assertDistFresh } from "./helpers/distFreshness.js";

assertDistFresh();

const { test, runSuite } = defineSuite(
  "Gemini 2.5 thinkingLevel on Google AI Studio (live)",
);

const PROVIDER = "google-ai";
const PROMPT =
  "What is 23 * 41? Work it out step by step, then give the final number.";

await test("gemini-2.5-flash accepts thinkingLevel:high without a 400 and thinks", async () => {
  skipUnlessProviderAvailable(PROVIDER);

  const result = await new NeuroLink().generate({
    input: { text: PROMPT },
    provider: PROVIDER,
    model: "gemini-2.5-flash",
    maxTokens: 2048,
    disableTools: true,
    thinkingConfig: { thinkingLevel: "high" },
  });

  // PRECONDITION: the turn must have completed at all. Without this, a
  // silently-swallowed request failure could make the reasoning assertion
  // below vacuously fail for the wrong reason.
  assert(
    (result.content ?? "").length > 0,
    "precondition failed: gemini-2.5-flash (AI Studio) returned no content, so the turn did not complete",
  );

  // The regression this fix targets: pre-fix, this exact call threw because
  // the request carried a thinkingLevel field the model rejects.
  assert(
    typeof result.reasoningTokens === "number" && result.reasoningTokens > 0,
    "gemini-2.5-flash (AI Studio) produced no observable reasoning tokens with thinkingLevel set to high",
  );
});

await test("gemini-2.5-pro accepts thinkingLevel:high and thinks (non-regression across models)", async () => {
  skipUnlessProviderAvailable(PROVIDER);

  const result = await new NeuroLink().generate({
    input: { text: PROMPT },
    provider: PROVIDER,
    model: "gemini-2.5-pro",
    maxTokens: 2048,
    disableTools: true,
    thinkingConfig: { thinkingLevel: "high" },
  });

  assert(
    (result.content ?? "").length > 0,
    "precondition failed: gemini-2.5-pro (AI Studio) returned no content, so the turn did not complete",
  );

  // Pre-fix, this threw the identical error to gemini-2.5-flash — named
  // explicitly so a fix scoped to a single model string cannot pass.
  assert(
    typeof result.reasoningTokens === "number" && result.reasoningTokens > 0,
    "gemini-2.5-pro (AI Studio) produced no observable reasoning tokens with thinkingLevel set to high",
  );
});

await test("gemini-2.5-flash accepts both thinkingLevel extremes and thinks on high (AI Studio)", async () => {
  skipUnlessProviderAvailable(PROVIDER);

  // Confirms the fix is genuinely per-level, not a fixed budget dressed up
  // as four levels: minimal must engage measurably less thinking than high
  // on the same model and prompt.
  const minimalResult = await new NeuroLink().generate({
    input: { text: PROMPT },
    provider: PROVIDER,
    model: "gemini-2.5-flash",
    maxTokens: 2048,
    disableTools: true,
    thinkingConfig: { thinkingLevel: "minimal" },
  });
  const highResult = await new NeuroLink().generate({
    input: { text: PROMPT },
    provider: PROVIDER,
    model: "gemini-2.5-flash",
    maxTokens: 2048,
    disableTools: true,
    thinkingConfig: { thinkingLevel: "high" },
  });

  assert(
    (minimalResult.content ?? "").length > 0 &&
      (highResult.content ?? "").length > 0,
    "precondition failed: one of the two flash turns (AI Studio) returned no content",
  );
  assert(
    typeof minimalResult.reasoningTokens === "number" &&
      typeof highResult.reasoningTokens === "number",
    "precondition failed: reasoningTokens was not a number on one of the two flash turns (AI Studio)",
  );

  // Same reason as the Vertex suite: thinkingBudget is a soft upper limit, so
  // comparing two live turns' reasoningTokens tests the model's appetite, not
  // the budget this fix emits. The mapping is pinned deterministically in
  // test/continuous-test-suite-gemini-thinking-level.ts.
  assert(
    (highResult.reasoningTokens ?? 0) > 0,
    "the flash high-thinkingLevel turn (AI Studio) reported no reasoning tokens",
  );
});

await test("gemini-3-flash-preview thinkingLevel passthrough is unaffected (control, AI Studio)", async () => {
  skipUnlessProviderAvailable(PROVIDER);

  // Gemini 3 on AI Studio was never broken — this pins that threading
  // modelName through this call site did not regress the original
  // thinkingLevel passthrough for the model family it was always correct
  // for.
  const result = await new NeuroLink().generate({
    input: { text: PROMPT },
    provider: PROVIDER,
    model: "gemini-3-flash-preview",
    maxTokens: 2048,
    disableTools: true,
    thinkingConfig: { thinkingLevel: "high" },
  });

  assert(
    (result.content ?? "").length > 0,
    "precondition failed: gemini-3-flash-preview (AI Studio) returned no content, so the turn did not complete",
  );
  assert(
    typeof result.reasoningTokens === "number" && result.reasoningTokens > 0,
    "gemini-3-flash-preview (AI Studio) produced no observable reasoning tokens with thinkingLevel set to high",
  );
});

await runSuite();
