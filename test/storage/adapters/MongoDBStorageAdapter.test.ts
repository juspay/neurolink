/**
 * MongoDBStorageAdapter Tests
 *
 * Comprehensive test suite for the MongoDBStorageAdapter class.
 * Uses mocking for unit tests.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { MongoDBStorageAdapter } from "../../../src/lib/storage/adapters/MongoDBStorageAdapter.js";

// Mock mongodb
vi.mock("mongodb", () => {
  const mockCollection = {
    findOne: vi.fn(),
    find: vi.fn(),
    insertOne: vi.fn(),
    updateOne: vi.fn(),
    deleteOne: vi.fn(),
    deleteMany: vi.fn(),
    createIndex: vi.fn(),
  };

  const mockDb = {
    collection: vi.fn(() => mockCollection),
    command: vi.fn(),
  };

  const mockClient = {
    connect: vi.fn(),
    close: vi.fn(),
    db: vi.fn(() => mockDb),
  };

  return {
    MongoClient: vi.fn(() => mockClient),
  };
});

describe("MongoDBStorageAdapter", () => {
  let storage: MongoDBStorageAdapter;
  let mockClient: {
    connect: ReturnType<typeof vi.fn>;
    db: ReturnType<typeof vi.fn>;
  };
  let mockDb: {
    collection: ReturnType<typeof vi.fn>;
    command: ReturnType<typeof vi.fn>;
  };
  let mockCollection: Record<string, ReturnType<typeof vi.fn>>;

  beforeEach(async () => {
    storage = new MongoDBStorageAdapter({
      type: "mongodb",
      url: "mongodb://localhost:27017",
      database: "test",
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const internalStorage = storage as any;

    const { MongoClient } = await import("mongodb");
    mockClient = new MongoClient("") as unknown as typeof mockClient;
    mockDb = mockClient.db() as unknown as typeof mockDb;
    mockCollection = mockDb.collection();

    mockClient.connect.mockResolvedValue(mockClient);
    mockDb.command.mockResolvedValue({ ok: 1 });
    mockCollection.createIndex.mockResolvedValue("index_name");
    mockCollection.find.mockReturnValue({
      sort: vi.fn().mockReturnThis(),
      skip: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      toArray: vi.fn().mockResolvedValue([]),
    });

    await storage.init();
    internalStorage.client = mockClient;
    internalStorage.db = mockDb;
  });

  afterEach(async () => {
    await storage.close();
    vi.clearAllMocks();
  });

  describe("Initialization", () => {
    it("should initialize successfully", async () => {
      mockDb.command.mockResolvedValue({ ok: 1 });
      expect(await storage.healthCheck()).toBe(true);
    });

    it("should have mongodb type", () => {
      expect(storage.type).toBe("mongodb");
    });

    it("should create indexes on initialization", async () => {
      expect(mockCollection.createIndex).toHaveBeenCalled();
    });
  });

  describe("Thread Operations", () => {
    it("should create a thread", async () => {
      mockCollection.insertOne.mockResolvedValue({ insertedId: "thread-1" });

      const thread = await storage.createThread({
        id: "thread-1",
        resourceId: "user-1",
        title: "Test",
      });

      expect(thread.id).toBe("thread-1");
      expect(mockCollection.insertOne).toHaveBeenCalled();
    });

    it("should get a thread by ID", async () => {
      mockCollection.findOne.mockResolvedValue({
        _id: "thread-1",
        id: "thread-1",
        resourceId: "user-1",
        title: "Test",
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const thread = await storage.getThread("thread-1");
      expect(thread).toBeDefined();
      expect(thread!.id).toBe("thread-1");
    });

    it("should return undefined for non-existent thread", async () => {
      mockCollection.findOne.mockResolvedValue(null);

      const thread = await storage.getThread("nonexistent");
      expect(thread).toBeUndefined();
    });

    it("should update a thread", async () => {
      mockCollection.updateOne.mockResolvedValue({ modifiedCount: 1 });
      mockCollection.findOne.mockResolvedValue({
        _id: "thread-1",
        id: "thread-1",
        resourceId: "user-1",
        title: "Updated",
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      await storage.updateThread("thread-1", { title: "Updated" });
      expect(mockCollection.updateOne).toHaveBeenCalled();
    });

    it("should delete a thread", async () => {
      mockCollection.deleteOne.mockResolvedValue({ deletedCount: 1 });

      await storage.deleteThread("thread-1");
      expect(mockCollection.deleteOne).toHaveBeenCalled();
    });

    it("should list threads", async () => {
      mockCollection.find.mockReturnValue({
        sort: vi.fn().mockReturnThis(),
        skip: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        toArray: vi.fn().mockResolvedValue([
          {
            _id: "thread-1",
            id: "thread-1",
            resourceId: "user-1",
            title: "Test",
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        ]),
      });

      const threads = await storage.listThreads();
      expect(threads.data).toHaveLength(1);
    });
  });

  describe("Message Operations", () => {
    it("should create a message", async () => {
      mockCollection.insertOne.mockResolvedValue({ insertedId: "msg-1" });

      const message = await storage.createMessage({
        id: "msg-1",
        threadId: "thread-1",
        role: "user",
        content: "Hello",
      });

      expect(message.id).toBe("msg-1");
    });

    it("should get messages by thread", async () => {
      mockCollection.find.mockReturnValue({
        sort: vi.fn().mockReturnThis(),
        skip: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        toArray: vi.fn().mockResolvedValue([
          {
            _id: "msg-1",
            id: "msg-1",
            threadId: "thread-1",
            role: "user",
            content: "Hello",
            createdAt: new Date(),
          },
        ]),
      });

      const messages = await storage.getMessagesByThread("thread-1");
      expect(messages.data).toHaveLength(1);
    });
  });

  describe("Workflow Run Operations", () => {
    it("should create a workflow run", async () => {
      mockCollection.insertOne.mockResolvedValue({ insertedId: "run-1" });

      const run = await storage.createWorkflowRun({
        id: "run-1",
        workflowId: "workflow-1",
        status: "pending",
      });

      expect(run.id).toBe("run-1");
    });

    it("should update workflow run", async () => {
      mockCollection.updateOne.mockResolvedValue({ modifiedCount: 1 });
      mockCollection.findOne.mockResolvedValue({
        _id: "run-1",
        id: "run-1",
        workflowId: "workflow-1",
        status: "completed",
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      await storage.updateWorkflowRun("run-1", { status: "completed" });
      expect(mockCollection.updateOne).toHaveBeenCalled();
    });
  });

  describe("Custom Record Operations", () => {
    it("should set and get a record", async () => {
      mockCollection.updateOne.mockResolvedValue({ upsertedCount: 1 });
      mockCollection.findOne.mockResolvedValue({
        namespace: "ns",
        key: "key1",
        value: { data: "value" },
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      await storage.setRecord("ns", "key1", { data: "value" });
      const record = await storage.getRecord("ns", "key1");

      expect(record).toBeDefined();
      expect(record!.value).toEqual({ data: "value" });
    });

    it("should delete a record", async () => {
      mockCollection.deleteOne.mockResolvedValue({ deletedCount: 1 });

      await storage.deleteRecord("ns", "key1");
      expect(mockCollection.deleteOne).toHaveBeenCalled();
    });

    it("should clear namespace", async () => {
      mockCollection.deleteMany.mockResolvedValue({ deletedCount: 5 });

      await storage.clearNamespace("ns");
      expect(mockCollection.deleteMany).toHaveBeenCalled();
    });
  });

  describe("Health Check", () => {
    it("should return true when database is responsive", async () => {
      mockDb.command.mockResolvedValue({ ok: 1 });

      const healthy = await storage.healthCheck();
      expect(healthy).toBe(true);
    });

    it("should return false when database is unresponsive", async () => {
      mockDb.command.mockRejectedValue(new Error("Connection failed"));

      const healthy = await storage.healthCheck();
      expect(healthy).toBe(false);
    });
  });
});
