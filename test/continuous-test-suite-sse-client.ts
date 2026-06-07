#!/usr/bin/env tsx
import "dotenv/config";

/**
 * Native SSE Client Verification Suite
 *
 * Locks in the reasoning_content surfacing added to the native
 * OpenAI-compatible client (base-client follow-up from the provider
 * migration series — deepseek #1057 / nvidiaNim #1058 / openAI #1059).
 *
 * Coverage:
 *   - parseSSEStream accumulates `delta.reasoning_content` into
 *     `result.reasoning` and fires `onReasoningDelta` per delta, without
 *     polluting `result.text` / `onTextDelta`.
 *   - The gateway-style `delta.reasoning` fallback field is honored.
 *   - Interleaved reasoning→content (the deepseek-reasoner/R1 pattern)
 *     keeps both accumulators correct and ordered.
 *   - Non-reasoner streams leave `result.reasoning` empty and never fire
 *     the callback; the callback parameter is optional.
 *   - usage capture (incl. completion_tokens_details.reasoning_tokens)
 *     and tool-call assembly are unaffected alongside reasoning deltas.
 *
 * No API keys required — pure unit tests over an in-memory SSE stream.
 *
 * Run with: pnpm run test:sse-client
 */

import { parseSSEStream } from "../src/lib/providers/openaiChatCompletionsClient.js";
import { defineSuite } from "./helpers/harness.js";

const { recordTest, runSuite } = defineSuite("Native SSE Client");

// ───────────────────────────────────────────────────────────────────────
// Helpers
// ───────────────────────────────────────────────────────────────────────

const sseStream = (
  events: Array<Record<string, unknown> | "[DONE]">,
): ReadableStream<Uint8Array> => {
  const enc = new TextEncoder();
  const payload = events
    .map((e) => `data: ${e === "[DONE]" ? e : JSON.stringify(e)}\n\n`)
    .join("");
  return new ReadableStream({
    start(controller) {
      controller.enqueue(enc.encode(payload));
      controller.close();
    },
  });
};

const deltaEvent = (
  delta: Record<string, unknown>,
  finish: string | null = null,
): Record<string, unknown> => ({
  choices: [{ index: 0, delta, finish_reason: finish }],
});

// ───────────────────────────────────────────────────────────────────────
// Section A — reasoning_content accumulation
// ───────────────────────────────────────────────────────────────────────

{
  const reasoningDeltas: string[] = [];
  const textDeltas: string[] = [];
  const result = await parseSSEStream(
    sseStream([
      deltaEvent({ reasoning_content: "Let me think" }),
      deltaEvent({ reasoning_content: " step by step." }),
      deltaEvent({ content: "Answer: 42" }, "stop"),
      "[DONE]",
    ]),
    (d) => textDeltas.push(d),
    (d) => reasoningDeltas.push(d),
  );

  recordTest(
    "reasoning_content deltas accumulate into result.reasoning",
    result.reasoning === "Let me think step by step.",
    false,
    `got "${result.reasoning}"`,
  );
  recordTest(
    "reasoning deltas do not pollute result.text",
    result.text === "Answer: 42",
    false,
    `got "${result.text}"`,
  );
  recordTest(
    "onReasoningDelta fires once per reasoning delta, in order",
    reasoningDeltas.length === 2 &&
      reasoningDeltas[0] === "Let me think" &&
      reasoningDeltas[1] === " step by step.",
    false,
    `got ${JSON.stringify(reasoningDeltas)}`,
  );
  recordTest(
    "onTextDelta unaffected by reasoning deltas",
    textDeltas.length === 1 && textDeltas[0] === "Answer: 42",
    false,
    `got ${JSON.stringify(textDeltas)}`,
  );
  recordTest(
    "finishReason still captured alongside reasoning",
    result.finishReason === "stop",
    false,
    `got ${String(result.finishReason)}`,
  );
}

// ───────────────────────────────────────────────────────────────────────
// Section B — gateway-style `reasoning` fallback field
// ───────────────────────────────────────────────────────────────────────

{
  const reasoningDeltas: string[] = [];
  const result = await parseSSEStream(
    sseStream([
      deltaEvent({ reasoning: "thinking…" }),
      deltaEvent({ content: "done" }, "stop"),
      "[DONE]",
    ]),
    () => {},
    (d) => reasoningDeltas.push(d),
  );
  recordTest(
    "`reasoning` fallback field accumulates when reasoning_content absent",
    result.reasoning === "thinking…" && reasoningDeltas.length === 1,
    false,
    `reasoning="${result.reasoning}", deltas=${reasoningDeltas.length}`,
  );
}

{
  // Empty-string reasoning_content must not shadow a non-empty `reasoning`
  // (|| precedence — regression for the #1073 review nit).
  const result = await parseSSEStream(
    sseStream([
      deltaEvent({ reasoning_content: "", reasoning: "fallback" }),
      deltaEvent({ content: "ok" }, "stop"),
      "[DONE]",
    ]),
    () => {},
  );
  recordTest(
    "empty reasoning_content falls through to non-empty `reasoning`",
    result.reasoning === "fallback",
    false,
    `got "${result.reasoning}"`,
  );
}

// ───────────────────────────────────────────────────────────────────────
// Section C — interleaved reasoning → content (deepseek-reasoner pattern)
// ───────────────────────────────────────────────────────────────────────

{
  const order: string[] = [];
  const result = await parseSSEStream(
    sseStream([
      deltaEvent({ reasoning_content: "r1" }),
      deltaEvent({ reasoning_content: "r2" }),
      deltaEvent({ content: "c1" }),
      deltaEvent({ reasoning_content: "r3" }),
      deltaEvent({ content: "c2" }, "stop"),
      "[DONE]",
    ]),
    (d) => order.push(`t:${d}`),
    (d) => order.push(`r:${d}`),
  );
  recordTest(
    "interleaved reasoning/content accumulate independently",
    result.reasoning === "r1r2r3" && result.text === "c1c2",
    false,
    `reasoning="${result.reasoning}", text="${result.text}"`,
  );
  recordTest(
    "interleaved callback order preserved",
    order.join(",") === "r:r1,r:r2,t:c1,r:r3,t:c2",
    false,
    `got ${order.join(",")}`,
  );
}

// ───────────────────────────────────────────────────────────────────────
// Section D — non-reasoner streams and optional callback
// ───────────────────────────────────────────────────────────────────────

{
  let reasoningFired = false;
  const result = await parseSSEStream(
    sseStream([deltaEvent({ content: "plain" }, "stop"), "[DONE]"]),
    () => {},
    () => {
      reasoningFired = true;
    },
  );
  recordTest(
    "non-reasoner stream leaves result.reasoning empty",
    result.reasoning === "" && !reasoningFired,
    false,
    `reasoning="${result.reasoning}", fired=${reasoningFired}`,
  );
}

{
  // Two-arg call (no onReasoningDelta) must still accumulate without crashing.
  const result = await parseSSEStream(
    sseStream([
      deltaEvent({ reasoning_content: "silent" }),
      deltaEvent({ content: "ok" }, "stop"),
      "[DONE]",
    ]),
    () => {},
  );
  recordTest(
    "onReasoningDelta is optional (accumulation still happens)",
    result.reasoning === "silent" && result.text === "ok",
    false,
    `reasoning="${result.reasoning}", text="${result.text}"`,
  );
}

// ───────────────────────────────────────────────────────────────────────
// Section E — usage + tool calls unaffected alongside reasoning
// ───────────────────────────────────────────────────────────────────────

{
  const result = await parseSSEStream(
    sseStream([
      deltaEvent({ reasoning_content: "thinking" }),
      deltaEvent({
        tool_calls: [
          {
            index: 0,
            id: "call_1",
            type: "function",
            function: { name: "lookup", arguments: '{"q":' },
          },
        ],
      }),
      deltaEvent({
        tool_calls: [{ index: 0, function: { arguments: '"x"}' } }],
      }),
      deltaEvent({}, "tool_calls"),
      {
        choices: [],
        usage: {
          prompt_tokens: 10,
          completion_tokens: 25,
          total_tokens: 35,
          completion_tokens_details: { reasoning_tokens: 7 },
        },
      },
      "[DONE]",
    ]),
    () => {},
  );
  const tc = result.toolCalls.get(0);
  recordTest(
    "tool-call assembly intact alongside reasoning deltas",
    tc?.id === "call_1" &&
      tc?.name === "lookup" &&
      tc?.argsBuffered === '{"q":"x"}',
    false,
    `got ${JSON.stringify(tc)}`,
  );
  recordTest(
    "usage capture intact (incl. reasoning_tokens detail)",
    result.usage?.completion_tokens === 25 &&
      result.usage?.completion_tokens_details?.reasoning_tokens === 7,
    false,
    `got ${JSON.stringify(result.usage)}`,
  );
  recordTest(
    "reasoning accumulated in tool-call stream",
    result.reasoning === "thinking",
    false,
    `got "${result.reasoning}"`,
  );
}

await runSuite();
