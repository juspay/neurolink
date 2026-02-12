import { describe, it, expect } from "vitest";
import { ContextCompactor } from "../../../src/lib/context/contextCompactor.js";
import type { ChatMessage } from "../../../src/lib/types/conversation.js";

function makeMessages(count: number, contentSize = 100): ChatMessage[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `msg-${i}`,
    role: (i % 2 === 0 ? "user" : "assistant") as ChatMessage["role"],
    content: "x".repeat(contentSize),
    timestamp: new Date().toISOString(),
  }));
}

function makeToolMessages(
  count: number,
  toolContentSize = 5000,
): ChatMessage[] {
  const msgs: ChatMessage[] = [];
  for (let i = 0; i < count; i++) {
    msgs.push({
      id: `tool-call-${i}`,
      role: "tool_call",
      content: `Calling tool_${i}`,
      tool: `tool_${i}`,
      timestamp: new Date().toISOString(),
    });
    msgs.push({
      id: `tool-result-${i}`,
      role: "tool_result",
      content: "x".repeat(toolContentSize),
      tool: `tool_${i}`,
      timestamp: new Date().toISOString(),
    });
  }
  return msgs;
}

describe("ContextCompactor", () => {
  it("should not compact when under target", async () => {
    const compactor = new ContextCompactor({ enableSummarize: false });
    const messages = makeMessages(4, 10);
    const result = await compactor.compact(messages, 100_000);

    expect(result.compacted).toBe(false);
    expect(result.stagesUsed).toHaveLength(0);
    expect(result.messages).toEqual(messages);
  });

  it("should prune tool outputs when over budget", async () => {
    const compactor = new ContextCompactor({
      enableSummarize: false,
      enableDeduplicate: false,
      pruneProtectTokens: 1_000,
      pruneMinimumSavings: 100,
    });

    // Create messages with large tool outputs
    const msgs = [...makeMessages(4, 100), ...makeToolMessages(20, 5000)];

    const result = await compactor.compact(msgs, 10_000);
    expect(result.stagesUsed).toContain("prune");
    expect(result.tokensSaved).toBeGreaterThan(0);
  });

  it("should cascade through stages", async () => {
    const compactor = new ContextCompactor({
      enableSummarize: false,
      enableTruncate: true,
      pruneProtectTokens: 500,
      pruneMinimumSavings: 100,
      truncationFraction: 0.5,
    });

    // Create enough messages to need truncation even after pruning
    const msgs = makeMessages(100, 500);
    const result = await compactor.compact(msgs, 1_000);

    expect(result.compacted).toBe(true);
    expect(result.tokensSaved).toBeGreaterThan(0);
  });

  it("should use sliding window as fallback", async () => {
    const compactor = new ContextCompactor({
      enablePrune: false,
      enableDeduplicate: false,
      enableSummarize: false,
      enableTruncate: true,
      truncationFraction: 0.5,
    });

    const msgs = makeMessages(20, 500);
    const result = await compactor.compact(msgs, 1_000);

    expect(result.stagesUsed).toContain("truncate");
    expect(result.messages.length).toBeLessThan(msgs.length);
  });
});
