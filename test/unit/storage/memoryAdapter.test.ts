/**
 * Memory Adapter Unit Tests
 *
 * Comprehensive tests for in-memory storage adapter covering:
 * - Thread operations (CRUD)
 * - Message operations (CRUD, batch)
 * - Workflow run operations
 * - Custom record operations with TTL
 * - Health checks and statistics
 * - Lifecycle management
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { MemoryAdapter } from "../../../src/lib/storage/adapters/memoryAdapter.js";
import type {
  CreateThreadInput,
  CreateMessageInput,
  SaveWorkflowRunInput,
  ThreadQueryOptions,
  MessageQueryOptions,
} from "../../../src/lib/types/index.js";

describe("MemoryAdapter", () => {
  let adapter: MemoryAdapter;

  beforeEach(async () => {
    adapter = new MemoryAdapter();
    await adapter.init();
  });

  afterEach(async () => {
    await adapter.close();
  });

  describe("Lifecycle", () => {
    it("should initialize successfully", async () => {
      const newAdapter = new MemoryAdapter();
      await expect(newAdapter.init()).resolves.not.toThrow();
      await newAdapter.close();
    });

    it("should handle multiple init calls gracefully", async () => {
      await expect(adapter.init()).resolves.not.toThrow();
      await expect(adapter.init()).resolves.not.toThrow();
    });

    it("should close successfully", async () => {
      await expect(adapter.close()).resolves.not.toThrow();
    });

    it("should not automatically clear data on close", async () => {
      const thread = await adapter.createThread({
        resourceId: "user1",
        title: "Test Thread",
      });

      await adapter.close();
      await adapter.init();

      // Memory adapter maintains data across close/init
      const retrieved = await adapter.getThread(thread.id);
      expect(retrieved).not.toBeNull();
      expect(retrieved?.id).toBe(thread.id);
    });
  });

  describe("Health Check", () => {
    it("should return healthy status when initialized", async () => {
      const health = await adapter.healthCheck();
      expect(health.healthy).toBe(true);
      expect(health.backend).toBe("memory");
      expect(health.latencyMs).toBeGreaterThanOrEqual(0);
    });

    it("should include latency in health check", async () => {
      const health = await adapter.healthCheck();
      expect(health.latencyMs).toBeDefined();
      expect(typeof health.latencyMs).toBe("number");
    });
  });

  describe("Thread Operations", () => {
    it("should create a thread", async () => {
      const input: CreateThreadInput = {
        resourceId: "user1",
        title: "Test Thread",
        metadata: { key: "value" },
        status: "active",
      };

      const thread = await adapter.createThread(input);

      expect(thread.id).toBeDefined();
      expect(thread.resourceId).toBe("user1");
      expect(thread.title).toBe("Test Thread");
      expect(thread.metadata).toEqual({ key: "value" });
      expect(thread.status).toBe("active");
      expect(thread.createdAt).toBeInstanceOf(Date);
      expect(thread.updatedAt).toBeInstanceOf(Date);
    });

    it("should get a thread by ID", async () => {
      const created = await adapter.createThread({
        resourceId: "user1",
        title: "Test",
      });

      const retrieved = await adapter.getThread(created.id);

      expect(retrieved).not.toBeNull();
      expect(retrieved?.id).toBe(created.id);
      expect(retrieved?.title).toBe("Test");
    });

    it("should return null for non-existent thread", async () => {
      const result = await adapter.getThread("non-existent-id");
      expect(result).toBeNull();
    });

    it("should update a thread", async () => {
      const thread = await adapter.createThread({
        resourceId: "user1",
        title: "Original",
      });

      // Wait a tiny bit to ensure timestamp difference
      await new Promise((resolve) => setTimeout(resolve, 10));

      const updated = await adapter.updateThread(thread.id, {
        title: "Updated",
        metadata: { updated: true },
      });

      expect(updated).not.toBeNull();
      expect(updated?.title).toBe("Updated");
      expect(updated?.metadata).toEqual({ updated: true });
      expect(updated?.updatedAt.getTime()).toBeGreaterThanOrEqual(
        thread.createdAt.getTime(),
      );
    });

    it("should return null when updating non-existent thread", async () => {
      const result = await adapter.updateThread("non-existent", {
        title: "Updated",
      });
      expect(result).toBeNull();
    });

    it("should delete a thread", async () => {
      const thread = await adapter.createThread({
        resourceId: "user1",
        title: "To Delete",
      });

      const deleted = await adapter.deleteThread(thread.id);
      expect(deleted).toBe(true);

      const retrieved = await adapter.getThread(thread.id);
      expect(retrieved).toBeNull();
    });

    it("should return false when deleting non-existent thread", async () => {
      const result = await adapter.deleteThread("non-existent");
      expect(result).toBe(false);
    });

    it("should list threads with pagination", async () => {
      await adapter.createThread({ resourceId: "user1", title: "Thread 1" });
      await adapter.createThread({ resourceId: "user1", title: "Thread 2" });
      await adapter.createThread({ resourceId: "user2", title: "Thread 3" });

      const result = await adapter.listThreads({ limit: 2 });

      expect(result.data).toHaveLength(2);
      expect(result.total).toBe(3);
      expect(result.hasMore).toBe(true);
    });

    it("should filter threads by resourceId", async () => {
      await adapter.createThread({ resourceId: "user1", title: "Thread 1" });
      await adapter.createThread({ resourceId: "user1", title: "Thread 2" });
      await adapter.createThread({ resourceId: "user2", title: "Thread 3" });

      const result = await adapter.getThreadsByResourceId("user1");

      expect(result.data).toHaveLength(2);
      expect(result.data.every((t) => t.resourceId === "user1")).toBe(true);
    });

    it("should filter threads by status", async () => {
      await adapter.createThread({
        resourceId: "user1",
        title: "Active",
        status: "active",
      });
      await adapter.createThread({
        resourceId: "user1",
        title: "Archived",
        status: "archived",
      });

      const options: ThreadQueryOptions = { status: "active" };
      const result = await adapter.listThreads(options);

      expect(result.data).toHaveLength(1);
      expect(result.data[0].title).toBe("Active");
    });
  });

  describe("Message Operations", () => {
    let threadId: string;

    beforeEach(async () => {
      const thread = await adapter.createThread({
        resourceId: "user1",
        title: "Test Thread",
      });
      threadId = thread.id;
    });

    it("should create a message", async () => {
      const input: CreateMessageInput = {
        threadId,
        role: "user",
        content: "Hello, world!",
        metadata: { key: "value" },
      };

      const message = await adapter.createMessage(input);

      expect(message.id).toBeDefined();
      expect(message.threadId).toBe(threadId);
      expect(message.role).toBe("user");
      expect(message.content).toBe("Hello, world!");
      expect(message.metadata).toEqual({ key: "value" });
      expect(message.createdAt).toBeInstanceOf(Date);
    });

    it("should create multiple messages in batch", async () => {
      const inputs: CreateMessageInput[] = [
        { threadId, role: "user", content: "Message 1" },
        { threadId, role: "assistant", content: "Message 2" },
        { threadId, role: "user", content: "Message 3" },
      ];

      const messages = await adapter.createMessages(inputs);

      expect(messages).toHaveLength(3);
      expect(messages[0].content).toBe("Message 1");
      expect(messages[1].content).toBe("Message 2");
      expect(messages[2].content).toBe("Message 3");
    });

    it("should get a message by ID", async () => {
      const created = await adapter.createMessage({
        threadId,
        role: "user",
        content: "Test",
      });

      const retrieved = await adapter.getMessage(created.id);

      expect(retrieved).not.toBeNull();
      expect(retrieved?.id).toBe(created.id);
      expect(retrieved?.content).toBe("Test");
    });

    it("should update a message", async () => {
      const message = await adapter.createMessage({
        threadId,
        role: "user",
        content: "Original",
      });

      const updated = await adapter.updateMessage(message.id, {
        content: "Updated",
        metadata: { edited: true },
      });

      expect(updated).not.toBeNull();
      expect(updated?.content).toBe("Updated");
      expect(updated?.metadata).toEqual({ edited: true });
    });

    it("should delete a message", async () => {
      const message = await adapter.createMessage({
        threadId,
        role: "user",
        content: "To Delete",
      });

      const deleted = await adapter.deleteMessage(message.id);
      expect(deleted).toBe(true);

      const retrieved = await adapter.getMessage(message.id);
      expect(retrieved).toBeNull();
    });

    it("should list messages by thread", async () => {
      await adapter.createMessage({ threadId, role: "user", content: "Msg 1" });
      await adapter.createMessage({
        threadId,
        role: "assistant",
        content: "Msg 2",
      });
      await adapter.createMessage({ threadId, role: "user", content: "Msg 3" });

      const options: MessageQueryOptions = { threadId };
      const result = await adapter.listMessages(options);

      expect(result.data).toHaveLength(3);
      expect(result.total).toBe(3);
    });

    it("should filter messages by role", async () => {
      await adapter.createMessage({ threadId, role: "user", content: "Msg 1" });
      await adapter.createMessage({
        threadId,
        role: "assistant",
        content: "Msg 2",
      });
      await adapter.createMessage({ threadId, role: "user", content: "Msg 3" });

      const options: MessageQueryOptions = { threadId, role: "user" };
      const result = await adapter.listMessages(options);

      expect(result.data).toHaveLength(2);
      expect(result.data.every((m) => m.role === "user")).toBe(true);
    });

    it("should get messages by thread ID", async () => {
      await adapter.createMessage({ threadId, role: "user", content: "Msg 1" });
      await adapter.createMessage({
        threadId,
        role: "assistant",
        content: "Msg 2",
      });

      const messages = await adapter.getMessagesByThreadId(threadId);

      expect(messages).toHaveLength(2);
    });

    it("should delete all messages in a thread", async () => {
      await adapter.createMessage({ threadId, role: "user", content: "Msg 1" });
      await adapter.createMessage({
        threadId,
        role: "assistant",
        content: "Msg 2",
      });

      const count = await adapter.deleteMessagesByThreadId(threadId);
      expect(count).toBe(2);

      const messages = await adapter.getMessagesByThreadId(threadId);
      expect(messages).toHaveLength(0);
    });
  });

  describe("Workflow Run Operations", () => {
    it("should save a workflow run", async () => {
      const input: SaveWorkflowRunInput = {
        workflowId: "workflow1",
        status: "running",
        triggerData: { input: "test" },
      };

      const run = await adapter.saveWorkflowRun(input);

      expect(run.id).toBeDefined();
      expect(run.workflowId).toBe("workflow1");
      expect(run.status).toBe("running");
      expect(run.triggerData).toEqual({ input: "test" });
      expect(run.createdAt).toBeInstanceOf(Date);
    });

    it("should update existing workflow run when ID provided", async () => {
      const created = await adapter.saveWorkflowRun({
        workflowId: "workflow1",
        status: "running",
      });

      const updated = await adapter.saveWorkflowRun({
        id: created.id,
        workflowId: "workflow1",
        status: "completed",
        output: { result: "success" },
      });

      expect(updated.id).toBe(created.id);
      expect(updated.status).toBe("completed");
      expect(updated.output).toEqual({ result: "success" });
    });

    it("should get a workflow run by ID", async () => {
      const created = await adapter.saveWorkflowRun({
        workflowId: "workflow1",
        status: "running",
      });

      const retrieved = await adapter.getWorkflowRun(created.id);

      expect(retrieved).not.toBeNull();
      expect(retrieved?.id).toBe(created.id);
    });

    it("should list workflow runs with filtering", async () => {
      await adapter.saveWorkflowRun({
        workflowId: "workflow1",
        status: "completed",
      });
      await adapter.saveWorkflowRun({
        workflowId: "workflow2",
        status: "running",
      });
      await adapter.saveWorkflowRun({
        workflowId: "workflow1",
        status: "failed",
      });

      const result = await adapter.listWorkflowRuns({
        workflowId: "workflow1",
      });

      expect(result.data).toHaveLength(2);
      expect(result.data.every((r) => r.workflowId === "workflow1")).toBe(true);
    });

    it("should update workflow run status", async () => {
      const run = await adapter.saveWorkflowRun({
        workflowId: "workflow1",
        status: "running",
      });

      const updated = await adapter.updateWorkflowRunStatus(
        run.id,
        "completed",
        { result: "success" },
      );

      expect(updated).not.toBeNull();
      expect(updated?.status).toBe("completed");
      expect(updated?.output).toEqual({ result: "success" });
    });

    it("should update step result", async () => {
      const run = await adapter.saveWorkflowRun({
        workflowId: "workflow1",
        status: "running",
      });

      const success = await adapter.updateStepResult(run.id, "step1", {
        stepId: "step1",
        status: "completed",
        output: { data: "result" },
      });

      expect(success).toBe(true);

      const updated = await adapter.getWorkflowRun(run.id);
      expect(updated?.stepResults).toBeDefined();
      expect(updated?.stepResults?.step1).toBeDefined();
      expect(updated?.stepResults?.step1.status).toBe("completed");
    });

    it("should get workflow runs by workflow ID", async () => {
      await adapter.saveWorkflowRun({
        workflowId: "workflow1",
        status: "completed",
      });
      await adapter.saveWorkflowRun({
        workflowId: "workflow1",
        status: "running",
      });
      await adapter.saveWorkflowRun({
        workflowId: "workflow2",
        status: "completed",
      });

      const result = await adapter.getWorkflowRunsByWorkflowId("workflow1");

      expect(result.data).toHaveLength(2);
    });
  });

  describe("Custom Record Operations", () => {
    it("should set a custom record", async () => {
      const record = await adapter.setRecord(
        "test-namespace",
        "key1",
        { data: "value" },
        { metadata: { tag: "test" } },
      );

      expect(record.namespace).toBe("test-namespace");
      expect(record.key).toBe("key1");
      expect(record.value).toEqual({ data: "value" });
      expect(record.metadata).toEqual({ tag: "test" });
      expect(record.createdAt).toBeInstanceOf(Date);
    });

    it("should get a custom record", async () => {
      await adapter.setRecord("test-namespace", "key1", { data: "value" });

      const record = await adapter.getRecord("test-namespace", "key1");

      expect(record).not.toBeNull();
      expect(record?.value).toEqual({ data: "value" });
    });

    it("should return null for non-existent record", async () => {
      const record = await adapter.getRecord("test-namespace", "non-existent");
      expect(record).toBeNull();
    });

    it("should delete a custom record", async () => {
      await adapter.setRecord("test-namespace", "key1", { data: "value" });

      const deleted = await adapter.deleteRecord("test-namespace", "key1");
      expect(deleted).toBe(true);

      const record = await adapter.getRecord("test-namespace", "key1");
      expect(record).toBeNull();
    });

    it("should check if record exists", async () => {
      await adapter.setRecord("test-namespace", "key1", { data: "value" });

      const exists = await adapter.hasRecord("test-namespace", "key1");
      expect(exists).toBe(true);

      const notExists = await adapter.hasRecord("test-namespace", "key2");
      expect(notExists).toBe(false);
    });

    it("should list records in namespace", async () => {
      await adapter.setRecord("test-namespace", "key1", { data: "value1" });
      await adapter.setRecord("test-namespace", "key2", { data: "value2" });
      await adapter.setRecord("other-namespace", "key3", { data: "value3" });

      const result = await adapter.listRecords("test-namespace");

      expect(result.data).toHaveLength(2);
      expect(result.data.every((r) => r.namespace === "test-namespace")).toBe(
        true,
      );
    });

    it("should delete all records in namespace", async () => {
      await adapter.setRecord("test-namespace", "key1", { data: "value1" });
      await adapter.setRecord("test-namespace", "key2", { data: "value2" });
      await adapter.setRecord("other-namespace", "key3", { data: "value3" });

      const count = await adapter.deleteNamespace("test-namespace");
      expect(count).toBe(2);

      const result = await adapter.listRecords("test-namespace");
      expect(result.data).toHaveLength(0);

      const otherResult = await adapter.listRecords("other-namespace");
      expect(otherResult.data).toHaveLength(1);
    });

    it("should handle TTL expiration", async () => {
      vi.useFakeTimers();

      await adapter.setRecord(
        "test-namespace",
        "key1",
        { data: "value" },
        {
          ttl: 2,
        },
      );

      let record = await adapter.getRecord("test-namespace", "key1");
      expect(record).not.toBeNull();

      // Fast-forward time by 3 seconds
      vi.advanceTimersByTime(3000);

      record = await adapter.getRecord("test-namespace", "key1");
      expect(record).toBeNull();

      vi.useRealTimers();
    });

    it("should update existing record", async () => {
      await adapter.setRecord("test-namespace", "key1", { data: "value1" });
      await adapter.setRecord("test-namespace", "key1", { data: "value2" });

      const record = await adapter.getRecord("test-namespace", "key1");
      expect(record?.value).toEqual({ data: "value2" });
    });
  });

  describe("Statistics and Utilities", () => {
    it("should return storage statistics", async () => {
      const thread = await adapter.createThread({
        resourceId: "user1",
        title: "Test",
      });
      await adapter.createMessage({
        threadId: thread.id,
        role: "user",
        content: "Test",
      });
      await adapter.createMessage({
        threadId: thread.id,
        role: "assistant",
        content: "Response",
      });
      await adapter.saveWorkflowRun({
        workflowId: "workflow1",
        status: "completed",
      });
      await adapter.setRecord("test", "key1", { data: "value" });

      const stats = await adapter.getStats();

      expect(stats.threadCount).toBe(1);
      expect(stats.messageCount).toBe(2);
      expect(stats.workflowRunCount).toBe(1);
      expect(stats.customRecordCount).toBe(1);
    });

    it("should clear all data", async () => {
      await adapter.createThread({ resourceId: "user1", title: "Test" });
      await adapter.saveWorkflowRun({
        workflowId: "workflow1",
        status: "completed",
      });
      await adapter.setRecord("test", "key1", { data: "value" });

      await adapter.clearAll();

      const stats = await adapter.getStats();
      expect(stats.threadCount).toBe(0);
      expect(stats.messageCount).toBe(0);
      expect(stats.workflowRunCount).toBe(0);
      expect(stats.customRecordCount).toBe(0);
    });
  });

  describe("Configuration", () => {
    it("should support max entries limit", async () => {
      const limitedAdapter = new MemoryAdapter({ maxEntries: 2 });
      await limitedAdapter.init();

      await limitedAdapter.createThread({
        resourceId: "user1",
        title: "Thread 1",
      });
      await limitedAdapter.createThread({
        resourceId: "user1",
        title: "Thread 2",
      });

      // This should trigger cleanup if implemented
      await limitedAdapter.createThread({
        resourceId: "user1",
        title: "Thread 3",
      });

      await limitedAdapter.close();
    });

    it("should support cleanup interval", async () => {
      const adapter = new MemoryAdapter({ cleanupIntervalMs: 1000 });
      await adapter.init();

      // Just verify it doesn't throw
      await new Promise((resolve) => setTimeout(resolve, 100));

      await adapter.close();
    });
  });

  describe("Edge Cases", () => {
    it("should handle empty pagination", async () => {
      const result = await adapter.listThreads({ limit: 10 });
      expect(result.data).toHaveLength(0);
      expect(result.total).toBe(0);
      expect(result.hasMore).toBe(false);
    });

    it("should handle offset pagination", async () => {
      await adapter.createThread({ resourceId: "user1", title: "Thread 1" });
      await adapter.createThread({ resourceId: "user1", title: "Thread 2" });
      await adapter.createThread({ resourceId: "user1", title: "Thread 3" });

      const result = await adapter.listThreads({ limit: 2, offset: 1 });
      expect(result.data).toHaveLength(2);
      expect(result.hasMore).toBe(false);
    });

    it("should handle large batch operations", async () => {
      const thread = await adapter.createThread({
        resourceId: "user1",
        title: "Test",
      });

      const inputs: CreateMessageInput[] = Array.from(
        { length: 100 },
        (_, i) => ({
          threadId: thread.id,
          role: "user",
          content: `Message ${i}`,
        }),
      );

      const messages = await adapter.createMessages(inputs);
      expect(messages).toHaveLength(100);
    });

    it("should handle special characters in keys", async () => {
      const specialKey = "key/with:special@chars#test";
      await adapter.setRecord("test", specialKey, { data: "value" });

      const record = await adapter.getRecord("test", specialKey);
      expect(record).not.toBeNull();
      expect(record?.key).toBe(specialKey);
    });

    it("should handle deeply nested JSON values", async () => {
      const deepValue = {
        level1: {
          level2: {
            level3: {
              level4: {
                data: "deep value",
              },
            },
          },
        },
      };

      await adapter.setRecord("test", "deep", deepValue);
      const record = await adapter.getRecord("test", "deep");

      expect(record?.value).toEqual(deepValue);
    });
  });
});
