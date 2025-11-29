import { promises as fs } from "fs";
import { join } from "path";
import { vi, describe, it, expect, beforeEach, afterEach } from "vitest";
import { DiskConversationMemoryManager } from "../../../src/lib/core/diskConversationMemoryManager";
import type {
  ConversationMemoryConfig,
  DiskStorageConfig,
} from "../../../src/lib/types/conversation";

// Mock the NeuroLink class to avoid circular dependencies and actual AI calls
vi.mock("../../../src/lib/neurolink", () => ({
  NeuroLink: class {
    async generate(options: { input: { text: string } }) {
      if (options.input.text.includes("generate a title")) {
        return { content: "Generated Title" };
      }
      return { content: "summary" };
    }
  },
}));

describe("DiskConversationMemoryManager", () => {
  const storagePath = join(__dirname, "test-storage");
  let config: ConversationMemoryConfig;
  let diskConfig: DiskStorageConfig;
  let manager: DiskConversationMemoryManager;

  beforeEach(async () => {
    // Ensure the test storage directory is clean before each test
    await fs.rm(storagePath, { recursive: true, force: true });
    await fs.mkdir(storagePath, { recursive: true });

    config = {
      enabled: true,
      maxSessions: 10,
      maxTurnsPerSession: 5,
    };
    diskConfig = {
      storagePath,
    };
    manager = new DiskConversationMemoryManager(config, diskConfig);
    await manager.initialize();
  });

  afterEach(async () => {
    // Clean up the test storage directory after each test
    await fs.rm(storagePath, { recursive: true, force: true });
  });

  it("should initialize correctly and create directories", async () => {
    const stats = await fs.stat(storagePath);
    expect(stats.isDirectory()).toBe(true);
  });

  it("should store and retrieve a conversation turn", async () => {
    const sessionId = "session-1";
    const userId = "user-1";
    const userMessage = "Hello";
    const aiResponse = "Hi there!";

    await manager.storeConversationTurn(
      sessionId,
      userId,
      userMessage,
      aiResponse,
      new Date(),
    );

    const messages = await manager.buildContextMessages(sessionId, userId);
    expect(messages).toHaveLength(2);
    expect(messages[0].role).toBe("user");
    expect(messages[0].content).toBe(userMessage);
    expect(messages[1].role).toBe("assistant");
    expect(messages[1].content).toBe(aiResponse);
  });

  it("should create a new conversation file if one does not exist", async () => {
    const sessionId = "session-2";
    const userId = "user-2";

    await manager.storeConversationTurn(
      sessionId,
      userId,
      "First message",
      "First response",
      new Date(),
    );

    const filePath = await manager.getConversationFilePath(sessionId, userId);
    const fileExists = await fs
      .stat(filePath)
      .then(() => true)
      .catch(() => false);
    expect(fileExists).toBe(true);
  });

  it("should limit the number of turns per session", async () => {
    const sessionId = "session-3";
    const userId = "user-3";
    config.maxTurnsPerSession = 2;
    manager = new DiskConversationMemoryManager(config, diskConfig);

    for (let i = 0; i < 3; i++) {
      await manager.storeConversationTurn(
        sessionId,
        userId,
        `User ${i}`,
        `AI ${i}`,
        new Date(),
      );
    }

    const messages = await manager.buildContextMessages(sessionId, userId);
    expect(messages).toHaveLength(4); // 2 turns * 2 messages/turn
    expect(messages[0].content).toBe("User 1");
  });

  it("should clear a session", async () => {
    const sessionId = "session-4";
    const userId = "user-4";
    await manager.storeConversationTurn(
      sessionId,
      userId,
      "Message",
      "Response",
      new Date(),
    );

    const cleared = await manager.clearSession(sessionId, userId);
    expect(cleared).toBe(true);

    const messages = await manager.buildContextMessages(sessionId, userId);
    expect(messages).toHaveLength(0);
  });

  it("should clear all sessions", async () => {
    await manager.storeConversationTurn("s1", "u1", "m", "r", new Date());
    await manager.storeConversationTurn("s2", "u2", "m", "r", new Date());

    await manager.clearAllSessions();

    const stats = await manager.getStats();
    expect(stats.totalSessions).toBe(0);
  });

  it("should handle non-existent session retrieval gracefully", async () => {
    const messages = await manager.buildContextMessages(
      "non-existent",
      "non-existent",
    );
    expect(messages).toEqual([]);
  });
});
