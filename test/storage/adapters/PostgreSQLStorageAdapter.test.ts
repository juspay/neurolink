/**
 * PostgreSQLStorageAdapter Tests
 *
 * Comprehensive test suite for the PostgreSQLStorageAdapter class.
 * Uses mocking for unit tests.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { PostgreSQLStorageAdapter } from "../../../src/lib/storage/adapters/PostgreSQLStorageAdapter.js";

// Mock pg
vi.mock("pg", () => {
  const mockPool = {
    query: vi.fn(),
    end: vi.fn(),
    on: vi.fn(),
  };

  return {
    Pool: vi.fn(() => mockPool),
  };
});

describe("PostgreSQLStorageAdapter", () => {
  let storage: PostgreSQLStorageAdapter;
  let mockPool: {
    query: ReturnType<typeof vi.fn>;
    end: ReturnType<typeof vi.fn>;
  };

  beforeEach(async () => {
    storage = new PostgreSQLStorageAdapter({
      type: "postgresql",
      connectionString: "postgresql://localhost:5432/test",
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const internalStorage = storage as any;

    // Mock successful init queries
    const { Pool } = await import("pg");
    mockPool = new Pool() as unknown as typeof mockPool;

    mockPool.query.mockResolvedValue({ rows: [], rowCount: 0 });

    await storage.init();
    internalStorage.pool = mockPool;
  });

  afterEach(async () => {
    await storage.close();
    vi.clearAllMocks();
  });

  describe("Initialization", () => {
    it("should initialize successfully", async () => {
      mockPool.query.mockResolvedValue({ rows: [{ "?column?": 1 }] });
      expect(await storage.healthCheck()).toBe(true);
    });

    it("should have postgresql type", () => {
      expect(storage.type).toBe("postgresql");
    });

    it("should create tables on initialization", async () => {
      expect(mockPool.query).toHaveBeenCalled();
    });
  });

  describe("Thread Operations", () => {
    it("should create a thread", async () => {
      mockPool.query.mockResolvedValue({
        rows: [
          {
            id: "thread-1",
            resource_id: "user-1",
            title: "Test",
            metadata: {},
            created_at: new Date(),
            updated_at: new Date(),
          },
        ],
      });

      const thread = await storage.createThread({
        id: "thread-1",
        resourceId: "user-1",
        title: "Test",
      });

      expect(thread.id).toBe("thread-1");
    });

    it("should get a thread by ID", async () => {
      mockPool.query.mockResolvedValue({
        rows: [
          {
            id: "thread-1",
            resource_id: "user-1",
            title: "Test",
            metadata: {},
            created_at: new Date(),
            updated_at: new Date(),
          },
        ],
      });

      const thread = await storage.getThread("thread-1");
      expect(thread).toBeDefined();
      expect(thread!.id).toBe("thread-1");
    });

    it("should return undefined for non-existent thread", async () => {
      mockPool.query.mockResolvedValue({ rows: [] });

      const thread = await storage.getThread("nonexistent");
      expect(thread).toBeUndefined();
    });

    it("should update a thread", async () => {
      mockPool.query.mockResolvedValue({
        rows: [
          {
            id: "thread-1",
            resource_id: "user-1",
            title: "Updated",
            metadata: {},
            created_at: new Date(),
            updated_at: new Date(),
          },
        ],
      });

      await storage.updateThread("thread-1", { title: "Updated" });
      expect(mockPool.query).toHaveBeenCalled();
    });

    it("should delete a thread", async () => {
      mockPool.query.mockResolvedValue({ rowCount: 1 });

      await storage.deleteThread("thread-1");
      expect(mockPool.query).toHaveBeenCalled();
    });

    it("should list threads with filtering", async () => {
      mockPool.query.mockResolvedValue({
        rows: [
          {
            id: "thread-1",
            resource_id: "user-1",
            title: "Test",
            metadata: {},
            created_at: new Date(),
            updated_at: new Date(),
          },
        ],
      });

      const threads = await storage.listThreads({
        filter: { resourceId: { eq: "user-1" } },
      });

      expect(threads.data).toHaveLength(1);
    });
  });

  describe("Message Operations", () => {
    it("should create a message", async () => {
      mockPool.query.mockResolvedValue({
        rows: [
          {
            id: "msg-1",
            thread_id: "thread-1",
            role: "user",
            content: "Hello",
            metadata: {},
            created_at: new Date(),
          },
        ],
      });

      const message = await storage.createMessage({
        id: "msg-1",
        threadId: "thread-1",
        role: "user",
        content: "Hello",
      });

      expect(message.id).toBe("msg-1");
    });

    it("should get messages by thread", async () => {
      mockPool.query.mockResolvedValue({
        rows: [
          {
            id: "msg-1",
            thread_id: "thread-1",
            role: "user",
            content: "Hello",
            metadata: {},
            created_at: new Date(),
          },
          {
            id: "msg-2",
            thread_id: "thread-1",
            role: "assistant",
            content: "Hi",
            metadata: {},
            created_at: new Date(),
          },
        ],
      });

      const messages = await storage.getMessagesByThread("thread-1");
      expect(messages.data).toHaveLength(2);
    });
  });

  describe("Workflow Run Operations", () => {
    it("should create a workflow run", async () => {
      mockPool.query.mockResolvedValue({
        rows: [
          {
            id: "run-1",
            workflow_id: "workflow-1",
            status: "pending",
            input: {},
            result: null,
            error: null,
            started_at: null,
            completed_at: null,
            created_at: new Date(),
            updated_at: new Date(),
          },
        ],
      });

      const run = await storage.createWorkflowRun({
        id: "run-1",
        workflowId: "workflow-1",
        status: "pending",
      });

      expect(run.id).toBe("run-1");
    });

    it("should update workflow run status", async () => {
      mockPool.query.mockResolvedValue({
        rows: [
          {
            id: "run-1",
            workflow_id: "workflow-1",
            status: "completed",
            input: {},
            result: { success: true },
            error: null,
            started_at: new Date(),
            completed_at: new Date(),
            created_at: new Date(),
            updated_at: new Date(),
          },
        ],
      });

      await storage.updateWorkflowRun("run-1", { status: "completed" });
      expect(mockPool.query).toHaveBeenCalled();
    });
  });

  describe("Custom Record Operations", () => {
    it("should set and get a record", async () => {
      mockPool.query.mockResolvedValue({
        rows: [
          {
            namespace: "ns",
            key: "key1",
            value: { data: "value" },
            created_at: new Date(),
            updated_at: new Date(),
          },
        ],
      });

      await storage.setRecord("ns", "key1", { data: "value" });
      const record = await storage.getRecord("ns", "key1");

      expect(record).toBeDefined();
    });

    it("should list records by namespace", async () => {
      mockPool.query.mockResolvedValue({
        rows: [
          {
            namespace: "ns",
            key: "key1",
            value: { data: 1 },
            created_at: new Date(),
            updated_at: new Date(),
          },
          {
            namespace: "ns",
            key: "key2",
            value: { data: 2 },
            created_at: new Date(),
            updated_at: new Date(),
          },
        ],
      });

      const records = await storage.listRecords("ns");
      expect(records.data).toHaveLength(2);
    });
  });

  describe("JSONB Operations", () => {
    it("should store metadata as JSONB", async () => {
      const metadata = { key: "value", nested: { a: 1 } };
      mockPool.query.mockResolvedValue({
        rows: [
          {
            id: "thread-1",
            resource_id: "user-1",
            title: "Test",
            metadata,
            created_at: new Date(),
            updated_at: new Date(),
          },
        ],
      });

      const thread = await storage.createThread({
        id: "thread-1",
        resourceId: "user-1",
        metadata,
      });

      expect(thread.metadata).toEqual(metadata);
    });
  });

  describe("Health Check", () => {
    it("should return true when database is responsive", async () => {
      mockPool.query.mockResolvedValue({ rows: [{ "?column?": 1 }] });

      const healthy = await storage.healthCheck();
      expect(healthy).toBe(true);
    });

    it("should return false when database is unresponsive", async () => {
      mockPool.query.mockRejectedValue(new Error("Connection failed"));

      const healthy = await storage.healthCheck();
      expect(healthy).toBe(false);
    });
  });
});
