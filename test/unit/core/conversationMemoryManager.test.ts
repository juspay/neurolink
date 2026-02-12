import { describe, it, expect, beforeEach } from "vitest";
import { ConversationMemoryManager } from "../../../src/lib/core/conversationMemoryManager.js";

describe("ConversationMemoryManager - Token Tracking", () => {
  let manager: ConversationMemoryManager;

  beforeEach(() => {
    manager = new ConversationMemoryManager({
      enabled: true,
      maxSessions: 10,
      enableSummarization: false,
    });
  });

  it("should store API-reported token counts on session", async () => {
    await manager.initialize();

    await manager.storeConversationTurn({
      sessionId: "test-session",
      userId: "user-1",
      userMessage: "Hello",
      aiResponse: "Hi there!",
      tokenUsage: { inputTokens: 150, outputTokens: 50, totalTokens: 200 },
    });

    const session = manager.getSession("test-session");
    expect(session?.lastApiTokenCount).toBeDefined();
    expect(session?.lastApiTokenCount?.inputTokens).toBe(150);
    expect(session?.lastApiTokenCount?.outputTokens).toBe(50);
    expect(session?.lastApiTokenCount?.totalTokens).toBe(200);
  });

  it("should not set lastApiTokenCount when no tokenUsage provided", async () => {
    await manager.initialize();

    await manager.storeConversationTurn({
      sessionId: "test-session-2",
      userId: "user-1",
      userMessage: "Hello",
      aiResponse: "Hi there!",
    });

    const session = manager.getSession("test-session-2");
    expect(session?.lastApiTokenCount).toBeUndefined();
  });

  it("should create session and store messages", async () => {
    await manager.initialize();

    await manager.storeConversationTurn({
      sessionId: "test-session-3",
      userId: "user-1",
      userMessage: "Hello",
      aiResponse: "Hi there!",
    });

    const session = manager.getSession("test-session-3");
    expect(session).toBeDefined();
    expect(session?.messages).toHaveLength(2);
    expect(session?.messages[0].role).toBe("user");
    expect(session?.messages[1].role).toBe("assistant");
  });

  it("should store cache token information when provided", async () => {
    await manager.initialize();

    await manager.storeConversationTurn({
      sessionId: "test-session-cache",
      userId: "user-1",
      userMessage: "Test cache tokens",
      aiResponse: "Response with cache",
      tokenUsage: {
        inputTokens: 100,
        outputTokens: 50,
        totalTokens: 150,
        cacheReadTokens: 80,
        cacheWriteTokens: 20,
      },
    });

    const session = manager.getSession("test-session-cache");
    expect(session?.lastApiTokenCount).toBeDefined();
    expect(session?.lastApiTokenCount?.cacheReadTokens).toBe(80);
    expect(session?.lastApiTokenCount?.cacheWriteTokens).toBe(20);
  });

  it("should update lastApiTokenCount on subsequent turns", async () => {
    await manager.initialize();

    // First turn
    await manager.storeConversationTurn({
      sessionId: "test-session-update",
      userId: "user-1",
      userMessage: "First message",
      aiResponse: "First response",
      tokenUsage: { inputTokens: 100, outputTokens: 50, totalTokens: 150 },
    });

    let session = manager.getSession("test-session-update");
    expect(session?.lastApiTokenCount?.totalTokens).toBe(150);

    // Second turn with different token counts
    await manager.storeConversationTurn({
      sessionId: "test-session-update",
      userId: "user-1",
      userMessage: "Second message",
      aiResponse: "Second response",
      tokenUsage: { inputTokens: 200, outputTokens: 100, totalTokens: 300 },
    });

    session = manager.getSession("test-session-update");
    expect(session?.lastApiTokenCount?.totalTokens).toBe(300);
    expect(session?.lastApiTokenCount?.inputTokens).toBe(200);
    expect(session?.lastApiTokenCount?.outputTokens).toBe(100);
  });
});
