import { describe, it, expect } from "vitest";
import { pruneToolOutputs } from "../../../../src/lib/context/stages/toolOutputPruner.js";
import type { ChatMessage } from "../../../../src/lib/types/conversation.js";

describe("Tool Output Pruner", () => {
  it("should prune old tool outputs beyond protection window", () => {
    const messages: ChatMessage[] = [];

    // Add 10 tool results with large content
    for (let i = 0; i < 10; i++) {
      messages.push({
        id: `tool-result-${i}`,
        role: "tool_result",
        content: "x".repeat(20_000),
        tool: `tool_${i}`,
        timestamp: new Date().toISOString(),
      });
    }

    const result = pruneToolOutputs(messages, {
      protectTokens: 10_000,
      minimumSavings: 1_000,
    });

    expect(result.pruned).toBe(true);
    expect(result.tokensSaved).toBeGreaterThan(0);

    // Most recent should be preserved
    const lastMsg = result.messages[result.messages.length - 1];
    expect(lastMsg.content).not.toBe("[Tool result cleared]");
  });

  it("should not prune protected tools", () => {
    const messages: ChatMessage[] = [
      {
        id: "skill-result-1",
        role: "tool_result",
        content: "x".repeat(50_000),
        tool: "skill",
        timestamp: new Date().toISOString(),
      },
    ];

    const result = pruneToolOutputs(messages, {
      protectTokens: 0,
      minimumSavings: 100,
      protectedTools: ["skill"],
    });

    expect(result.messages[0].content).not.toBe("[Tool result cleared]");
  });

  it("should not prune when savings below minimum", () => {
    const messages: ChatMessage[] = [
      {
        id: "tool-result-1",
        role: "tool_result",
        content: "Short result",
        tool: "tool_1",
        timestamp: new Date().toISOString(),
      },
    ];

    const result = pruneToolOutputs(messages, {
      protectTokens: 0,
      minimumSavings: 100_000,
    });

    expect(result.pruned).toBe(false);
  });

  it("should preserve non-tool messages", () => {
    const messages: ChatMessage[] = [
      {
        id: "1",
        role: "user",
        content: "Hello",
        timestamp: new Date().toISOString(),
      },
      {
        id: "2",
        role: "assistant",
        content: "Hi there!",
        timestamp: new Date().toISOString(),
      },
      {
        id: "3",
        role: "tool_result",
        content: "x".repeat(20_000),
        tool: "test",
        timestamp: new Date().toISOString(),
      },
    ];

    const result = pruneToolOutputs(messages, {
      protectTokens: 0,
      minimumSavings: 100,
    });

    expect(result.messages[0].content).toBe("Hello");
    expect(result.messages[1].content).toBe("Hi there!");
  });
});
