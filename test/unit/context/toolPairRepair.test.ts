import { describe, it, expect } from "vitest";
import { repairToolPairs } from "../../../src/lib/context/toolPairRepair.js";
import type { ChatMessage } from "../../../src/lib/types/conversation.js";

describe("Tool Pair Repair", () => {
  it("should not modify valid pairs", () => {
    const messages: ChatMessage[] = [
      {
        id: "1",
        role: "user",
        content: "Use a tool",
        timestamp: new Date().toISOString(),
      },
      {
        id: "2",
        role: "tool_call",
        content: "Calling search",
        tool: "search",
        timestamp: new Date().toISOString(),
      },
      {
        id: "3",
        role: "tool_result",
        content: "Result from search",
        tool: "search",
        timestamp: new Date().toISOString(),
      },
      {
        id: "4",
        role: "assistant",
        content: "Here's what I found",
        timestamp: new Date().toISOString(),
      },
    ];

    const result = repairToolPairs(messages);
    expect(result.repaired).toBe(false);
    expect(result.messages).toEqual(messages);
  });

  it("should add synthetic result for orphaned tool_call", () => {
    const messages: ChatMessage[] = [
      {
        id: "1",
        role: "user",
        content: "Hello",
        timestamp: new Date().toISOString(),
      },
      {
        id: "2",
        role: "tool_call",
        content: "Calling search",
        tool: "search",
        timestamp: new Date().toISOString(),
      },
      {
        id: "3",
        role: "assistant",
        content: "Response",
        timestamp: new Date().toISOString(),
      },
    ];

    const result = repairToolPairs(messages);
    expect(result.repaired).toBe(true);
    expect(result.orphanedCallsFixed).toBe(1);

    // Should have synthetic result after tool_call
    const syntheticResult = result.messages[2];
    expect(syntheticResult.role).toBe("tool_result");
    expect(syntheticResult.content).toContain("compacted");
  });

  it("should add synthetic call for orphaned tool_result", () => {
    const messages: ChatMessage[] = [
      {
        id: "1",
        role: "user",
        content: "Hello",
        timestamp: new Date().toISOString(),
      },
      {
        id: "2",
        role: "tool_result",
        content: "Some result",
        tool: "search",
        timestamp: new Date().toISOString(),
      },
      {
        id: "3",
        role: "assistant",
        content: "Response",
        timestamp: new Date().toISOString(),
      },
    ];

    const result = repairToolPairs(messages);
    expect(result.repaired).toBe(true);
    expect(result.orphanedResultsFixed).toBe(1);

    // Should have synthetic call before tool_result
    const syntheticCall = result.messages[1];
    expect(syntheticCall.role).toBe("tool_call");
    expect(syntheticCall.content).toContain("compacted");
  });

  it("should handle empty messages array", () => {
    const result = repairToolPairs([]);
    expect(result.repaired).toBe(false);
    expect(result.messages).toEqual([]);
  });

  it("should handle multiple orphaned pairs", () => {
    const messages: ChatMessage[] = [
      {
        id: "1",
        role: "tool_call",
        content: "Call 1",
        tool: "t1",
        timestamp: new Date().toISOString(),
      },
      {
        id: "2",
        role: "user",
        content: "Interruption",
        timestamp: new Date().toISOString(),
      },
      {
        id: "3",
        role: "tool_call",
        content: "Call 2",
        tool: "t2",
        timestamp: new Date().toISOString(),
      },
      {
        id: "4",
        role: "assistant",
        content: "Done",
        timestamp: new Date().toISOString(),
      },
    ];

    const result = repairToolPairs(messages);
    expect(result.repaired).toBe(true);
    expect(result.orphanedCallsFixed).toBe(2);
  });
});
