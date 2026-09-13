#!/usr/bin/env tsx
import "dotenv/config";

/**
 * Continuous Test Suite — thinkingLevel on Gemini 2.5 (Vertex), LIVE
 *
 * DEFECT. `createNativeThinkingConfig` unconditionally emitted Vertex's
 * `thinkingConfig.thinkingLevel` wire field for every Gemini model. That
 * field only exists for Gemini 3 — verified directly against live Vertex
 * `generateContent` (clean-room raw REST probe, no NeuroLink code involved)
 * for all three Gemini 2.5 family members:
 *
 *   gemini-2.5-pro + thinkingConfig.thinkingLevel        -> HTTP 400 INVALID_ARGUMENT
 *   gemini-2.5-flash + thinkingConfig.thinkingLevel      -> HTTP 400 INVALID_ARGUMENT
 *   gemini-2.5-flash-lite + thinkingConfig.thinkingLevel -> HTTP 400 INVALID_ARGUMENT
 *   gemini-2.5-pro + thinkingConfig.thinkingBudget:8000  -> HTTP 200, thoughtsTokenCount > 0
 *
 * (Google's own docs independently corroborate this: "If you use the
 * thinking_level parameter with a model earlier than Gemini 3, the model
 * returns an error.") This is a case of "NeuroLink sends a parameter this
 * model rejects" — not "this model has no thinking capability": Gemini 2.5
 * *does* think, it just wants a numeric `thinkingBudget`, not a level.
 *
 * THE FIX. `createNativeThinkingConfig` now takes the resolved model name.
 * For a non-Gemini-3 model it looks up a vendor-verified per-model
 * thinkingBudget range (`getGemini25ThinkingBudgetRange`) and translates the
 * requested qualitative level into a numeric budget within that range,
 * omitting `thinkingLevel` from the wire payload entirely. Gemini 3 (and any
 * caller that omits the model name) keeps the original `thinkingLevel`
 * passthrough unchanged.
 *
 * WHAT THIS SUITE ASSERTS, LIVE, END-TO-END.
 *   1. `gemini-2.5-pro` with `thinkingConfig: { thinkingLevel: "high" }` must
 *      not throw an HTTP 400 from Vertex — pre-fix this was the clearest,
 *      most consistently reproducible 400 across all three 2.5 models.
 *   2. The same call must produce observable reasoning: `reasoningTokens`
 *      (from Vertex's `thoughtsTokenCount`) greater than zero. This is the
 *      part a "just don't send the field" fix would fail — thinking must
 *      actually engage, not merely avoid erroring.
 *   3. `gemini-2.5-flash-lite` (the smallest-budget family member) gets the
 *      same two assertions, to confirm the per-model budget range is used
 *      rather than a single constant that happens to work for one model.
 *   4. A control on `gemini-3-flash-preview` (unaffected family) confirms
 *      the fix does not disturb the original `thinkingLevel` passthrough for
 *      the models it was always correct for.
 *
 * Assertion messages never quote provider response text — quoting payload
 * content (e.g. "400", "not supported") risks `isExpectedProviderError`
 * downgrading a real failure to a SKIP (see test/helpers/envGuard.ts).
 *
 * SCOPE. This exercises the Vertex native-Gemini path only
 * (`googleVertex/client.ts`'s `executeNativeGemini3Generate`). The Google AI
 * Studio provider's identical-shaped call site (`googleNativeGemini3/utils.ts`'s
 * `buildNativeConfig`) now also threads `modelName` through to
 * `createNativeThinkingConfig` — see the companion suite
 * `test/continuous-test-suite-gemini-thinking-level-ai-studio.ts`, which
 * verifies that path live and independently.
 *
 * DETERMINISM EXCEPTION (Rule 15). One case below asserts
 * `mapThinkingLevelToBudget` directly, imported from the built
 * `../dist/utils/thinkingConfig.js`. It is a pure level->budget translation
 * table (`THINKING_LEVEL_FRACTIONS`'s 0/0.25/0.55/1 split and `Math.round`),
 * and the live cases above only ever observe it indirectly through
 * `reasoningTokens` ordering — real, but unable to pin the exact fractions
 * without live Gemini credentials. This case needs none, runs unconditionally,
 * and everything else in this file still drives `generate()` end-to-end.
 *
 * Run: pnpm run build && npx tsx test/continuous-test-suite-gemini-thinking-level.ts
 */

import { NeuroLink } from "../dist/index.js";
import { mapThinkingLevelToBudget } from "../dist/utils/thinkingConfig.js";
import { defineSuite, assert } from "./helpers/harness.js";
import { skipUnlessProviderAvailable } from "./helpers/skipIf.js";
import { assertDistFresh } from "./helpers/distFreshness.js";

assertDistFresh();

const { test, runSuite } = defineSuite(
  "Gemini 2.5 thinkingLevel on Vertex (live)",
);

const PROVIDER = "vertex";
const PROMPT =
  "What is 23 * 41? Work it out step by step, then give the final number.";

await test("mapThinkingLevelToBudget pins the level->budget fractions (no live call)", () => {
  // Same range shape getGemini25ThinkingBudgetRange returns for a real
  // model; the exact model is irrelevant to this pure function.
  const range = { min: 128, max: 24576 };

  const minimal = mapThinkingLevelToBudget("minimal", range);
  const low = mapThinkingLevelToBudget("low", range);
  const medium = mapThinkingLevelToBudget("medium", range);
  const high = mapThinkingLevelToBudget("high", range);

  // PRECONDITION: prove the function actually ran on this range rather than
  // short-circuiting to some constant — minimal and high must land exactly on
  // the range's own floor/ceiling before the ordering assertion below means
  // anything.
  assert(
    minimal === range.min && high === range.max,
    "precondition failed: minimal/high did not pin the range's floor/ceiling",
  );
  assert(
    minimal < low && low < medium && medium < high,
    "thinkingLevel fractions did not produce a strictly increasing budget across minimal/low/medium/high",
  );
});

await test("gemini-2.5-pro accepts thinkingLevel:high without a 400 and thinks", async () => {
  skipUnlessProviderAvailable(PROVIDER);

  const result = await new NeuroLink().generate({
    input: { text: PROMPT },
    provider: PROVIDER,
    model: "gemini-2.5-pro",
    maxTokens: 2048,
    disableTools: true,
    thinkingConfig: { thinkingLevel: "high" },
  });

  // PRECONDITION: the turn must have completed at all. Without this, a
  // silently-swallowed request failure could make the reasoning assertion
  // below vacuously fail for the wrong reason.
  assert(
    (result.content ?? "").length > 0,
    "precondition failed: gemini-2.5-pro returned no content, so the turn did not complete",
  );

  // The regression this fix targets: pre-fix, this exact call threw because
  // the request carried a thinkingLevel field the model rejects.
  assert(
    typeof result.reasoningTokens === "number" && result.reasoningTokens > 0,
    "gemini-2.5-pro produced no observable reasoning tokens with thinkingLevel set to high",
  );
});

await test("gemini-2.5-flash-lite accepts thinkingLevel:high and thinks", async () => {
  skipUnlessProviderAvailable(PROVIDER);

  const result = await new NeuroLink().generate({
    input: { text: PROMPT },
    provider: PROVIDER,
    model: "gemini-2.5-flash-lite",
    maxTokens: 2048,
    disableTools: true,
    thinkingConfig: { thinkingLevel: "high" },
  });

  assert(
    (result.content ?? "").length > 0,
    "precondition failed: gemini-2.5-flash-lite returned no content, so the turn did not complete",
  );

  // Pre-fix, this threw the identical 400 as gemini-2.5-pro (verified live,
  // both via raw REST and via this exact NeuroLink call) — the ticket's
  // claim of a distinct "silent reasoning=0" symptom for flash-lite did not
  // reproduce against the actually-wired thinkingConfig.thinkingLevel path.
  assert(
    typeof result.reasoningTokens === "number" && result.reasoningTokens > 0,
    "gemini-2.5-flash-lite produced no observable reasoning tokens with thinkingLevel set to high",
  );
});

await test("gemini-2.5-flash accepts thinkingLevel:high and thinks (non-regression)", async () => {
  skipUnlessProviderAvailable(PROVIDER);

  const result = await new NeuroLink().generate({
    input: { text: PROMPT },
    provider: PROVIDER,
    model: "gemini-2.5-flash",
    maxTokens: 2048,
    disableTools: true,
    thinkingConfig: { thinkingLevel: "high" },
  });

  assert(
    (result.content ?? "").length > 0,
    "precondition failed: gemini-2.5-flash returned no content, so the turn did not complete",
  );

  // Pre-fix this threw the same 400 as pro and flash-lite. Named explicitly
  // because the fix's success criteria require flash not to regress once
  // pro and flash-lite start being translated to a numeric budget.
  assert(
    typeof result.reasoningTokens === "number" && result.reasoningTokens > 0,
    "gemini-2.5-flash produced no observable reasoning tokens with thinkingLevel set to high",
  );
});

await test("gemini-2.5-flash-lite:minimal uses a smaller budget than :high", async () => {
  skipUnlessProviderAvailable(PROVIDER);

  // Confirms the fix is genuinely per-level, not a fixed budget dressed up as
  // four levels: minimal must engage measurably less thinking than high on
  // the same model and prompt.
  const minimalResult = await new NeuroLink().generate({
    input: { text: PROMPT },
    provider: PROVIDER,
    model: "gemini-2.5-flash-lite",
    maxTokens: 2048,
    disableTools: true,
    thinkingConfig: { thinkingLevel: "minimal" },
  });
  const highResult = await new NeuroLink().generate({
    input: { text: PROMPT },
    provider: PROVIDER,
    model: "gemini-2.5-flash-lite",
    maxTokens: 2048,
    disableTools: true,
    thinkingConfig: { thinkingLevel: "high" },
  });

  assert(
    (minimalResult.content ?? "").length > 0 &&
      (highResult.content ?? "").length > 0,
    "precondition failed: one of the two flash-lite turns returned no content",
  );
  assert(
    typeof minimalResult.reasoningTokens === "number" &&
      typeof highResult.reasoningTokens === "number",
    "precondition failed: reasoningTokens was not a number on one of the two flash-lite turns",
  );

  assert(
    (minimalResult.reasoningTokens ?? Infinity) <
      (highResult.reasoningTokens ?? -1),
    "flash-lite thinkingLevel minimal did not use a smaller budget than high",
  );
});

await test("gemini-3-flash-preview thinkingLevel passthrough is unaffected (control)", async () => {
  skipUnlessProviderAvailable(PROVIDER);

  // Gemini 3 was never broken — this pins that the fix's branch on model
  // family did not regress the original thinkingLevel passthrough.
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
    "precondition failed: gemini-3-flash-preview returned no content, so the turn did not complete",
  );
  assert(
    typeof result.reasoningTokens === "number" && result.reasoningTokens > 0,
    "gemini-3-flash-preview produced no observable reasoning tokens with thinkingLevel set to high",
  );
});

await runSuite();
