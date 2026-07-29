#!/usr/bin/env tsx
import "dotenv/config";

/**
 * Continuous Test Suite — Token Usage Accounting
 *
 * Pure no-API regression tests for the token-accounting convention:
 *   input = UNCACHED remainder · cacheRead/cacheCreation additive ·
 *   output INCLUDES reasoning (usage.reasoning is the subset) ·
 *   total = input + cacheRead + cacheCreation + output
 *
 * 4 sections covering:
 *  1. extractTokenUsage — ai@6-shape rebase (cache-inclusive flat input),
 *     overlapping snake_case, native camelCase (no rebase), zero-total guard
 *  2. calculateCost — cache tiers, cached-cheaper invariant, Bedrock
 *     model-id prefix/ARN normalization
 *  3. mergeUsage — nested details survival, per-step total derivation
 *  4. parseUsageFromResponseBody — object and TGI array response shapes
 *
 * No live AI; pure dist artifact tests.
 *
 * Run: pnpm run build && npx tsx test/continuous-test-suite-token-usage.ts
 *      pnpm run test:token-usage
 */

import assert from "node:assert/strict";
import { defineSuite } from "./helpers/harness.js";
import { extractTokenUsage } from "../dist/lib/utils/tokenUtils.js";
import { calculateCost } from "../dist/lib/utils/pricing.js";
import { mergeUsage } from "../dist/lib/providers/openaiChatCompletionsClient.js";
import { parseUsageFromResponseBody } from "../dist/lib/providers/sagemaker/streaming.js";

const { test, runSuite } = defineSuite("Token Usage Accounting");

// ============================================================
// 1. extractTokenUsage — shape normalization + rebase
// ============================================================

await test("ai@6 shape: cache-inclusive flat input is rebased to noCacheTokens", async () => {
  const usage = extractTokenUsage({
    inputTokens: 1100,
    outputTokens: 50,
    totalTokens: 1150,
    cachedInputTokens: 1000,
    inputTokenDetails: {
      noCacheTokens: 80,
      cacheReadTokens: 1000,
      cacheWriteTokens: 20,
    },
  });
  assert.equal(usage.input, 80, "input must be the uncached remainder");
  assert.equal(usage.cacheReadTokens, 1000);
  assert.equal(usage.cacheCreationTokens, 20);
  assert.equal(usage.total, 1150, "provider-reported total is kept");
});

await test("ai@6 shape without noCacheTokens: falls back to subtraction", async () => {
  const usage = extractTokenUsage({
    inputTokens: 1100,
    outputTokens: 50,
    totalTokens: 1150,
    cachedInputTokens: 1000,
    inputTokenDetails: { cacheReadTokens: 1000, cacheWriteTokens: 20 },
  });
  assert.equal(usage.input, 80, "input = flat input − cacheRead − cacheWrite");
  assert.equal(usage.cacheReadTokens, 1000);
});

await test("ai@6 cache-WRITE-only step (first request, no reads) is still rebased", async () => {
  const usage = extractTokenUsage({
    inputTokens: 100,
    outputTokens: 5,
    totalTokens: 105,
    inputTokenDetails: { noCacheTokens: 80, cacheWriteTokens: 20 },
  });
  assert.equal(usage.input, 80);
  assert.equal(usage.cacheCreationTokens, 20);
});

await test("overlapping snake_case shape: cached_tokens subtracted from prompt", async () => {
  const usage = extractTokenUsage({
    promptTokens: 1000,
    completionTokens: 50,
    prompt_tokens_details: { cached_tokens: 900 },
  });
  assert.equal(usage.input, 100);
  assert.equal(usage.cacheReadTokens, 900);
  assert.equal(usage.total, 1050, "total conserves every billed component");
});

await test("native camelCase shape (input already uncached) is NOT rebased", async () => {
  const usage = extractTokenUsage({
    input: 100,
    output: 50,
    total: 1150,
    cacheReadTokens: 1000,
  });
  assert.equal(usage.input, 100, "non-overlapping input must stay untouched");
  assert.equal(usage.total, 1150);
});

await test("total: 0 from a gateway never wins over real components", async () => {
  const usage = extractTokenUsage({
    promptTokens: 10,
    completionTokens: 5,
    totalTokens: 0,
  });
  assert.equal(usage.total, 15);
});

await test("extraction is idempotent (TokenUsage in → same TokenUsage out)", async () => {
  const first = extractTokenUsage({
    inputTokens: 1100,
    outputTokens: 50,
    totalTokens: 1150,
    cachedInputTokens: 1000,
    inputTokenDetails: {
      noCacheTokens: 80,
      cacheReadTokens: 1000,
      cacheWriteTokens: 20,
    },
  });
  const second = extractTokenUsage(first);
  assert.deepEqual(
    { input: second.input, total: second.total },
    { input: first.input, total: first.total },
  );
});

// ============================================================
// 2. calculateCost — tiers + Bedrock model-id normalization
// ============================================================

await test("cached turn costs LESS than the same tokens uncached", async () => {
  const cached = calculateCost("anthropic", "claude-sonnet-4-6", {
    input: 100,
    output: 50,
    total: 10150,
    cacheReadTokens: 10000,
  });
  const uncached = calculateCost("anthropic", "claude-sonnet-4-6", {
    input: 10100,
    output: 50,
    total: 10150,
  });
  assert.ok(cached > 0, "cached cost must be non-zero");
  assert.ok(cached < uncached, "cache reads must bill at the cheaper tier");
});

await test("Bedrock model ids price non-zero across all prefix forms", async () => {
  const usage = { input: 1_000_000, output: 0, total: 1_000_000 };
  for (const model of [
    "anthropic.claude-sonnet-4-6",
    "us.anthropic.claude-sonnet-4-5-20250929-v1:0",
    "global.anthropic.claude-sonnet-4-5-20250929-v1:0",
    "arn:aws:bedrock:us-east-2:123456789:inference-profile/us.anthropic.claude-sonnet-4-5-20250929-v1:0",
  ]) {
    const cost = calculateCost("bedrock", model, usage);
    assert.ok(cost > 0, `expected non-zero cost for ${model}`);
  }
});

await test("Bedrock normalization does not affect other providers", async () => {
  const usage = { input: 1_000_000, output: 0, total: 1_000_000 };
  assert.ok(calculateCost("anthropic", "claude-sonnet-4-6", usage) > 0);
  assert.ok(calculateCost("openai", "gpt-4o", usage) > 0);
});

// ============================================================
// 3. mergeUsage — multi-step aggregation
// ============================================================

await test("mergeUsage sums nested cached/reasoning details across steps", async () => {
  const merged = mergeUsage(
    {
      prompt_tokens: 100,
      completion_tokens: 10,
      total_tokens: 110,
      prompt_tokens_details: { cached_tokens: 60 },
      completion_tokens_details: { reasoning_tokens: 4 },
    },
    {
      prompt_tokens: 200,
      completion_tokens: 20,
      total_tokens: 220,
      prompt_tokens_details: { cached_tokens: 150 },
    },
  );
  assert.equal(merged?.prompt_tokens, 300);
  assert.equal(merged?.prompt_tokens_details?.cached_tokens, 210);
  assert.equal(merged?.completion_tokens_details?.reasoning_tokens, 4);
  assert.equal(merged?.total_tokens, 330);
});

await test("a step that omits total_tokens contributes prompt+completion, not 0", async () => {
  const merged = mergeUsage(
    { prompt_tokens: 100, completion_tokens: 10, total_tokens: 110 },
    { prompt_tokens: 200, completion_tokens: 20 },
  );
  assert.equal(
    merged?.total_tokens,
    330,
    "missing per-step total must be derived, not summed as 0",
  );
});

await test("single-step passthrough keeps the original object intact", async () => {
  const only = {
    prompt_tokens: 100,
    completion_tokens: 10,
    total_tokens: 110,
    prompt_tokens_details: { cached_tokens: 60 },
  };
  const merged = mergeUsage(undefined, only);
  assert.equal(merged?.prompt_tokens_details?.cached_tokens, 60);
});

// ============================================================
// 4. parseUsageFromResponseBody — SageMaker response shapes
// ============================================================

await test("object body with OpenAI-style usage is parsed", async () => {
  const usage = parseUsageFromResponseBody({
    generated_text: "hi",
    usage: { prompt_tokens: 12, completion_tokens: 3 },
  });
  assert.deepEqual(usage, {
    promptTokens: 12,
    completionTokens: 3,
    total: 15,
  });
});

await test("TGI array body ([{ details: { tokens } }]) is parsed", async () => {
  const usage = parseUsageFromResponseBody([
    {
      generated_text: "hi",
      details: { tokens: { input: 12, generated: 3 } },
    },
  ]);
  assert.deepEqual(usage, {
    promptTokens: 12,
    completionTokens: 3,
    total: 15,
  });
});

await test("body without real counts returns undefined (caller estimates)", async () => {
  assert.equal(parseUsageFromResponseBody({ generated_text: "hi" }), undefined);
  assert.equal(parseUsageFromResponseBody([]), undefined);
});

await runSuite();
