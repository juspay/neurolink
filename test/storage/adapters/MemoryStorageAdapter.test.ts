/**
 * MemoryStorageAdapter Tests
 *
 * Comprehensive test suite for the MemoryStorageAdapter class.
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  MemoryStorageAdapter,
  createMemoryStorage,
} from "../../../src/lib/storage/adapters/MemoryStorageAdapter.js";
import type {
  ThreadRecord,
  MessageRecord,
} from "../../../src/lib/types/index.js";

describe("MemoryStorageAdapter", () => {
  let storage: MemoryStorageAdapter;

  beforeEach(async () => {
    storage = new MemoryStorageAdapter();
    await storage.init();
  });

  afterEach(async () => {
    await storage.close();
  });

  describe("Initialization", () => {
    it("should initialize successfully", async () => {
      const newStorage = new MemoryStorageAdapter();
      await newStorage.init();
      expect(await newStorage.healthCheck()).toBe(true);
      await newStorage.close();
    });

    it("should have memory type", () => {
      expect(storage.type).toBe("memory");
    });

    it("should pass health check after initialization", async () => {
      expect(await storage.healthCheck()).toBe(true);
    });
  });

  describe("Thread Operations", () => {
    it("should create a thread", async () => {
      const thread = await storage.createThread({
        id: "thread-1",
        resourceId: "user-1",
        title: "Test Thread",
      });

      expect(thread.id).toBe("thread-1");
      expect(thread.resourceId).toBe("user-1");
      expect(thread.title).toBe("Test Thread");
      expect(thread.createdAt).toBeInstanceOf(Date);
    });

    it("should get a thread by ID", async () => {
      await storage.createThread({
        id: "thread-1",
        resourceId: "user-1",
      });

      const thread = await storage.getThread("thread-1");
      expect(thread).toBeDefined();
      expect(thread!.id).toBe("thread-1");
    });

    it("should return undefined for non-existent thread", async () => {
      const thread = await storage.getThread("nonexistent");
      expect(thread).toBeUndefined();
    });

    it("should update a thread", async () => {
      await storage.createThread({
        id: "thread-1",
        resourceId: "user-1",
        title: "Original",
      });

      await storage.updateThread("thread-1", {
        title: "Updated",
        metadata: { key: "value" },
      });

      const thread = await storage.getThread("thread-1");
      expect(thread!.title).toBe("Updated");
      expect(thread!.metadata).toEqual({ key: "value" });
    });

    it("should delete a thread", async () => {
      await storage.createThread({
        id: "thread-1",
        resourceId: "user-1",
      });

      await storage.deleteThread("thread-1");

      const thread = await storage.getThread("thread-1");
      expect(thread).toBeUndefined();
    });

    it("should list threads with filtering", async () => {
      await storage.createThread({ id: "thread-1", resourceId: "user-1" });
      await storage.createThread({ id: "thread-2", resourceId: "user-1" });
      await storage.createThread({ id: "thread-3", resourceId: "user-2" });

      const threads = await storage.listThreads({
        filter: { resourceId: { eq: "user-1" } },
      });

      expect(threads.data).toHaveLength(2);
      expect(threads.data.every((t) => t.resourceId === "user-1")).toBe(true);
    });

    it("should list threads with pagination", async () => {
      for (let i = 1; i <= 10; i++) {
        await storage.createThread({
          id: `thread-${i}`,
          resourceId: "user-1",
        });
      }

      const page1 = await storage.listThreads({
        pagination: { limit: 5 },
      });

      expect(page1.data).toHaveLength(5);
      expect(page1.hasMore).toBe(true);
      expect(page1.cursor).toBeDefined();

      const page2 = await storage.listThreads({
        pagination: { limit: 5, cursor: page1.cursor },
      });

      expect(page2.data).toHaveLength(5);
      expect(page2.hasMore).toBe(false);
    });

    it("should list threads with sorting", async () => {
      await storage.createThread({
        id: "thread-1",
        resourceId: "user-1",
        title: "C",
      });
      await storage.createThread({
        id: "thread-2",
        resourceId: "user-1",
        title: "A",
      });
      await storage.createThread({
        id: "thread-3",
        resourceId: "user-1",
        title: "B",
      });

      const threads = await storage.listThreads({
        sort: [{ field: "title", direction: "asc" }],
      });

      expect(threads.data.map((t) => t.title)).toEqual(["A", "B", "C"]);
    });
  });

  describe("Message Operations", () => {
    beforeEach(async () => {
      await storage.createThread({ id: "thread-1", resourceId: "user-1" });
    });

    it("should create a message", async () => {
      const message = await storage.createMessage({
        id: "msg-1",
        threadId: "thread-1",
        role: "user",
        content: "Hello",
      });

      expect(message.id).toBe("msg-1");
      expect(message.threadId).toBe("thread-1");
      expect(message.role).toBe("user");
      expect(message.content).toBe("Hello");
    });

    it("should get a message by ID", async () => {
      await storage.createMessage({
        id: "msg-1",
        threadId: "thread-1",
        role: "user",
        content: "Hello",
      });

      const message = await storage.getMessage("msg-1");
      expect(message).toBeDefined();
      expect(message!.content).toBe("Hello");
    });

    it("should get messages by thread", async () => {
      await storage.createMessage({
        id: "msg-1",
        threadId: "thread-1",
        role: "user",
        content: "1",
      });
      await storage.createMessage({
        id: "msg-2",
        threadId: "thread-1",
        role: "assistant",
        content: "2",
      });

      const messages = await storage.getMessagesByThread("thread-1");
      expect(messages.data).toHaveLength(2);
    });

    it("should delete a message", async () => {
      await storage.createMessage({
        id: "msg-1",
        threadId: "thread-1",
        role: "user",
        content: "Hello",
      });

      await storage.deleteMessage("msg-1");

      const message = await storage.getMessage("msg-1");
      expect(message).toBeUndefined();
    });

    it("should update a message", async () => {
      await storage.createMessage({
        id: "msg-1",
        threadId: "thread-1",
        role: "user",
        content: "Hello",
      });

      await storage.updateMessage("msg-1", {
        content: "Updated",
        metadata: { edited: true },
      });

      const message = await storage.getMessage("msg-1");
      expect(message!.content).toBe("Updated");
      expect(message!.metadata).toEqual({ edited: true });
    });

    it("should list messages with filtering", async () => {
      await storage.createMessage({
        id: "msg-1",
        threadId: "thread-1",
        role: "user",
        content: "1",
      });
      await storage.createMessage({
        id: "msg-2",
        threadId: "thread-1",
        role: "assistant",
        content: "2",
      });
      await storage.createMessage({
        id: "msg-3",
        threadId: "thread-1",
        role: "user",
        content: "3",
      });

      const messages = await storage.getMessagesByThread("thread-1", {
        filter: { role: { eq: "user" } },
      });

      expect(messages.data).toHaveLength(2);
    });
  });

  describe("Workflow Run Operations", () => {
    it("should create a workflow run", async () => {
      const run = await storage.createWorkflowRun({
        id: "run-1",
        workflowId: "workflow-1",
        status: "pending",
      });

      expect(run.id).toBe("run-1");
      expect(run.workflowId).toBe("workflow-1");
      expect(run.status).toBe("pending");
    });

    it("should get a workflow run by ID", async () => {
      await storage.createWorkflowRun({
        id: "run-1",
        workflowId: "workflow-1",
        status: "pending",
      });

      const run = await storage.getWorkflowRun("run-1");
      expect(run).toBeDefined();
      expect(run!.workflowId).toBe("workflow-1");
    });

    it("should update workflow run status", async () => {
      await storage.createWorkflowRun({
        id: "run-1",
        workflowId: "workflow-1",
        status: "pending",
      });

      await storage.updateWorkflowRun("run-1", {
        status: "completed",
        result: { success: true },
      });

      const run = await storage.getWorkflowRun("run-1");
      expect(run!.status).toBe("completed");
      expect(run!.result).toEqual({ success: true });
    });

    it("should list workflow runs by workflow ID", async () => {
      await storage.createWorkflowRun({
        id: "run-1",
        workflowId: "workflow-1",
        status: "completed",
      });
      await storage.createWorkflowRun({
        id: "run-2",
        workflowId: "workflow-1",
        status: "pending",
      });
      await storage.createWorkflowRun({
        id: "run-3",
        workflowId: "workflow-2",
        status: "completed",
      });

      const runs = await storage.listWorkflowRuns({
        filter: { workflowId: { eq: "workflow-1" } },
      });

      expect(runs.data).toHaveLength(2);
    });
  });

  describe("Custom Record Operations", () => {
    it("should set and get a record", async () => {
      await storage.setRecord("namespace", "key1", { data: "value" });

      const record = await storage.getRecord("namespace", "key1");
      expect(record).toBeDefined();
      expect(record!.value).toEqual({ data: "value" });
    });

    it("should update an existing record", async () => {
      await storage.setRecord("namespace", "key1", { data: "original" });
      await storage.setRecord("namespace", "key1", { data: "updated" });

      const record = await storage.getRecord("namespace", "key1");
      expect(record!.value).toEqual({ data: "updated" });
    });

    it("should delete a record", async () => {
      await storage.setRecord("namespace", "key1", { data: "value" });
      await storage.deleteRecord("namespace", "key1");

      const record = await storage.getRecord("namespace", "key1");
      expect(record).toBeUndefined();
    });

    it("should list records by namespace", async () => {
      await storage.setRecord("namespace1", "key1", { data: 1 });
      await storage.setRecord("namespace1", "key2", { data: 2 });
      await storage.setRecord("namespace2", "key3", { data: 3 });

      const records = await storage.listRecords("namespace1");
      expect(records.data).toHaveLength(2);
    });

    it("should clear namespace records", async () => {
      await storage.setRecord("namespace1", "key1", { data: 1 });
      await storage.setRecord("namespace1", "key2", { data: 2 });

      await storage.clearNamespace("namespace1");

      const records = await storage.listRecords("namespace1");
      expect(records.data).toHaveLength(0);
    });
  });

  describe("LRU Eviction", () => {
    it("should evict oldest entries when maxSize is exceeded", async () => {
      const limitedStorage = new MemoryStorageAdapter({ maxSize: 3 });
      await limitedStorage.init();

      await limitedStorage.setRecord("ns", "key1", { data: 1 });
      await limitedStorage.setRecord("ns", "key2", { data: 2 });
      await limitedStorage.setRecord("ns", "key3", { data: 3 });
      await limitedStorage.setRecord("ns", "key4", { data: 4 });

      // key1 should be evicted (LRU)
      const record = await limitedStorage.getRecord("ns", "key1");
      expect(record).toBeUndefined();

      // key4 should exist
      const key4 = await limitedStorage.getRecord("ns", "key4");
      expect(key4).toBeDefined();

      await limitedStorage.close();
    });
  });

  describe("Query Operators", () => {
    beforeEach(async () => {
      await storage.createThread({
        id: "t1",
        resourceId: "user-1",
        title: "Alpha",
      });
      await storage.createThread({
        id: "t2",
        resourceId: "user-2",
        title: "Beta",
      });
      await storage.createThread({
        id: "t3",
        resourceId: "user-1",
        title: "Gamma",
      });
    });

    it("should filter with eq operator", async () => {
      const result = await storage.listThreads({
        filter: { resourceId: { eq: "user-1" } },
      });
      expect(result.data).toHaveLength(2);
    });

    it("should filter with ne operator", async () => {
      const result = await storage.listThreads({
        filter: { resourceId: { ne: "user-1" } },
      });
      expect(result.data).toHaveLength(1);
    });

    it("should filter with in operator", async () => {
      const result = await storage.listThreads({
        filter: { title: { in: ["Alpha", "Beta"] } },
      });
      expect(result.data).toHaveLength(2);
    });

    it("should filter with contains operator", async () => {
      const result = await storage.listThreads({
        filter: { title: { contains: "a" } },
      });
      expect(result.data).toHaveLength(3); // All contain 'a'
    });

    it("should filter with startsWith operator", async () => {
      const result = await storage.listThreads({
        filter: { title: { startsWith: "A" } },
      });
      expect(result.data).toHaveLength(1);
    });
  });

  describe("Factory Function", () => {
    it("should create storage using createMemoryStorage", async () => {
      const memStorage = await createMemoryStorage();
      expect(memStorage.type).toBe("memory");
      await memStorage.close();
    });

    it("should create storage with config options", async () => {
      const memStorage = await createMemoryStorage({ maxSize: 100 });
      expect(memStorage.type).toBe("memory");
      await memStorage.close();
    });
  });
});
