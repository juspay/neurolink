/**
 * RedisStorageAdapter Tests
 *
 * Comprehensive test suite for the RedisStorageAdapter class.
 * Note: These tests require a Redis server running on localhost:6379
 * or use mocking for unit tests.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { RedisStorageAdapter } from "../../../src/lib/storage/adapters/RedisStorageAdapter.js";

// Mock ioredis
vi.mock("ioredis", () => {
  const mockRedis = vi.fn(() => ({
    get: vi.fn(),
    set: vi.fn(),
    del: vi.fn(),
    hget: vi.fn(),
    hset: vi.fn(),
    hdel: vi.fn(),
    hgetall: vi.fn(),
    smembers: vi.fn(),
    sadd: vi.fn(),
    srem: vi.fn(),
    keys: vi.fn(),
    quit: vi.fn(),
    ping: vi.fn().mockResolvedValue("PONG"),
    on: vi.fn(),
  }));

  return { default: mockRedis, Redis: mockRedis };
});

describe("RedisStorageAdapter", () => {
  let storage: RedisStorageAdapter;
  let mockClient: Record<string, ReturnType<typeof vi.fn>>;

  beforeEach(async () => {
    storage = new RedisStorageAdapter({
      type: "redis",
      url: "redis://localhost:6379",
    });

    // Access the mock client
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const internalStorage = storage as any;
    await storage.init();
    mockClient = internalStorage.client;
  });

  afterEach(async () => {
    await storage.close();
    vi.clearAllMocks();
  });

  describe("Initialization", () => {
    it("should initialize successfully", async () => {
      expect(await storage.healthCheck()).toBe(true);
    });

    it("should have redis type", () => {
      expect(storage.type).toBe("redis");
    });
  });

  describe("Thread Operations", () => {
    it("should create a thread", async () => {
      mockClient.hset.mockResolvedValue(1);
      mockClient.sadd.mockResolvedValue(1);

      const thread = await storage.createThread({
        id: "thread-1",
        resourceId: "user-1",
        title: "Test Thread",
      });

      expect(thread.id).toBe("thread-1");
      expect(thread.resourceId).toBe("user-1");
      expect(mockClient.hset).toHaveBeenCalled();
    });

    it("should get a thread by ID", async () => {
      const threadData = JSON.stringify({
        id: "thread-1",
        resourceId: "user-1",
        title: "Test",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
      mockClient.hget.mockResolvedValue(threadData);

      const thread = await storage.getThread("thread-1");

      expect(thread).toBeDefined();
      expect(thread!.id).toBe("thread-1");
    });

    it("should return undefined for non-existent thread", async () => {
      mockClient.hget.mockResolvedValue(null);

      const thread = await storage.getThread("nonexistent");
      expect(thread).toBeUndefined();
    });

    it("should update a thread", async () => {
      const existingThread = JSON.stringify({
        id: "thread-1",
        resourceId: "user-1",
        title: "Original",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
      mockClient.hget.mockResolvedValue(existingThread);
      mockClient.hset.mockResolvedValue(1);

      await storage.updateThread("thread-1", { title: "Updated" });

      expect(mockClient.hset).toHaveBeenCalled();
    });

    it("should delete a thread", async () => {
      mockClient.hdel.mockResolvedValue(1);
      mockClient.srem.mockResolvedValue(1);

      await storage.deleteThread("thread-1");

      expect(mockClient.hdel).toHaveBeenCalled();
    });
  });

  describe("Message Operations", () => {
    it("should create a message", async () => {
      mockClient.hset.mockResolvedValue(1);
      mockClient.sadd.mockResolvedValue(1);

      const message = await storage.createMessage({
        id: "msg-1",
        threadId: "thread-1",
        role: "user",
        content: "Hello",
      });

      expect(message.id).toBe("msg-1");
      expect(message.content).toBe("Hello");
    });

    it("should get messages by thread", async () => {
      mockClient.smembers.mockResolvedValue(["msg-1", "msg-2"]);
      mockClient.hget.mockImplementation((key: string, id: string) => {
        const messages: Record<string, string> = {
          "msg-1": JSON.stringify({
            id: "msg-1",
            threadId: "thread-1",
            role: "user",
            content: "Hello",
            createdAt: new Date().toISOString(),
          }),
          "msg-2": JSON.stringify({
            id: "msg-2",
            threadId: "thread-1",
            role: "assistant",
            content: "Hi there",
            createdAt: new Date().toISOString(),
          }),
        };
        return Promise.resolve(messages[id] || null);
      });

      const result = await storage.getMessagesByThread("thread-1");

      expect(result.data).toHaveLength(2);
    });
  });

  describe("Workflow Run Operations", () => {
    it("should create a workflow run", async () => {
      mockClient.hset.mockResolvedValue(1);
      mockClient.sadd.mockResolvedValue(1);

      const run = await storage.createWorkflowRun({
        id: "run-1",
        workflowId: "workflow-1",
        status: "pending",
      });

      expect(run.id).toBe("run-1");
      expect(run.status).toBe("pending");
    });

    it("should update workflow run status", async () => {
      const existingRun = JSON.stringify({
        id: "run-1",
        workflowId: "workflow-1",
        status: "pending",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
      mockClient.hget.mockResolvedValue(existingRun);
      mockClient.hset.mockResolvedValue(1);

      await storage.updateWorkflowRun("run-1", { status: "completed" });

      expect(mockClient.hset).toHaveBeenCalled();
    });
  });

  describe("Custom Record Operations", () => {
    it("should set and get a record", async () => {
      mockClient.hset.mockResolvedValue(1);
      mockClient.hget.mockResolvedValue(
        JSON.stringify({
          key: "key1",
          value: { data: "value" },
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }),
      );

      await storage.setRecord("namespace", "key1", { data: "value" });
      const record = await storage.getRecord("namespace", "key1");

      expect(record).toBeDefined();
      expect(record!.value).toEqual({ data: "value" });
    });

    it("should delete a record", async () => {
      mockClient.hdel.mockResolvedValue(1);

      await storage.deleteRecord("namespace", "key1");

      expect(mockClient.hdel).toHaveBeenCalled();
    });

    it("should list records by namespace", async () => {
      mockClient.hgetall.mockResolvedValue({
        key1: JSON.stringify({
          key: "key1",
          value: { data: 1 },
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }),
        key2: JSON.stringify({
          key: "key2",
          value: { data: 2 },
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }),
      });

      const records = await storage.listRecords("namespace");

      expect(records.data).toHaveLength(2);
    });
  });

  describe("TTL Support", () => {
    it("should set record with TTL", async () => {
      mockClient.hset.mockResolvedValue(1);
      mockClient.set.mockResolvedValue("OK");

      await storage.setRecord(
        "namespace",
        "key1",
        { data: "value" },
        { ttl: 3600 },
      );

      // TTL should be handled by Redis
      expect(mockClient.hset).toHaveBeenCalled();
    });
  });

  describe("Health Check", () => {
    it("should return true when Redis is responsive", async () => {
      mockClient.ping.mockResolvedValue("PONG");

      const healthy = await storage.healthCheck();
      expect(healthy).toBe(true);
    });

    it("should return false when Redis is unresponsive", async () => {
      mockClient.ping.mockRejectedValue(new Error("Connection failed"));

      const healthy = await storage.healthCheck();
      expect(healthy).toBe(false);
    });
  });
});
