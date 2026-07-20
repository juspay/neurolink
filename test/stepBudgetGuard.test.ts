/**
 * Vitest tests for the per-step context budget guard (AI-SDK tool loop).
 *
 * The guard is the compact-and-continue counterpart of the googleVertex
 * native loops' createContextGuard: given a step's ModelMessage[] it must
 * (1) no-op under threshold, (2) truncate OLD tool outputs to previews,
 * (3) drop oldest complete tool exchanges while preserving the task message,
 * call/result pairing, and the protected tail, and (4) never make the
 * conversation structurally invalid.
 *
 * Run:
 *   pnpm exec vitest run test/stepBudgetGuard.test.ts
 */

import { describe, it, expect } from "vitest";
import type { ModelMessage } from "ai";
import {
  createStepBudgetGuard,
  estimateStepMessagesTokens,
  estimateFixedOverheadTokens,
} from "../src/lib/context/stepBudgetGuard.js";

const user = (text: string): ModelMessage => ({
  role: "user",
  content: [{ type: "text", text }],
});

const assistantToolCall = (id: string): ModelMessage =>
  ({
    role: "assistant",
    content: [
      {
        type: "tool-call",
        toolCallId: id,
        toolName: "search",
        input: { q: id },
      },
    ],
  }) as ModelMessage;

const toolResult = (id: string, payload: string): ModelMessage =>
  ({
    role: "tool",
    content: [
      {
        type: "tool-result",
        toolCallId: id,
        toolName: "search",
        output: { type: "text", value: payload },
      },
    ],
  }) as ModelMessage;

const assistantText = (text: string): ModelMessage => ({
  role: "assistant",
  content: [{ type: "text", text }],
});

/** A conversation: task + N tool exchanges with `payloadBytes` outputs each. */
const conversation = (exchanges: number, payloadBytes: number) => {
  const messages: ModelMessage[] = [user("Review this pull request.")];
  for (let i = 0; i < exchanges; i++) {
    messages.push(assistantToolCall(`call-${i}`));
    messages.push(toolResult(`call-${i}`, "x".repeat(payloadBytes)));
  }
  return messages;
};

describe("estimateStepMessagesTokens", () => {
  it("scales with content size and never throws on tool parts", () => {
    const small = estimateStepMessagesTokens(conversation(1, 100));
    const large = estimateStepMessagesTokens(conversation(1, 100_000));
    expect(large).toBeGreaterThan(small);
  });
});

describe("estimateFixedOverheadTokens", () => {
  it("counts system prompt and tool definitions", () => {
    const none = estimateFixedOverheadTokens(undefined, undefined);
    const withSystem = estimateFixedOverheadTokens("You are a reviewer.", {
      search: { description: "search the code", inputSchema: {} },
    });
    expect(none).toBe(0);
    expect(withSystem).toBeGreaterThan(0);
  });
});

describe("createStepBudgetGuard", () => {
  it("no-ops (returns undefined) when the step fits the budget", () => {
    // litellm static default window = 128K — a tiny conversation fits.
    const guard = createStepBudgetGuard({
      provider: "litellm",
      model: "glm-private",
      maxTokens: 4_000,
    });
    expect(guard(conversation(2, 200))).toBeUndefined();
  });

  it("truncates OLD tool outputs to previews and leaves the protected tail intact", () => {
    const guard = createStepBudgetGuard({
      provider: "litellm",
      model: "glm-private",
      maxTokens: 4_000,
    });
    // 10 exchanges × ~80KB outputs ≈ far beyond the ~105K available input.
    const messages = conversation(10, 80_000);
    const compacted = guard(messages);

    expect(compacted).toBeDefined();
    const result = compacted!;

    // The task message survives as the first message.
    expect(result[0]).toEqual(messages[0]);

    // The final tool result (protected tail) is untouched.
    const lastTool = result[result.length - 1] as {
      content: Array<{ output: { value: string } }>;
    };
    expect(lastTool.content[0].output.value.length).toBe(80_000);

    // Compaction actually reduced the projected request.
    expect(estimateStepMessagesTokens(result)).toBeLessThan(
      estimateStepMessagesTokens(messages),
    );
  });

  it("drops oldest complete exchanges (call+result together) when previews aren't enough, with an elision note", () => {
    // Tiny window forces stage 2: lm-studio static default is 8K.
    const guard = createStepBudgetGuard({
      provider: "lm-studio",
      model: "local-model",
      maxTokens: 1_000,
    });
    const messages = conversation(12, 4_000);
    const compacted = guard(messages);

    expect(compacted).toBeDefined();
    const result = compacted!;

    // Task message survives.
    expect(result[0]).toEqual(messages[0]);

    // An elision note tells the model history was removed.
    const noteMessage = result.find(
      (m) =>
        m.role === "user" &&
        Array.isArray(m.content) &&
        JSON.stringify(m.content).includes("context truncated"),
    );
    expect(noteMessage).toBeDefined();

    // Pairing integrity: every remaining tool message's toolCallId has a
    // preceding assistant tool-call with the same id.
    const callIds = new Set<string>();
    for (const message of result) {
      if (!Array.isArray(message.content)) {
        continue;
      }
      for (const part of message.content as Array<{
        type?: string;
        toolCallId?: string;
      }>) {
        if (part.type === "tool-call" && part.toolCallId) {
          callIds.add(part.toolCallId);
        }
        if (part.type === "tool-result" && part.toolCallId) {
          expect(callIds.has(part.toolCallId)).toBe(true);
        }
      }
    }

    // It got materially smaller.
    expect(result.length).toBeLessThan(messages.length);
  });

  it("previews the tool output VALUE for text results, not the wrapper JSON", () => {
    const guard = createStepBudgetGuard({
      provider: "litellm",
      model: "glm-private",
      maxTokens: 4_000,
    });
    const marker = "REAL_PAYLOAD_HEAD ";
    // Sizing: 'old' dominates the estimate (~100K+ tokens on the 128K litellm
    // default → over the ~105K threshold), so stage-1 truncation of 'old'
    // alone resolves the overage and stage 2 never drops the exchange we
    // assert on. The later exchanges keep 'old' outside the protected tail.
    const messages: ModelMessage[] = [
      user("Task"),
      assistantToolCall("old"),
      toolResult("old", marker + "y".repeat(400_000)),
      assistantToolCall("mid"),
      toolResult("mid", "z".repeat(60_000)),
      assistantToolCall("new"),
      toolResult("new", "w".repeat(60_000)),
    ];
    const compacted = guard(messages)!;
    expect(compacted).toBeDefined();

    const oldResult = compacted.find(
      (m) =>
        m.role === "tool" &&
        Array.isArray(m.content) &&
        (m.content[0] as { toolCallId?: string }).toolCallId === "old",
    ) as { content: Array<{ output: { value: string } }> };
    const previewText = oldResult.content[0].output.value;
    // The preview must contain the actual payload, not the escaped
    // {"type":"text","value":... wrapper serialization.
    expect(previewText).toContain(marker);
    expect(previewText).not.toContain('{"type":"text"');
  });

  it("re-resolves overhead per invocation via getFixedOverheadTokens (mid-loop tool growth)", () => {
    let overhead = 0;
    const guard = createStepBudgetGuard({
      provider: "litellm",
      model: "glm-private",
      maxTokens: 4_000,
      getFixedOverheadTokens: () => overhead,
    });
    const messages = conversation(6, 10_000);

    // First step: small tool set — fits.
    expect(guard(messages)).toBeUndefined();
    // Mid-loop hydration added many tool definitions — same messages must now
    // trigger compaction because the dynamic overhead is re-read.
    overhead = 1_000_000;
    expect(guard(messages)).toBeDefined();
  });

  it("includes fixedOverheadTokens (system + tools) in the trigger decision", () => {
    const base = {
      provider: "litellm",
      model: "glm-private",
      maxTokens: 4_000,
    };
    const messages = conversation(6, 10_000);

    const withoutOverhead = createStepBudgetGuard(base)(messages);
    const withHugeOverhead = createStepBudgetGuard({
      ...base,
      fixedOverheadTokens: 1_000_000,
    })(messages);

    // Same messages: overhead alone pushes the step over the threshold.
    expect(withoutOverhead).toBeUndefined();
    expect(withHugeOverhead).toBeDefined();
  });

  it("places the elision note BEFORE the protected tail even when every droppable exchange is removed", () => {
    const guard = createStepBudgetGuard({
      provider: "lm-studio",
      model: "local-model",
      maxTokens: 1_000,
    });
    // Payloads so large that stage 2 must drop every droppable exchange.
    const messages = conversation(10, 60_000);
    const compacted = guard(messages);

    expect(compacted).toBeDefined();
    const result = compacted!;
    const noteIndex = result.findIndex(
      (m) =>
        m.role === "user" &&
        Array.isArray(m.content) &&
        JSON.stringify(m.content).includes("context truncated"),
    );
    expect(noteIndex).toBeGreaterThanOrEqual(0);
    // The note must precede the retained context it refers to — never sit at
    // the very end after the protected tail.
    expect(noteIndex).toBeLessThan(result.length - 1);
  });

  it("never drops a trailing exchange that bleeds into the protected tail", () => {
    const guard = createStepBudgetGuard({
      provider: "lm-studio",
      model: "local-model",
      maxTokens: 1_000,
    });
    // One giant exchange inside the protected tail only: guard may truncate
    // nothing structural — plain assistant/user tail stays untouched.
    const messages: ModelMessage[] = [
      user("Task"),
      assistantText("thinking"),
      assistantToolCall("only"),
      toolResult("only", "x".repeat(50_000)),
    ];
    const compacted = guard(messages);
    // The last exchange is within the 4-message protected tail — the guard
    // must not mutate it, so either nothing changes or nothing structural does.
    if (compacted) {
      expect(compacted.length).toBe(messages.length);
      const lastTool = compacted[compacted.length - 1] as {
        content: Array<{ output: { value: string } }>;
      };
      expect(lastTool.content[0].output.value.length).toBe(50_000);
    }
  });
});
