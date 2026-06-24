#!/usr/bin/env tsx
import "dotenv/config";

/**
 * Continuous Test Suite — Anthropic Prompt-Cache Breakpoints
 *
 * Pure unit tests for `applyVertexAnthropicCacheBreakpoints` — the helper that
 * places `cache_control` breakpoints on the native Vertex+Claude request so the
 * conversation prefix is cached across turns instead of re-billed at full input
 * price every turn. No live AI; no API key required.
 *
 * Run: npx tsx test/continuous-test-suite-cache-breakpoints.ts
 *      pnpm run test:cache
 */

import { applyVertexAnthropicCacheBreakpoints } from "../src/lib/utils/anthropicCacheBreakpoints.js";
import {
  extractTokenUsage,
  extractCachedInputTokensOverlapping,
} from "../src/lib/utils/tokenUtils.js";
import { calculateCost } from "../src/lib/utils/pricing.js";
import { defineSuite, logSection } from "./helpers/harness.js";

const { recordTest, runSuite } = defineSuite("Anthropic Cache Breakpoints");

const hasCC = (b: unknown): boolean =>
  !!(b as { cache_control?: unknown } | undefined)?.cache_control;

const lastBlockHasCC = (m: { content: unknown }): boolean => {
  const c = m.content as Array<unknown>;
  return Array.isArray(c) && hasCC(c[c.length - 1]);
};

const countHistoryBreakpoints = (
  messages: Array<{ content: unknown }>,
): number =>
  messages.filter((m) =>
    Array.isArray(m.content)
      ? hasCC((m.content as Array<unknown>).at(-1))
      : false,
  ).length;

function testSystemAndRollingHistory(): void {
  logSection("System present → system block + rolling history (≤4 total)");
  try {
    const out = applyVertexAnthropicCacheBreakpoints({
      system: "You are a helpful agent.",
      tools: [
        { name: "a", description: "", input_schema: { type: "object" } },
        { name: "b", description: "", input_schema: { type: "object" } },
      ],
      messages: [
        { role: "user", content: "hello" },
        {
          role: "assistant",
          content: [{ type: "tool_use", id: "t1", name: "a", input: {} }],
        },
        {
          role: "user",
          content: [
            { type: "tool_result", tool_use_id: "t1", content: "big log dump" },
          ],
        },
      ],
    });

    recordTest("system converted to block array", Array.isArray(out.system));
    recordTest(
      "system block carries cache_control",
      hasCC((out.system as Array<unknown>)[0]),
    );
    recordTest(
      "last tool NOT marked when system present (avoids redundant breakpoint)",
      out.tools !== undefined && !hasCC(out.tools[out.tools.length - 1]),
    );
    recordTest("newest message marked", lastBlockHasCC(out.messages[2]));
    recordTest("2nd-newest message marked", lastBlockHasCC(out.messages[1]));
    recordTest(
      "3rd-newest message marked (string→block)",
      lastBlockHasCC(out.messages[0]),
    );
    recordTest(
      "exactly 4 breakpoints (1 system + 3 history) within Anthropic's cap",
      1 + countHistoryBreakpoints(out.messages) === 4,
    );
  } catch (error) {
    recordTest(
      "system + rolling history",
      false,
      false,
      error instanceof Error ? error.message : String(error),
    );
  }
}

function testNoSystemMarksLastTool(): void {
  logSection("No system → last tool carries the stable breakpoint");
  try {
    const out = applyVertexAnthropicCacheBreakpoints({
      tools: [
        { name: "a", description: "", input_schema: { type: "object" } },
        { name: "b", description: "", input_schema: { type: "object" } },
      ],
      messages: [{ role: "user", content: "hi" }],
    });
    recordTest("system stays undefined", out.system === undefined);
    recordTest(
      "only the LAST tool is marked",
      out.tools !== undefined && hasCC(out.tools[1]) && !hasCC(out.tools[0]),
    );
    recordTest("the one message is marked", lastBlockHasCC(out.messages[0]));
  } catch (error) {
    recordTest(
      "no system → last tool",
      false,
      false,
      error instanceof Error ? error.message : String(error),
    );
  }
}

function testPurity(): void {
  logSection("Purity — inputs are never mutated");
  try {
    const inputMessages = [
      {
        role: "user" as const,
        content: [{ type: "text" as const, text: "x" }],
      },
    ];
    const inputTools = [
      { name: "a", description: "", input_schema: { type: "object" as const } },
    ];
    applyVertexAnthropicCacheBreakpoints({
      system: "s",
      tools: inputTools,
      messages: inputMessages,
    });
    recordTest(
      "original message content NOT mutated",
      !hasCC((inputMessages[0].content as Array<unknown>)[0]),
    );
    recordTest("original tool NOT mutated", !hasCC(inputTools[0]));
  } catch (error) {
    recordTest(
      "purity",
      false,
      false,
      error instanceof Error ? error.message : String(error),
    );
  }
}

function testHistoryBreakpointCap(): void {
  logSection("maxHistoryBreakpoints cap respected");
  try {
    const out = applyVertexAnthropicCacheBreakpoints({
      system: "s",
      messages: [
        { role: "user", content: "1" },
        { role: "assistant", content: "2" },
        { role: "user", content: "3" },
      ],
      maxHistoryBreakpoints: 1,
    });
    recordTest(
      "only 1 history breakpoint when capped",
      countHistoryBreakpoints(out.messages) === 1,
    );
    recordTest(
      "the newest message is the one marked",
      lastBlockHasCC(out.messages[2]),
    );
  } catch (error) {
    recordTest(
      "history cap",
      false,
      false,
      error instanceof Error ? error.message : String(error),
    );
  }
}

function testEdgeCases(): void {
  logSection("Edge cases — empty inputs, overflow, output identity");
  try {
    // Empty messages array — no throw, no history breakpoints.
    const empty = applyVertexAnthropicCacheBreakpoints({
      system: "s",
      messages: [],
    });
    recordTest(
      "empty messages array → no history breakpoints, no throw",
      Array.isArray(empty.messages) && empty.messages.length === 0,
    );

    // A message with an empty content array is skipped; the breakpoint falls
    // through to an earlier markable message.
    const withEmpty = applyVertexAnthropicCacheBreakpoints({
      messages: [
        { role: "user", content: "real" },
        { role: "assistant", content: [] },
      ],
      maxHistoryBreakpoints: 1,
    });
    recordTest(
      "empty-content message skipped → breakpoint falls to the prior message",
      !lastBlockHasCC(withEmpty.messages[1]) &&
        lastBlockHasCC(withEmpty.messages[0]),
    );

    // >4 messages with a system prompt → history is capped at 3 (system takes
    // the 4th breakpoint); only the newest 3 messages are marked.
    const many = applyVertexAnthropicCacheBreakpoints({
      system: "s",
      messages: [
        { role: "user", content: "1" },
        { role: "assistant", content: "2" },
        { role: "user", content: "3" },
        { role: "assistant", content: "4" },
        { role: "user", content: "5" },
      ],
    });
    recordTest(
      ">4 messages + system → exactly 3 history breakpoints (≤4 total)",
      countHistoryBreakpoints(many.messages) === 3,
    );
    recordTest(
      ">4 messages → only the newest 3 are marked",
      lastBlockHasCC(many.messages[4]) &&
        lastBlockHasCC(many.messages[3]) &&
        lastBlockHasCC(many.messages[2]) &&
        !lastBlockHasCC(many.messages[1]) &&
        !lastBlockHasCC(many.messages[0]),
    );

    // Output is a fresh object graph, never aliased to the input.
    const inMsgs = [{ role: "user" as const, content: "x" }];
    const out = applyVertexAnthropicCacheBreakpoints({ messages: inMsgs });
    recordTest("output.messages is a new array", out.messages !== inMsgs);
    recordTest(
      "output.messages[0] is a new object",
      out.messages[0] !== inMsgs[0],
    );
  } catch (error) {
    recordTest(
      "edge cases",
      false,
      false,
      error instanceof Error ? error.message : String(error),
    );
  }
}

function testOverlappingCacheExtraction(): void {
  logSection(
    "Overlapping cache extraction (OpenAI/DeepSeek prompt_tokens_details)",
  );
  try {
    // Helper reads ONLY the nested overlapping path.
    recordTest(
      "extractCachedInputTokensOverlapping reads prompt_tokens_details.cached_tokens",
      extractCachedInputTokensOverlapping({
        promptTokens: 1000,
        prompt_tokens_details: { cached_tokens: 300 },
      }) === 300,
    );
    recordTest(
      "extractCachedInputTokensOverlapping returns undefined when absent",
      extractCachedInputTokensOverlapping({ promptTokens: 1000 }) === undefined,
    );
    // An explicit cached_tokens: 0 must behave exactly like absent — no
    // cacheReadTokens surfaced and input left untouched (the > 0 guard).
    recordTest(
      "cached_tokens: 0 treated same as absent (no cacheReadTokens, input intact)",
      extractCachedInputTokensOverlapping({
        promptTokens: 1000,
        prompt_tokens_details: { cached_tokens: 0 },
      }) === undefined &&
        (() => {
          const u = extractTokenUsage({
            promptTokens: 1000,
            completionTokens: 200,
            prompt_tokens_details: { cached_tokens: 0 },
          });
          return u.cacheReadTokens === undefined && u.input === 1000;
        })(),
    );

    // extractTokenUsage subtracts cached from input (OVERLAPPING convention)
    // so the cached portion is not double-counted.
    const usage = extractTokenUsage({
      promptTokens: 1000,
      completionTokens: 200,
      prompt_tokens_details: { cached_tokens: 300 },
    });
    recordTest(
      "input reduced by cached_tokens (1000 - 300 = 700)",
      usage.input === 700,
    );
    recordTest(
      "cacheReadTokens populated (300)",
      usage.cacheReadTokens === 300,
    );
    recordTest("output unchanged (200)", usage.output === 200);
    recordTest(
      "total conserved (input+cacheRead+output = original prompt+completion)",
      usage.input + (usage.cacheReadTokens ?? 0) + usage.output === 1200,
    );

    // Malformed: cached > prompt → no subtraction (guard against negative input).
    const malformed = extractTokenUsage({
      promptTokens: 100,
      completionTokens: 50,
      prompt_tokens_details: { cached_tokens: 500 },
    });
    recordTest(
      "cached > input → input left untouched (no negative, no inflation)",
      malformed.input === 100 && malformed.cacheReadTokens === undefined,
    );

    // Non-overlapping (Anthropic-style) field is NOT subtracted from input.
    const nonOverlap = extractTokenUsage({
      input: 1000,
      output: 200,
      cacheReadInputTokens: 400,
    });
    recordTest(
      "non-overlapping cacheReadInputTokens does NOT reduce input",
      nonOverlap.input === 1000 && nonOverlap.cacheReadTokens === 400,
    );

    // Cost: cached portion billed at cheaper cacheRead rate (DeepSeek).
    const fullCost = calculateCost("deepseek", "deepseek-chat", {
      input: 1000,
      output: 0,
      total: 1000,
    });
    const cachedCost = calculateCost("deepseek", "deepseek-chat", {
      input: 700,
      output: 0,
      total: 1000,
      cacheReadTokens: 300,
    });
    recordTest(
      "cached split is strictly cheaper than billing all input at full rate",
      cachedCost < fullCost && cachedCost > 0,
    );

    // OpenAI + Gemini now expose cacheRead rates.
    const openaiCached = calculateCost("openai", "gpt-4o", {
      input: 700,
      output: 0,
      total: 1000,
      cacheReadTokens: 300,
    });
    recordTest("openai gpt-4o cacheRead rate applied", openaiCached > 0);
    const geminiCached = calculateCost("google", "gemini-2.5-flash", {
      input: 700,
      output: 0,
      total: 1000,
      cacheReadTokens: 300,
    });
    recordTest("google gemini cacheRead rate applied", geminiCached > 0);
    // Vertex Gemini resolves google cacheRead via the existing fallback.
    const vertexGeminiCached = calculateCost("vertex", "gemini-2.5-pro", {
      input: 700,
      output: 0,
      total: 1000,
      cacheReadTokens: 300,
    });
    recordTest(
      "vertex gemini cacheRead via google fallback",
      vertexGeminiCached > 0,
    );

    // Option-C safety net: a provider with cacheReadTokens populated but NO
    // cacheRead rate must bill the cached portion at the input rate (never $0),
    // so the split cost equals billing the whole prompt at the input rate —
    // identical to pre-split billing, no silent undercharge.
    const noRateSplit = calculateCost("groq", "llama-3.3-70b-versatile", {
      input: 700,
      output: 0,
      total: 1000,
      cacheReadTokens: 300,
    });
    const noRateFull = calculateCost("groq", "llama-3.3-70b-versatile", {
      input: 1000,
      output: 0,
      total: 1000,
    });
    recordTest(
      "no-cacheRead-rate provider bills cached tokens at input rate (no undercharge)",
      noRateSplit === noRateFull && noRateSplit > 0,
    );
  } catch (error) {
    recordTest(
      "overlapping cache extraction",
      false,
      false,
      error instanceof Error ? error.message : String(error),
    );
  }
}

await runSuite(async () => {
  testSystemAndRollingHistory();
  testNoSystemMarksLastTool();
  testPurity();
  testHistoryBreakpointCap();
  testEdgeCases();
  testOverlappingCacheExtraction();
});
