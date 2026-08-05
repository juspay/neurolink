#!/usr/bin/env tsx
import "dotenv/config";

/**
 * Continuous Test Suite — OpenAI-compatible loop guard adapter
 *
 * `openaiChatCompletionsBase` runs a hand-written tool loop and had NO in-turn
 * context guard of any kind, so a long agentic run walked into a provider
 * "context length exceeded" and lost every completed step. That base backs
 * LiteLLM, DeepSeek, OpenRouter, NVIDIA NIM, LM Studio, llama.cpp and every
 * `openai-compatible` provider — the widest-reach gap in the codebase.
 *
 * The reclaim POLICY is tested in continuous-test-suite-loop-guard-core.ts.
 * This suite covers the SHAPE MAPPING: OpenAI-compatible messages in, plan
 * applied back, tool_call_id pairing preserved.
 *
 * No API keys, no network, no LLM — pure function assertions.
 *
 * Run: npx tsx test/continuous-test-suite-openai-compat-guard.ts
 *      pnpm run test:openai-compat-guard
 */

import { guardOpenAICompatConversation } from "../src/lib/context/openaiCompatLoopGuard.js";
import type { OpenAICompatChatMessage } from "../src/lib/types/index.js";
import { defineSuite } from "./helpers/harness.js";

const { test, runSuite, section } = defineSuite("OpenAI-compat loop guard");

/**
 * NOTE: assertion messages must NEVER interpolate message content or tool
 * payloads — `defineSuite` downgrades a throw to SKIP when the text matches
 * `isExpectedProviderError()`, silently turning a failure into ⊘.
 */
function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(message);
  }
}

const WINDOW_PROVIDER = "openai";

/** One agent step: assistant tool-call message + its tool result messages. */
function step(i: number, outputChars: number): OpenAICompatChatMessage[] {
  return [
    {
      role: "assistant",
      content: null,
      tool_calls: [
        {
          id: `call_${i}`,
          type: "function",
          function: { name: "read_file", arguments: `{"path":"/f${i}.ts"}` },
        },
      ],
    },
    {
      role: "tool",
      content: "x".repeat(outputChars),
      tool_call_id: `call_${i}`,
    },
  ];
}

/** Every surviving tool message must still have its assistant tool_call. */
function pairingIntact(conversation: OpenAICompatChatMessage[]): boolean {
  const declared = new Set<string>();
  for (const message of conversation) {
    if (message.role === "assistant" && message.tool_calls) {
      for (const tc of message.tool_calls) {
        declared.add(tc.id);
      }
    }
    if (message.role === "tool" && !declared.has(message.tool_call_id)) {
      return false;
    }
  }
  return true;
}

/** No assistant tool_call may be left without its matching tool message. */
function noDanglingCalls(conversation: OpenAICompatChatMessage[]): boolean {
  const answered = new Set(
    conversation
      .filter((m) => m.role === "tool")
      .map((m) => (m as { tool_call_id: string }).tool_call_id),
  );
  for (const message of conversation) {
    if (message.role === "assistant" && message.tool_calls) {
      for (const tc of message.tool_calls) {
        if (!answered.has(tc.id)) {
          return false;
        }
      }
    }
  }
  return true;
}

const guard = (
  conversation: OpenAICompatChatMessage[],
  observedPromptTokens?: number,
): OpenAICompatChatMessage[] | undefined =>
  guardOpenAICompatConversation({
    conversation,
    availableInputTokens: 100_000,
    fixedOverheadTokens: 0,
    provider: WINDOW_PROVIDER,
    ...(observedPromptTokens !== undefined ? { observedPromptTokens } : {}),
  });

await runSuite(async () => {
  section("A conversation that fits must be left byte-identical");

  await test("short conversation returns undefined", async () => {
    const conversation: OpenAICompatChatMessage[] = [
      { role: "user", content: "hello" },
      ...step(1, 200),
    ];
    assert(
      guard(conversation) === undefined,
      "guard rewrote a conversation that fits",
    );
  });

  await test("text-only conversation returns undefined", async () => {
    const conversation: OpenAICompatChatMessage[] = [
      { role: "system", content: "be helpful" },
      { role: "user", content: "hi" },
      { role: "assistant", content: "hello" },
    ];
    assert(guard(conversation) === undefined, "guard rewrote a text-only chat");
  });

  section("Large outputs are truncated, pairing preserved");

  await test("fires and preserves tool_call_id pairing", async () => {
    const conversation: OpenAICompatChatMessage[] = [
      { role: "user", content: "start" },
    ];
    for (let i = 0; i < 60; i++) {
      conversation.push(...step(i, 30_000));
    }
    const out = guard(conversation);
    assert(out !== undefined, "guard did not fire on an over-budget loop");
    assert(pairingIntact(out!), "a tool message lost its assistant tool_call");
    assert(noDanglingCalls(out!), "an assistant tool_call lost its result");
  });

  await test("first user message survives", async () => {
    const conversation: OpenAICompatChatMessage[] = [
      { role: "user", content: "THE ORIGINAL TASK" },
    ];
    for (let i = 0; i < 60; i++) {
      conversation.push(...step(i, 30_000));
    }
    const out = guard(conversation);
    assert(out !== undefined, "guard did not fire");
    assert(
      JSON.stringify(out![0]) === JSON.stringify(conversation[0]),
      "guard modified the first user message",
    );
  });

  section("Small outputs force drops — the stage-2 regime");

  await test("many small results still converge without orphans", async () => {
    // Outputs below the preview budget cannot be truncated, so the guard must
    // drop whole steps. This is the regime that overflows a real agentic run
    // doing many small greps and reads.
    const conversation: OpenAICompatChatMessage[] = [
      { role: "user", content: "start" },
    ];
    for (let i = 0; i < 400; i++) {
      conversation.push(...step(i, 1_500));
    }
    const out = guard(conversation);
    assert(
      out !== undefined,
      "guard did not fire on a large small-output loop",
    );
    assert(pairingIntact(out!), "a tool message lost its assistant tool_call");
    assert(noDanglingCalls(out!), "an assistant tool_call lost its result");
    assert(
      out!.length < conversation.length,
      "guard fired but removed nothing",
    );
  });

  await test("an elision note marks removed history", async () => {
    const conversation: OpenAICompatChatMessage[] = [
      { role: "user", content: "start" },
    ];
    for (let i = 0; i < 400; i++) {
      conversation.push(...step(i, 1_500));
    }
    const out = guard(conversation)!;
    const noteIndex = out.findIndex(
      (m) =>
        m.role === "user" &&
        typeof m.content === "string" &&
        m.content.includes("removed to fit the context window"),
    );
    assert(noteIndex >= 0, "no elision note was inserted after dropping");
    const lastToolIndex = out.map((m) => m.role).lastIndexOf("tool");
    assert(
      noteIndex < lastToolIndex,
      "elision note landed after the history it refers to",
    );
  });

  await test("guard output does not immediately re-fire", async () => {
    const conversation: OpenAICompatChatMessage[] = [
      { role: "user", content: "start" },
    ];
    for (let i = 0; i < 400; i++) {
      conversation.push(...step(i, 1_500));
    }
    const once = guard(conversation)!;
    assert(
      guard(once) === undefined,
      "guard would fire again immediately after its own reclaim",
    );
  });

  section("Usage calibration");

  await test("a higher observed prompt count makes the guard no less eager", async () => {
    const conversation: OpenAICompatChatMessage[] = [
      { role: "user", content: "start" },
    ];
    for (let i = 0; i < 24; i++) {
      conversation.push(...step(i, 12_000));
    }
    const plain = guard(conversation);
    const calibrated = guard(conversation, 200_000);
    assert(
      plain === undefined || calibrated !== undefined,
      "calibration made the guard less eager than the raw estimate",
    );
  });

  await test("calibration is measured against the matching request", async () => {
    // The ratio only means something when both halves describe the SAME
    // request. Dividing the reported count by an estimate of the CURRENT
    // conversation — which has grown by an assistant turn plus its results —
    // always lands below 1, and the `max(1, …)` floor then silently pins
    // calibration at 1, so the correction never applies.
    const conversation: OpenAICompatChatMessage[] = [
      { role: "user", content: "task" },
    ];
    for (let i = 0; i < 30; i++) {
      conversation.push(...step(i, 5000));
    }
    assert(
      guard([...conversation]) === undefined,
      "setup conversation already fires without calibration",
    );
    // A real count 3x this guard's estimate for the request that earned it.
    const fired = guardOpenAICompatConversation({
      conversation: [...conversation],
      availableInputTokens: 100_000,
      fixedOverheadTokens: 0,
      provider: WINDOW_PROVIDER,
      observedPromptTokens: 30_000,
      previousSentEstimate: 10_000,
    });
    assert(
      fired !== undefined,
      "guard ignored a 3x under-estimate reported by the provider",
    );
  });

  await test("the sent estimate is reported on both paths", async () => {
    // The caller can only pair the next step's ratio correctly if it learns
    // what was actually sent — including on the quiet path, which is most steps.
    const small: OpenAICompatChatMessage[] = [
      { role: "user", content: "task" },
      ...step(0, 100),
    ];
    let quiet: number | undefined;
    const unchanged = guardOpenAICompatConversation({
      conversation: small,
      availableInputTokens: 100_000,
      fixedOverheadTokens: 0,
      provider: WINDOW_PROVIDER,
      onSentEstimate: (t) => {
        quiet = t;
      },
    });
    assert(unchanged === undefined, "guard fired on a conversation that fits");
    assert(
      quiet !== undefined && quiet > 0,
      "guard did not report the sent estimate on the quiet path",
    );

    const big: OpenAICompatChatMessage[] = [{ role: "user", content: "task" }];
    for (let i = 0; i < 60; i++) {
      big.push(...step(i, 8000));
    }
    let loud: number | undefined;
    const reclaimed = guardOpenAICompatConversation({
      conversation: big,
      availableInputTokens: 100_000,
      fixedOverheadTokens: 0,
      provider: WINDOW_PROVIDER,
      onSentEstimate: (t) => {
        loud = t;
      },
    });
    assert(reclaimed !== undefined, "guard did not fire on an oversized loop");
    assert(
      loud !== undefined && loud > 0,
      "guard did not report the sent estimate after reclaiming",
    );
  });

  section("Preview eligibility is measured in bytes");

  await test("multibyte output is truncated, not dropped", async () => {
    // A byte budget compared against String.length under-reports every
    // multibyte payload: 1000 CJK characters are 3000 UTF-8 bytes but only
    // 1000 code units, so stage 1 judged them small enough to leave alone and
    // the reclaim fell through to dropping whole batches instead.
    const conversation: OpenAICompatChatMessage[] = [
      { role: "user", content: "task" },
    ];
    // ~263 tokens per result, so this clears the 85% firing threshold of the
    // 100k window without needing any fixed overhead.
    for (let i = 0; i < 400; i++) {
      conversation.push(
        {
          role: "assistant",
          content: null,
          tool_calls: [
            {
              id: `call_${i}`,
              type: "function",
              function: { name: "read_file", arguments: `{"p":"/f${i}"}` },
            },
          ],
        },
        {
          role: "tool",
          // 1000 chars / 3000 bytes: over the 2048-byte preview budget, under
          // it by string length. The whole point of the case.
          content: "漢".repeat(1000),
          tool_call_id: `call_${i}`,
        },
      );
    }
    const out = guard([...conversation]);
    assert(out !== undefined, "guard did not fire on an oversized loop");
    const shrunk = (out as OpenAICompatChatMessage[]).filter(
      (m) =>
        m.role === "tool" &&
        typeof m.content === "string" &&
        m.content.length < 1000,
    );
    assert(
      shrunk.length > 0,
      "no multibyte tool output was previewed — the byte budget was compared against string length",
    );
  });

  await test("a zero observed prompt count is ignored safely", async () => {
    const conversation: OpenAICompatChatMessage[] = [
      { role: "user", content: "hi" },
      ...step(1, 100),
    ];
    assert(
      guard(conversation, 0) === undefined,
      "zero observed tokens perturbed the decision",
    );
  });
});
