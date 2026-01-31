/**
 * Thread Manager Unit Tests
 *
 * Tests for high-level thread and message management including:
 * - Thread creation and management
 * - Message operations
 * - Batch operations
 * - Thread context retrieval
 * - Auto-archiving
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { ThreadManager } from "../../../src/lib/storage/managers/threadManager.js";
import { MemoryAdapter } from "../../../src/lib/storage/adapters/memoryAdapter.js";
import type { StorageProvider } from "../../../src/lib/types/index.js";

describe("ThreadManager", () => {
  let storage: StorageProvider;
  let threadManager: ThreadManager;

  beforeEach(async () => {
    storage = new MemoryAdapter();
    await storage.init();
    threadManager = new ThreadManager(storage);
  });

  afterEach(async () => {
    await storage.close();
  });

  describe("Thread Operations", () => {
    it("should create a thread", async () => {
      const thread = await threadManager.createThread("user1", "Test Thread", {
        key: "value",
      });

      expect(thread.id).toBeDefined();
      expect(thread.resourceId).toBe("user1");
      expect(thread.title).toBe("Test Thread");
      expect(thread.metadata).toEqual({ key: "value" });
      expect(thread.status).toBe("active");
    });

    it("should use default resource ID when not provided", async () => {
      const manager = new ThreadManager(storage, {
        defaultResourceId: "default-resource",
      });

      const thread = await manager.createThread(undefined, "Test");

      expect(thread.resourceId).toBe("default-resource");
    });

    it("should get a thread by ID", async () => {
      const created = await threadManager.createThread("user1", "Test");
      const retrieved = await threadManager.getThread(created.id);

      expect(retrieved).not.toBeNull();
      expect(retrieved?.id).toBe(created.id);
    });

    it("should return null for non-existent thread", async () => {
      const result = await threadManager.getThread("non-existent");
      expect(result).toBeNull();
    });

    it("should get thread with messages", async () => {
      const thread = await threadManager.createThread("user1", "Test");
      await threadManager.addMessage(thread.id, {
        role: "user",
        content: "Hello",
      });
      await threadManager.addMessage(thread.id, {
        role: "assistant",
        content: "Hi",
      });

      const result = await threadManager.getThreadWithMessages(thread.id);

      expect(result).not.toBeNull();
      expect(result?.thread.id).toBe(thread.id);
      expect(result?.messages).toHaveLength(2);
    });

    it("should respect message limit when getting thread with messages", async () => {
      const thread = await threadManager.createThread("user1", "Test");

      for (let i = 0; i < 10; i++) {
        await threadManager.addMessage(thread.id, {
          role: "user",
          content: `Message ${i}`,
        });
      }

      const result = await threadManager.getThreadWithMessages(thread.id, 5);

      expect(result?.messages).toHaveLength(5);
    });

    it("should update thread", async () => {
      const thread = await threadManager.createThread("user1", "Original");
      const updated = await threadManager.updateThread(thread.id, {
        title: "Updated",
        metadata: { updated: true },
      });

      expect(updated).not.toBeNull();
      expect(updated?.title).toBe("Updated");
      expect(updated?.metadata).toEqual({ updated: true });
    });

    it("should archive a thread", async () => {
      const thread = await threadManager.createThread("user1", "Test");
      const archived = await threadManager.archiveThread(thread.id);

      expect(archived).not.toBeNull();
      expect(archived?.status).toBe("archived");
    });

    it("should delete a thread", async () => {
      const thread = await threadManager.createThread("user1", "Test");
      const deleted = await threadManager.deleteThread(thread.id);

      expect(deleted).toBe(true);

      const retrieved = await threadManager.getThread(thread.id);
      expect(retrieved).toBeNull();
    });

    it("should list threads by resource", async () => {
      await threadManager.createThread("user1", "Thread 1");
      await threadManager.createThread("user1", "Thread 2");
      await threadManager.createThread("user2", "Thread 3");

      const threads = await threadManager.getThreadsByResource("user1");

      expect(threads).toHaveLength(2);
      expect(threads.every((t) => t.resourceId === "user1")).toBe(true);
    });

    it("should list active threads", async () => {
      await threadManager.createThread("user1", "Active 1");
      const thread2 = await threadManager.createThread("user1", "Active 2");
      await threadManager.archiveThread(thread2.id);

      const activeThreads = await threadManager.listActiveThreads("user1");

      expect(activeThreads).toHaveLength(1);
      expect(activeThreads[0].title).toBe("Active 1");
    });
  });

  describe("Message Operations", () => {
    let threadId: string;

    beforeEach(async () => {
      const thread = await threadManager.createThread("user1", "Test");
      threadId = thread.id;
    });

    it("should add a message to thread", async () => {
      const message = await threadManager.addMessage(threadId, {
        role: "user",
        content: "Hello",
        metadata: { tag: "greeting" },
      });

      expect(message.id).toBeDefined();
      expect(message.threadId).toBe(threadId);
      expect(message.role).toBe("user");
      expect(message.content).toBe("Hello");
      expect(message.metadata).toEqual({ tag: "greeting" });
    });

    it("should add multiple messages", async () => {
      const messages = await threadManager.addMessages(threadId, [
        { role: "user", content: "Hello" },
        { role: "assistant", content: "Hi there!" },
        { role: "user", content: "How are you?" },
      ]);

      expect(messages).toHaveLength(3);
      expect(messages[0].content).toBe("Hello");
      expect(messages[1].content).toBe("Hi there!");
      expect(messages[2].content).toBe("How are you?");
    });

    it("should get message history", async () => {
      await threadManager.addMessage(threadId, {
        role: "user",
        content: "Msg 1",
      });
      await threadManager.addMessage(threadId, {
        role: "assistant",
        content: "Msg 2",
      });
      await threadManager.addMessage(threadId, {
        role: "user",
        content: "Msg 3",
      });

      const history = await threadManager.getMessageHistory(threadId);

      expect(history).toHaveLength(3);
      expect(history[0].content).toBe("Msg 1");
      expect(history[2].content).toBe("Msg 3");
    });

    it("should respect limit when getting message history", async () => {
      for (let i = 0; i < 10; i++) {
        await threadManager.addMessage(threadId, {
          role: "user",
          content: `Message ${i}`,
        });
      }

      const history = await threadManager.getMessageHistory(threadId, 5);

      expect(history).toHaveLength(5);
    });

    it("should get recent messages", async () => {
      await threadManager.addMessage(threadId, {
        role: "user",
        content: "Old",
      });
      await new Promise((resolve) => setTimeout(resolve, 10));

      await threadManager.addMessage(threadId, {
        role: "user",
        content: "Recent 1",
      });
      await threadManager.addMessage(threadId, {
        role: "user",
        content: "Recent 2",
      });

      const recent = await threadManager.getRecentMessages(threadId, 2);

      expect(recent).toHaveLength(2);
    });

    it("should clear thread messages", async () => {
      await threadManager.addMessage(threadId, {
        role: "user",
        content: "Msg 1",
      });
      await threadManager.addMessage(threadId, {
        role: "assistant",
        content: "Msg 2",
      });

      const count = await threadManager.clearMessages(threadId);
      expect(count).toBe(2);

      const history = await threadManager.getMessageHistory(threadId);
      expect(history).toHaveLength(0);
    });
  });

  describe("Thread Context", () => {
    it("should get thread context", async () => {
      const thread = await threadManager.createThread("user1", "Test");
      await threadManager.addMessage(thread.id, {
        role: "user",
        content: "Hello",
      });
      await threadManager.addMessage(thread.id, {
        role: "assistant",
        content: "Hi",
      });

      const context = await threadManager.getThreadContext(thread.id);

      expect(context.thread.id).toBe(thread.id);
      expect(context.messageCount).toBe(2);
      expect(context.lastMessageAt).toBeInstanceOf(Date);
      expect(context.messages).toHaveLength(2);
    });

    it("should return null context for non-existent thread", async () => {
      const context = await threadManager.getThreadContext("non-existent");
      expect(context).toBeNull();
    });

    it("should handle thread with no messages", async () => {
      const thread = await threadManager.createThread("user1", "Empty");
      const context = await threadManager.getThreadContext(thread.id);

      expect(context).not.toBeNull();
      expect(context?.messageCount).toBe(0);
      expect(context?.lastMessageAt).toBeUndefined();
      expect(context?.messages).toHaveLength(0);
    });
  });

  describe("Configuration", () => {
    it("should use custom default resource ID", async () => {
      const manager = new ThreadManager(storage, {
        defaultResourceId: "custom-resource",
      });

      const thread = await manager.createThread();
      expect(thread.resourceId).toBe("custom-resource");
    });

    it("should use custom default message limit", async () => {
      const manager = new ThreadManager(storage, {
        defaultMessageLimit: 5,
      });

      const thread = await manager.createThread("user1");
      for (let i = 0; i < 10; i++) {
        await manager.addMessage(thread.id, {
          role: "user",
          content: `Msg ${i}`,
        });
      }

      const result = await manager.getThreadWithMessages(thread.id);
      expect(result?.messages).toHaveLength(5);
    });

    it("should support auto-archive configuration", async () => {
      const manager = new ThreadManager(storage, {
        autoArchive: true,
        archiveThresholdMs: 1000, // 1 second
      });

      const thread = await manager.createThread("user1", "Test");
      expect(thread.status).toBe("active");

      // Auto-archive logic would need to be triggered separately
      // This test just verifies the configuration is accepted
    });
  });

  describe("Batch Operations", () => {
    it("should create multiple threads for same resource", async () => {
      const thread1 = await threadManager.createThread("user1", "Thread 1");
      const thread2 = await threadManager.createThread("user1", "Thread 2");
      const thread3 = await threadManager.createThread("user1", "Thread 3");

      const threads = await threadManager.getThreadsByResource("user1");

      expect(threads).toHaveLength(3);
      expect(threads.map((t) => t.id)).toContain(thread1.id);
      expect(threads.map((t) => t.id)).toContain(thread2.id);
      expect(threads.map((t) => t.id)).toContain(thread3.id);
    });

    it("should add many messages efficiently", async () => {
      const thread = await threadManager.createThread("user1", "Test");

      const inputs = Array.from({ length: 100 }, (_, i) => ({
        role: "user" as const,
        content: `Message ${i}`,
      }));

      const messages = await threadManager.addMessages(thread.id, inputs);

      expect(messages).toHaveLength(100);
    });
  });

  describe("Edge Cases", () => {
    it("should handle thread creation without title", async () => {
      const thread = await threadManager.createThread("user1");

      expect(thread.id).toBeDefined();
      expect(thread.resourceId).toBe("user1");
      expect(thread.title).toBeUndefined();
    });

    it("should handle message with empty content", async () => {
      const thread = await threadManager.createThread("user1", "Test");
      const message = await threadManager.addMessage(thread.id, {
        role: "user",
        content: "",
      });

      expect(message.content).toBe("");
    });

    it("should handle very long message content", async () => {
      const thread = await threadManager.createThread("user1", "Test");
      const longContent = "a".repeat(10000);

      const message = await threadManager.addMessage(thread.id, {
        role: "user",
        content: longContent,
      });

      expect(message.content).toBe(longContent);
    });

    it("should handle special characters in metadata", async () => {
      const thread = await threadManager.createThread("user1", "Test", {
        special: "!@#$%^&*()",
        unicode: "🎉🎊",
      });

      expect(thread.metadata?.special).toBe("!@#$%^&*()");
      expect(thread.metadata?.unicode).toBe("🎉🎊");
    });

    it("should handle concurrent message additions", async () => {
      const thread = await threadManager.createThread("user1", "Test");

      const promises = Array.from({ length: 10 }, (_, i) =>
        threadManager.addMessage(thread.id, {
          role: "user",
          content: `Concurrent ${i}`,
        }),
      );

      const messages = await Promise.all(promises);

      expect(messages).toHaveLength(10);
      expect(new Set(messages.map((m) => m.id)).size).toBe(10); // All unique IDs
    });
  });

  describe("Error Handling", () => {
    it("should handle adding message to non-existent thread", async () => {
      await expect(
        threadManager.addMessage("non-existent", {
          role: "user",
          content: "Test",
        }),
      ).rejects.toThrow();
    });

    it("should handle getting context for deleted thread", async () => {
      const thread = await threadManager.createThread("user1", "Test");
      await threadManager.deleteThread(thread.id);

      const context = await threadManager.getThreadContext(thread.id);
      expect(context).toBeNull();
    });

    it("should handle archiving non-existent thread", async () => {
      const result = await threadManager.archiveThread("non-existent");
      expect(result).toBeNull();
    });
  });

  describe("Message Filtering", () => {
    let threadId: string;

    beforeEach(async () => {
      const thread = await threadManager.createThread("user1", "Test");
      threadId = thread.id;

      await threadManager.addMessages(threadId, [
        { role: "user", content: "User message 1" },
        { role: "assistant", content: "Assistant message 1" },
        { role: "user", content: "User message 2" },
        { role: "assistant", content: "Assistant message 2" },
        { role: "system", content: "System message" },
      ]);
    });

    it("should get messages by role (if implemented)", async () => {
      const messages = await threadManager.getMessageHistory(threadId);

      const userMessages = messages.filter((m) => m.role === "user");
      const assistantMessages = messages.filter((m) => m.role === "assistant");
      const systemMessages = messages.filter((m) => m.role === "system");

      expect(userMessages).toHaveLength(2);
      expect(assistantMessages).toHaveLength(2);
      expect(systemMessages).toHaveLength(1);
    });
  });
});
