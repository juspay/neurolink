import { describe, it, expect } from "vitest";
import { truncateWithSlidingWindow } from "../../../../src/lib/context/stages/slidingWindowTruncator.js";
import type { ChatMessage } from "../../../../src/lib/types/conversation.js";

function makeMessages(count: number): ChatMessage[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `msg-${i}`,
    role: (i % 2 === 0 ? "user" : "assistant") as ChatMessage["role"],
    content: `Message ${i} content`,
    timestamp: new Date().toISOString(),
  }));
}

describe("Sliding Window Truncator", () => {
  it("should not truncate small conversations", () => {
    const messages = makeMessages(4);
    const result = truncateWithSlidingWindow(messages);

    expect(result.truncated).toBe(false);
    expect(result.messages).toEqual(messages);
  });

  it("should preserve first user-assistant pair", () => {
    const messages = makeMessages(20);
    const result = truncateWithSlidingWindow(messages, { fraction: 0.5 });

    expect(result.truncated).toBe(true);
    expect(result.messages[0].id).toBe("msg-0");
    expect(result.messages[1].id).toBe("msg-1");
  });

  it("should insert truncation marker", () => {
    const messages = makeMessages(20);
    const result = truncateWithSlidingWindow(messages, { fraction: 0.5 });

    const marker = result.messages.find((m) => m.id.startsWith("truncation-"));
    expect(marker).toBeDefined();
    expect(marker?.role).toBe("system");
    expect(marker?.content).toContain("truncated");
  });

  it("should remove an even number of messages", () => {
    const messages = makeMessages(20);
    const result = truncateWithSlidingWindow(messages, { fraction: 0.5 });

    expect(result.messagesRemoved % 2).toBe(0);
  });

  it("should reduce total message count", () => {
    const messages = makeMessages(20);
    const result = truncateWithSlidingWindow(messages, { fraction: 0.5 });

    // 20 - 2 (first pair) = 18 remaining, remove 50% = 9, make even = 8
    // Result: 2 (first pair) + 1 (marker) + 10 (kept) = 13
    expect(result.messages.length).toBeLessThan(messages.length);
  });
});
