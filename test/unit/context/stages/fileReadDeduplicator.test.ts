import { describe, it, expect } from "vitest";
import { deduplicateFileReads } from "../../../../src/lib/context/stages/fileReadDeduplicator.js";
import type { ChatMessage } from "../../../../src/lib/types/conversation.js";

describe("File Read Deduplicator", () => {
  it("should deduplicate multiple reads of the same file", () => {
    const messages: ChatMessage[] = [
      {
        id: "1",
        role: "tool_result",
        content: "read_file 'src/index.ts'\n" + "x".repeat(5000),
        timestamp: new Date().toISOString(),
      },
      {
        id: "2",
        role: "user",
        content: "Modify it",
        timestamp: new Date().toISOString(),
      },
      {
        id: "3",
        role: "tool_result",
        content: "read_file 'src/index.ts'\n" + "y".repeat(5000),
        timestamp: new Date().toISOString(),
      },
    ];

    const result = deduplicateFileReads(messages);
    expect(result.deduplicated).toBe(true);
    expect(result.messages[0].content).toContain("refer to latest read");
    expect(result.messages[2].content).toContain("y".repeat(100)); // Latest kept
  });

  it("should not deduplicate unique file reads", () => {
    const messages: ChatMessage[] = [
      {
        id: "1",
        role: "tool_result",
        content: "read_file 'src/a.ts'\ncontent a",
        timestamp: new Date().toISOString(),
      },
      {
        id: "2",
        role: "tool_result",
        content: "read_file 'src/b.ts'\ncontent b",
        timestamp: new Date().toISOString(),
      },
    ];

    const result = deduplicateFileReads(messages);
    expect(result.deduplicated).toBe(false);
  });

  it("should keep the latest read and replace earlier ones", () => {
    const messages: ChatMessage[] = [
      {
        id: "1",
        role: "tool_result",
        content: "Read file 'config.json'\n" + "a".repeat(3000),
        timestamp: new Date().toISOString(),
      },
      {
        id: "2",
        role: "user",
        content: "change something",
        timestamp: new Date().toISOString(),
      },
      {
        id: "3",
        role: "tool_result",
        content: "Read file 'config.json'\n" + "b".repeat(3000),
        timestamp: new Date().toISOString(),
      },
      {
        id: "4",
        role: "user",
        content: "again",
        timestamp: new Date().toISOString(),
      },
      {
        id: "5",
        role: "tool_result",
        content: "Read file 'config.json'\n" + "c".repeat(3000),
        timestamp: new Date().toISOString(),
      },
    ];

    const result = deduplicateFileReads(messages);
    expect(result.deduplicated).toBe(true);
    expect(result.messages[0].content).toContain("refer to latest read");
    expect(result.messages[2].content).toContain("refer to latest read");
    expect(result.messages[4].content).toContain("c".repeat(100)); // Latest preserved
  });
});
