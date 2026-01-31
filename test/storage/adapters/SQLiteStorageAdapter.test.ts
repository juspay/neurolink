/**
 * SQLiteStorageAdapter Tests
 *
 * Comprehensive test suite for the SQLiteStorageAdapter class.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { join } from "path";
import { tmpdir } from "os";
import { existsSync, mkdirSync, rmSync } from "fs";
import { SQLiteStorageAdapter } from "../../../src/lib/storage/adapters/SQLiteStorageAdapter.js";

// Mock better-sqlite3
vi.mock("better-sqlite3", () => {
  const mockStatement = {
    run: vi.fn().mockReturnValue({ changes: 1 }),
    get: vi.fn(),
    all: vi.fn().mockReturnValue([]),
  };

  const mockDatabase = vi.fn(() => ({
    exec: vi.fn(),
    prepare: vi.fn(() => mockStatement),
    close: vi.fn(),
    pragma: vi.fn(),
  }));

  return { default: mockDatabase };
});

describe("SQLiteStorageAdapter", () => {
  let storage: SQLiteStorageAdapter;
  let testDir: string;
  let testPath: string;
  let mockDb: {
    exec: ReturnType<typeof vi.fn>;
    prepare: ReturnType<typeof vi.fn>;
    close: ReturnType<typeof vi.fn>;
  };
  let mockStatement: {
    run: ReturnType<typeof vi.fn>;
    get: ReturnType<typeof vi.fn>;
    all: ReturnType<typeof vi.fn>;
  };

  beforeEach(async () => {
    testDir = join(tmpdir(), `neurolink-sqlite-test-${Date.now()}`);
    testPath = join(testDir, "storage.db");
    mkdirSync(testDir, { recursive: true });

    storage = new SQLiteStorageAdapter({ type: "sqlite", path: testPath });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const internalStorage = storage as any;

    const Database = (await import("better-sqlite3")).default;
    mockDb = new Database(testPath) as unknown as typeof mockDb;
    mockStatement = mockDb.prepare("") as unknown as typeof mockStatement;

    mockStatement.all.mockReturnValue([]);

    await storage.init();
    internalStorage.db = mockDb;
  });

  afterEach(async () => {
    await storage.close();
    vi.clearAllMocks();
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true, force: true });
    }
  });

  describe("Initialization", () => {
    it("should initialize successfully", async () => {
      mockStatement.get.mockReturnValue({ ok: 1 });
      expect(await storage.healthCheck()).toBe(true);
    });

    it("should have sqlite type", () => {
      expect(storage.type).toBe("sqlite");
    });

    it("should create tables on initialization", async () => {
      expect(mockDb.exec).toHaveBeenCalled();
    });
  });

  describe("Thread Operations", () => {
    it("should create a thread", async () => {
      mockStatement.run.mockReturnValue({ changes: 1 });

      const thread = await storage.createThread({
        id: "thread-1",
        resourceId: "user-1",
        title: "Test",
      });

      expect(thread.id).toBe("thread-1");
      expect(mockStatement.run).toHaveBeenCalled();
    });

    it("should get a thread by ID", async () => {
      mockStatement.get.mockReturnValue({
        id: "thread-1",
        resource_id: "user-1",
        title: "Test",
        metadata: "{}",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

      const thread = await storage.getThread("thread-1");
      expect(thread).toBeDefined();
      expect(thread!.id).toBe("thread-1");
    });

    it("should return undefined for non-existent thread", async () => {
      mockStatement.get.mockReturnValue(undefined);

      const thread = await storage.getThread("nonexistent");
      expect(thread).toBeUndefined();
    });

    it("should update a thread", async () => {
      mockStatement.get.mockReturnValue({
        id: "thread-1",
        resource_id: "user-1",
        title: "Original",
        metadata: "{}",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
      mockStatement.run.mockReturnValue({ changes: 1 });

      await storage.updateThread("thread-1", { title: "Updated" });
      expect(mockStatement.run).toHaveBeenCalled();
    });

    it("should delete a thread", async () => {
      mockStatement.run.mockReturnValue({ changes: 1 });

      await storage.deleteThread("thread-1");
      expect(mockStatement.run).toHaveBeenCalled();
    });

    it("should list threads", async () => {
      mockStatement.all.mockReturnValue([
        {
          id: "thread-1",
          resource_id: "user-1",
          title: "Test",
          metadata: "{}",
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ]);

      const threads = await storage.listThreads();
      expect(threads.data).toHaveLength(1);
    });
  });

  describe("Message Operations", () => {
    it("should create a message", async () => {
      mockStatement.run.mockReturnValue({ changes: 1 });

      const message = await storage.createMessage({
        id: "msg-1",
        threadId: "thread-1",
        role: "user",
        content: "Hello",
      });

      expect(message.id).toBe("msg-1");
    });

    it("should get messages by thread", async () => {
      mockStatement.all.mockReturnValue([
        {
          id: "msg-1",
          thread_id: "thread-1",
          role: "user",
          content: "Hello",
          metadata: "{}",
          created_at: new Date().toISOString(),
        },
        {
          id: "msg-2",
          thread_id: "thread-1",
          role: "assistant",
          content: "Hi",
          metadata: "{}",
          created_at: new Date().toISOString(),
        },
      ]);

      const messages = await storage.getMessagesByThread("thread-1");
      expect(messages.data).toHaveLength(2);
    });
  });

  describe("Workflow Run Operations", () => {
    it("should create a workflow run", async () => {
      mockStatement.run.mockReturnValue({ changes: 1 });

      const run = await storage.createWorkflowRun({
        id: "run-1",
        workflowId: "workflow-1",
        status: "pending",
      });

      expect(run.id).toBe("run-1");
    });

    it("should update workflow run", async () => {
      mockStatement.get.mockReturnValue({
        id: "run-1",
        workflow_id: "workflow-1",
        status: "pending",
        input: "{}",
        result: null,
        error: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
      mockStatement.run.mockReturnValue({ changes: 1 });

      await storage.updateWorkflowRun("run-1", { status: "completed" });
      expect(mockStatement.run).toHaveBeenCalled();
    });
  });

  describe("Custom Record Operations", () => {
    it("should set and get a record", async () => {
      mockStatement.run.mockReturnValue({ changes: 1 });
      mockStatement.get.mockReturnValue({
        namespace: "ns",
        key: "key1",
        value: JSON.stringify({ data: "value" }),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

      await storage.setRecord("ns", "key1", { data: "value" });
      const record = await storage.getRecord("ns", "key1");

      expect(record).toBeDefined();
      expect(record!.value).toEqual({ data: "value" });
    });

    it("should list records by namespace", async () => {
      mockStatement.all.mockReturnValue([
        {
          namespace: "ns",
          key: "key1",
          value: JSON.stringify({ data: 1 }),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        {
          namespace: "ns",
          key: "key2",
          value: JSON.stringify({ data: 2 }),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ]);

      const records = await storage.listRecords("ns");
      expect(records.data).toHaveLength(2);
    });

    it("should clear namespace", async () => {
      mockStatement.run.mockReturnValue({ changes: 5 });

      await storage.clearNamespace("ns");
      expect(mockStatement.run).toHaveBeenCalled();
    });
  });

  describe("WAL Mode", () => {
    it("should enable WAL mode when configured", async () => {
      const walStorage = new SQLiteStorageAdapter({
        path: join(testDir, "wal.db"),
        wal: true,
      });

      await walStorage.init();
      expect(mockDb.pragma).toHaveBeenCalled();

      await walStorage.close();
    });
  });

  describe("In-Memory Mode", () => {
    it("should support in-memory database with :memory:", async () => {
      const memStorage = new SQLiteStorageAdapter({
        path: ":memory:",
      });

      await memStorage.init();
      expect(memStorage.type).toBe("sqlite");

      await memStorage.close();
    });
  });

  describe("Health Check", () => {
    it("should return true when database is responsive", async () => {
      mockStatement.get.mockReturnValue({ ok: 1 });

      const healthy = await storage.healthCheck();
      expect(healthy).toBe(true);
    });

    it("should return false when database is unresponsive", async () => {
      mockStatement.get.mockImplementation(() => {
        throw new Error("Database locked");
      });

      const healthy = await storage.healthCheck();
      expect(healthy).toBe(false);
    });
  });
});
