#!/usr/bin/env tsx
/**
 * Continuous Test Suite: Vertex + Claude extended thinking — END-TO-END (live).
 *
 * Regression coverage for the defect where extended thinking silently did
 * nothing for Claude models reached through Google Vertex AI: the request
 * param was (separately) wired up, but the response's thinking content and
 * its token count were both dropped on the floor before ever reaching a
 * caller, on both `generate()` and `stream()`.
 *
 * This suite asserts the capability is OBSERVABLE, not merely that the
 * model answers correctly:
 *   - `generate()`: reasoning text surfaced (`result.reasoning`), and/or a
 *     reasoning token count surfaced (`result.reasoningTokens` /
 *     `result.usage.reasoning`).
 *   - `stream()`: a `{ content: "", reasoning }` chunk arrives on the wire,
 *     and/or the final `result.usage.reasoning` is a positive count.
 *
 * A reasoning-heavy word problem with a short expected answer is used
 * deliberately: a small ceiling on maxTokens yields empty content for a
 * thinking model (it spends the budget thinking, not answering), which has
 * produced false failures elsewhere in this codebase's test history — so
 * this suite uses a generous maxTokens (8000) with budgetTokens (4000),
 * per the same guidance.
 *
 * Cells that fail for provider/infra reasons (missing credentials, region,
 * quota, network) are SKIPPED, not failed — only a genuine capability
 * regression fails. Assertion messages describe which channel was empty;
 * they never quote model output, so a provider-shaped payload can't get
 * misclassified as a skip by `isExpectedProviderError()`.
 *
 * Also covers the regression the thinking fix itself introduced: Claude's
 * native `tool_choice` combines with `thinking` for exactly one internal
 * caller — the `schema` (structured-output) path, which unconditionally
 * forces `tool_choice:{type:"any"}` so the model calls the synthetic
 * `final_result` tool. Anthropic hard-rejects that combination with a live
 * HTTP 400 ("Thinking may not be enabled when tool_choice forces tool
 * use."), so `schema` + `thinkingConfig.enabled` must not throw — thinking
 * is silently omitted for that one combination instead (matching the
 * pre-thinking-fix behaviour, not a crash). A separate case pins that plain
 * `tools` (no `schema`, so `tool_choice` stays default/auto) combined with
 * thinking keeps working exactly as before.
 *
 * Run:  npx tsx test/continuous-test-suite-vertex-claude-thinking.ts
 */
import "dotenv/config";
import { z } from "zod";
import { NeuroLink, jsonSchema } from "../dist/index.js";
import {
  defineSuite,
  assert,
  Skip,
  isExpectedProviderError,
} from "./helpers/harness.js";
import { assertDistFresh } from "./helpers/distFreshness.js";
import type { GenerateResult, StreamResult } from "../dist/index.js";

// Fail loudly rather than silently testing a stale build.
assertDistFresh();

const { test, runSuite } = defineSuite(
  "Vertex Claude Extended Thinking (live)",
);
const nl = new NeuroLink();

const MODEL = "claude-sonnet-4-6";
const PROVIDER = "vertex";

// A small system-of-equations word problem: it forces genuine multi-step
// arithmetic reasoning, but the expected answer is short, so — with
// thinking enabled — most of the spent output budget is thinking rather
// than prose. This is the shape that silently regresses when reasoning
// tokens are burned but never surfaced.
const REASONING_PROMPT =
  "A parking lot has only cars and motorcycles. Together there are 27 " +
  "vehicles and 74 wheels. Cars have 4 wheels, motorcycles have 2. How " +
  "many cars and how many motorcycles are there? Reply with only the two " +
  "numbers separated by a comma, nothing else.";

await test("vertex:claude-sonnet-4-6 generate() — thinking is observable (text and/or token count)", async () => {
  let res: GenerateResult;
  try {
    res = await nl.generate({
      input: { text: REASONING_PROMPT },
      provider: PROVIDER,
      model: MODEL,
      maxTokens: 8000,
      thinkingConfig: { enabled: true, budgetTokens: 4000 },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (isExpectedProviderError(msg)) {
      throw new Skip(`vertex: ${msg.slice(0, 120)}`);
    }
    throw err;
  }

  const reasoningTextLen = res.reasoning?.length ?? 0;
  const reasoningTokenCount = res.reasoningTokens ?? 0;
  const usageReasoning = res.usage?.reasoning ?? 0;
  const observed =
    reasoningTextLen > 0 || reasoningTokenCount > 0 || usageReasoning > 0;

  assert(
    (res.content?.length ?? 0) > 0,
    "generate() returned no content at all — sanity check failed before the reasoning assertion could be meaningful",
  );
  assert(
    observed,
    "thinking capability not observable on generate(): reasoning text, reasoningTokens and usage.reasoning were all empty/zero despite thinkingConfig.enabled=true with a generous budget",
  );
  console.log(
    `      · generate(): reasoningTextLen=${reasoningTextLen}, reasoningTokens=${reasoningTokenCount}, usage.reasoning=${usageReasoning}`,
  );
});

await test("vertex:claude-sonnet-4-6 stream() — thinking is observable (chunk and/or usage)", async () => {
  let result: StreamResult;
  try {
    result = await nl.stream({
      input: { text: REASONING_PROMPT },
      provider: PROVIDER,
      model: MODEL,
      maxTokens: 8000,
      thinkingConfig: { enabled: true, budgetTokens: 4000 },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (isExpectedProviderError(msg)) {
      throw new Skip(`vertex: ${msg.slice(0, 120)}`);
    }
    throw err;
  }

  let sawReasoningChunk = false;
  let reasoningChunkChars = 0;
  let contentChars = 0;
  try {
    for await (const chunk of result.stream) {
      if (
        typeof chunk === "object" &&
        chunk !== null &&
        "reasoning" in chunk &&
        typeof (chunk as { reasoning?: unknown }).reasoning === "string" &&
        (chunk as { reasoning: string }).reasoning.length > 0
      ) {
        sawReasoningChunk = true;
        reasoningChunkChars += (chunk as { reasoning: string }).reasoning
          .length;
      }
      if (
        typeof chunk === "object" &&
        chunk !== null &&
        "content" in chunk &&
        typeof (chunk as { content?: unknown }).content === "string"
      ) {
        contentChars += (chunk as { content: string }).content.length;
      }
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (isExpectedProviderError(msg)) {
      throw new Skip(`vertex: ${msg.slice(0, 120)}`);
    }
    throw err;
  }

  const usageReasoning = result.usage?.reasoning ?? 0;
  const observed = sawReasoningChunk || usageReasoning > 0;

  assert(
    contentChars > 0,
    "stream() produced no content chunks at all — sanity check failed before the reasoning assertion could be meaningful",
  );
  assert(
    observed,
    "thinking capability not observable on stream(): no reasoning-bearing chunk arrived and usage.reasoning was empty/zero despite thinkingConfig.enabled=true with a generous budget",
  );
  console.log(
    `      · stream(): sawReasoningChunk=${sawReasoningChunk}, reasoningChunkChars=${reasoningChunkChars}, usage.reasoning=${usageReasoning}`,
  );
});

// ── Regression: schema + thinkingConfig.enabled must not hard-400 ──────────
//
// `useFinalResultTool` (triggered by `schema`) unconditionally forces
// `tool_choice:{type:"any"}` onto the request so the model calls the
// synthetic `final_result` tool. Once the thinking fix above started
// building a `thinking` request param, that param started riding along on
// schema calls too — and Anthropic hard-rejects `thinking` combined with a
// `tool_choice` that forces tool use: a live HTTP 400, "Thinking may not be
// enabled when tool_choice forces tool use." Before the thinking fix this
// combination silently ignored `thinkingConfig`; it must keep doing that,
// not throw.

const VehicleCounts = z.object({
  cars: z.number(),
  motorcycles: z.number(),
});

function isSchemaThinkingConflict(message: string): boolean {
  const lower = message.toLowerCase();
  return lower.includes("thinking") && lower.includes("tool_choice");
}

await test("vertex:claude-sonnet-4-6 generate() — schema + thinkingConfig.enabled no longer 400s", async () => {
  let res: GenerateResult;
  try {
    res = await nl.generate({
      input: { text: REASONING_PROMPT },
      provider: PROVIDER,
      model: MODEL,
      maxTokens: 8000,
      thinkingConfig: { enabled: true, budgetTokens: 4000 },
      schema: VehicleCounts,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (isExpectedProviderError(msg)) {
      throw new Skip(`vertex: ${msg.slice(0, 120)}`);
    }
    // Never interpolate the caught message here — a provider-shaped payload
    // (e.g. a bare "400") would downgrade a real failure to a skip.
    if (isSchemaThinkingConflict(msg)) {
      throw new Error(
        "generate() with schema + thinkingConfig.enabled hard-400ed on the thinking/tool_choice conflict instead of silently omitting thinking for schema mode",
        { cause: err },
      );
    }
    throw new Error(
      "generate() with schema + thinkingConfig.enabled threw an unexpected error instead of returning a structured result",
      { cause: err },
    );
  }

  assert(
    (res.content?.length ?? 0) > 0,
    "generate() with schema + thinking returned no content",
  );
  assert(
    res.structuredData !== undefined && res.structuredData !== null,
    "generate() with schema + thinking did not return parsed structuredData",
  );
  const parsed = VehicleCounts.safeParse(res.structuredData);
  assert(
    parsed.success,
    "generate() with schema + thinking returned structuredData that does not match the requested schema shape",
  );
  console.log(
    `      · generate() schema+thinking: structuredData=${parsed.success ? JSON.stringify(parsed.data) : "<invalid>"}, reasoningTextLen=${res.reasoning?.length ?? 0}`,
  );
});

// ── Non-regression: plain tools (no schema) + thinking still works ─────────
//
// Only `schema` mode forces `tool_choice`; ordinary `tools` (no schema)
// leave `tool_choice` at its default, so this combination was never subject
// to the conflict above and must keep working unchanged.

await test("vertex:claude-sonnet-4-6 generate() — tools + thinkingConfig.enabled (no schema) still works", async () => {
  const secretTools = {
    get_magic_number: {
      description:
        "Returns a magic number the assistant cannot know without calling this tool.",
      inputSchema: jsonSchema({
        type: "object",
        properties: {},
        additionalProperties: false,
      }),
      execute: async () => ({ magicNumber: 57 }),
    },
  };

  let res: GenerateResult;
  try {
    res = await nl.generate({
      input: {
        text: "Call the get_magic_number tool, then reply with only the number it returns and nothing else.",
      },
      provider: PROVIDER,
      model: MODEL,
      maxTokens: 4000,
      thinkingConfig: { enabled: true, budgetTokens: 2000 },
      tools: secretTools,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (isExpectedProviderError(msg)) {
      throw new Skip(`vertex: ${msg.slice(0, 120)}`);
    }
    throw new Error(
      "generate() with tools + thinkingConfig.enabled (no schema) threw instead of completing the tool-calling turn",
      { cause: err },
    );
  }

  const usedTool = (res.toolsUsed ?? []).includes("get_magic_number");
  assert(
    usedTool,
    "generate() with tools + thinking did not call the offered tool",
  );
  assert(
    (res.content ?? "").includes("57"),
    "generate() with tools + thinking did not surface the tool's result in the final answer",
  );
  console.log(
    `      · generate() tools+thinking: toolsUsed=${(res.toolsUsed ?? []).join(",")}, reasoningTextLen=${res.reasoning?.length ?? 0}, usage.reasoning=${res.usage?.reasoning ?? 0}`,
  );
});

await runSuite();
