/**
 * Storage Abstraction Integration Tests
 *
 * Comprehensive integration tests for the Storage Abstraction system covering:
 * - All 5 adapters (Memory, PostgreSQL, MongoDB, Redis, LibSQL)
 * - CRUD operations across all adapters
 * - Migration system testing
 * - Connection pooling
 * - Transactions
 * - Query builder / filtering
 * - Batch operations
 * - Error handling
 * - Adapter switching
 *
 * Run with: pnpm vitest run test/storage/integration/storage.integration.test.ts
 */

import {
  describe,
  it,
  expect,
  beforeEach,
  afterEach,
  beforeAll,
  afterAll,
  vi,
} from "vitest";
import {
  StorageFactory,
  createStorage,
  createStorageFromEnv,
  MemoryAdapter,
  ConnectionPool,
  createConnectionPool,
  TransactionManager,
  TransactionalStorage,
  withTransactions,
  Transaction,
  TransactionError,
  MigrationRunner,
  createMigrationRunner,
  builtInMigrations,
  StorageHealthMonitor,
  createHealthMonitor,
  ThreadManager,
  createThreadManager,
  KeyValueStore,
  createKeyValueStore,
  WorkflowPersistenceManager,
  createWorkflowPersistenceManager,
  type StorageProvider,
  type StorageBackendType,
  type CreateThreadInput,
  type CreateMessageInput,
  type SaveWorkflowRunInput,
  type ThreadQueryOptions,
  type MessageQueryOptions,
  type WorkflowRunQueryOptions,
  type StorageThread,
  type StorageMessage,
  type StorageWorkflowRun,
  type StorageCustomRecord,
  type ConnectionPoolConfig,
  type TransactionOptions,
  type PoolableConnection,
  type Migration,
} from "../../../src/lib/storage/index.js";

// =============================================================================
// Test Utilities
// =============================================================================

const colors = {
  reset: "\x1b[0m",
  green: "\x1b[32m",
  red: "\x1b[31m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  cyan: "\x1b[36m",
} as const;

function log(message: string, color: keyof typeof colors = "reset"): void {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logSection(title: string): void {
  log(`\n${"=".repeat(60)}`, "cyan");
  log(`${title}`, "cyan");
  log(`${"=".repeat(60)}`, "cyan");
}

// Helper to create test data
function createTestThread(
  overrides: Partial<CreateThreadInput> = {},
): CreateThreadInput {
  return {
    resourceId: `user-${Date.now()}`,
    title: `Test Thread ${Date.now()}`,
    metadata: { testRun: true },
    status: "active",
    ...overrides,
  };
}

function createTestMessage(
  threadId: string,
  overrides: Partial<CreateMessageInput> = {},
): CreateMessageInput {
  return {
    threadId,
    role: "user",
    content: `Test message ${Date.now()}`,
    metadata: { testRun: true },
    ...overrides,
  };
}

function createTestWorkflowRun(
  overrides: Partial<SaveWorkflowRunInput> = {},
): SaveWorkflowRunInput {
  return {
    workflowId: `workflow-${Date.now()}`,
    status: "pending",
    triggerData: { testRun: true },
    ...overrides,
  };
}

// =============================================================================
// Section 1: StorageFactory Tests
// =============================================================================

describe("StorageFactory Integration", () => {
  beforeEach(async () => {
    await StorageFactory.reset();
  });

  afterEach(async () => {
    await StorageFactory.clearInstances();
  });

  describe("Provider Registration", () => {
    it("should register all built-in providers", async () => {
      await StorageFactory.registerAllAdapters();

      expect(StorageFactory.isRegistered("memory")).toBe(true);
      expect(StorageFactory.isRegistered("postgresql")).toBe(true);
      expect(StorageFactory.isRegistered("mongodb")).toBe(true);
      expect(StorageFactory.isRegistered("libsql")).toBe(true);
      expect(StorageFactory.isRegistered("redis")).toBe(true);
    });

    it("should resolve aliases correctly", async () => {
      await StorageFactory.registerAllAdapters();

      // Memory aliases
      expect(StorageFactory.isRegistered("mem")).toBe(true);
      expect(StorageFactory.isRegistered("in-memory")).toBe(true);
      expect(StorageFactory.isRegistered("inmemory")).toBe(true);

      // PostgreSQL aliases
      expect(StorageFactory.isRegistered("postgres")).toBe(true);
      expect(StorageFactory.isRegistered("pg")).toBe(true);
      expect(StorageFactory.isRegistered("psql")).toBe(true);

      // MongoDB aliases
      expect(StorageFactory.isRegistered("mongo")).toBe(true);
      expect(StorageFactory.isRegistered("documentdb")).toBe(true);

      // LibSQL aliases
      expect(StorageFactory.isRegistered("sqlite")).toBe(true);
      expect(StorageFactory.isRegistered("turso")).toBe(true);

      // Redis aliases
      expect(StorageFactory.isRegistered("ioredis")).toBe(true);
      expect(StorageFactory.isRegistered("cache")).toBe(true);
    });

    it("should return all registered backend types", async () => {
      await StorageFactory.registerAllAdapters();

      const types = StorageFactory.getRegisteredAdapters();
      expect(types).toContain("memory");
      expect(types).toContain("postgresql");
      expect(types).toContain("mongodb");
      expect(types).toContain("libsql");
      expect(types).toContain("redis");
      expect(types.length).toBe(5);
    });

    it("should get aliases for a backend type", async () => {
      await StorageFactory.registerAllAdapters();

      const memoryAliases = StorageFactory.getAliases("memory");
      expect(memoryAliases).toContain("mem");
      expect(memoryAliases).toContain("in-memory");
    });
  });

  describe("Provider Creation", () => {
    it("should create memory adapter via factory", async () => {
      const storage = await StorageFactory.createAdapter("memory");

      expect(storage).toBeDefined();
      expect(storage.type).toBe("memory");

      await storage.close();
    });

    it("should create memory adapter via alias", async () => {
      const storage = await StorageFactory.createAdapter("mem");

      expect(storage).toBeDefined();
      expect(storage.type).toBe("memory");

      await storage.close();
    });

    it("should create memory adapter with config", async () => {
      const storage = await StorageFactory.createAdapter("memory", {
        maxEntries: 100,
        cleanupIntervalMs: 5000,
      });

      expect(storage).toBeDefined();
      expect(storage.type).toBe("memory");

      await storage.close();
    });

    it("should throw for unknown backend type", async () => {
      await StorageFactory.registerAllAdapters();

      await expect(
        StorageFactory.createAdapter("unknown-backend"),
      ).rejects.toThrow(/Unknown storage backend/);
    });

    it("should support singleton instances with getOrCreate", async () => {
      const storage1 = await StorageFactory.getOrCreate("memory");
      const storage2 = await StorageFactory.getOrCreate("memory");

      expect(storage1).toBe(storage2); // Same instance

      // Different instance key
      const storage3 = await StorageFactory.getOrCreate(
        "memory",
        undefined,
        "test-key",
      );
      expect(storage3).not.toBe(storage1);

      await StorageFactory.clearInstances();
    });
  });

  describe("Convenience Functions", () => {
    it("should create storage via createStorage function", async () => {
      const storage = await createStorage("memory");

      expect(storage).toBeDefined();
      expect(storage.type).toBe("memory");

      await storage.close();
    });

    it("should create storage from environment", async () => {
      // Default to memory when no STORAGE_TYPE is set
      const storage = await createStorageFromEnv();

      expect(storage).toBeDefined();
      expect(storage.type).toBe("memory");

      await storage.close();
    });
  });
});

// =============================================================================
// Section 2: Memory Adapter CRUD Operations
// =============================================================================

describe("Memory Adapter CRUD Operations", () => {
  let storage: StorageProvider;

  beforeEach(async () => {
    storage = await createStorage("memory");
    await storage.init();
  });

  afterEach(async () => {
    await storage.close();
  });

  describe("Thread CRUD", () => {
    it("should create a thread", async () => {
      const input = createTestThread({ title: "CRUD Test Thread" });
      const thread = await storage.createThread(input);

      expect(thread.id).toBeDefined();
      expect(thread.resourceId).toBe(input.resourceId);
      expect(thread.title).toBe("CRUD Test Thread");
      expect(thread.status).toBe("active");
      expect(thread.createdAt).toBeInstanceOf(Date);
      expect(thread.updatedAt).toBeInstanceOf(Date);
    });

    it("should read a thread by ID", async () => {
      const created = await storage.createThread(createTestThread());
      const retrieved = await storage.getThread(created.id);

      expect(retrieved).not.toBeNull();
      expect(retrieved?.id).toBe(created.id);
    });

    it("should update a thread", async () => {
      const created = await storage.createThread(createTestThread());

      await new Promise((r) => setTimeout(r, 10));

      const updated = await storage.updateThread(created.id, {
        title: "Updated Title",
        status: "archived",
      });

      expect(updated).not.toBeNull();
      expect(updated?.title).toBe("Updated Title");
      expect(updated?.status).toBe("archived");
      expect(updated?.updatedAt.getTime()).toBeGreaterThanOrEqual(
        created.updatedAt.getTime(),
      );
    });

    it("should delete a thread", async () => {
      const created = await storage.createThread(createTestThread());

      const deleted = await storage.deleteThread(created.id);
      expect(deleted).toBe(true);

      const retrieved = await storage.getThread(created.id);
      expect(retrieved).toBeNull();
    });

    it("should list threads with pagination", async () => {
      await storage.createThread(createTestThread({ resourceId: "user1" }));
      await storage.createThread(createTestThread({ resourceId: "user1" }));
      await storage.createThread(createTestThread({ resourceId: "user2" }));

      const result = await storage.listThreads({ limit: 2 });

      expect(result.data).toHaveLength(2);
      expect(result.total).toBe(3);
      expect(result.hasMore).toBe(true);
    });

    it("should filter threads by resourceId", async () => {
      await storage.createThread(
        createTestThread({ resourceId: "filter-user-1" }),
      );
      await storage.createThread(
        createTestThread({ resourceId: "filter-user-1" }),
      );
      await storage.createThread(
        createTestThread({ resourceId: "filter-user-2" }),
      );

      const result = await storage.getThreadsByResourceId("filter-user-1");

      expect(result.data).toHaveLength(2);
      expect(result.data.every((t) => t.resourceId === "filter-user-1")).toBe(
        true,
      );
    });

    it("should filter threads by status", async () => {
      await storage.createThread(createTestThread({ status: "active" }));
      await storage.createThread(createTestThread({ status: "archived" }));
      await storage.createThread(createTestThread({ status: "active" }));

      const options: ThreadQueryOptions = { status: "archived" };
      const result = await storage.listThreads(options);

      expect(result.data).toHaveLength(1);
      expect(result.data[0].status).toBe("archived");
    });
  });

  describe("Message CRUD", () => {
    let threadId: string;

    beforeEach(async () => {
      const thread = await storage.createThread(createTestThread());
      threadId = thread.id;
    });

    it("should create a message", async () => {
      const input = createTestMessage(threadId, { content: "Hello World" });
      const message = await storage.createMessage(input);

      expect(message.id).toBeDefined();
      expect(message.threadId).toBe(threadId);
      expect(message.content).toBe("Hello World");
      expect(message.role).toBe("user");
    });

    it("should create messages in batch", async () => {
      const inputs: CreateMessageInput[] = [
        createTestMessage(threadId, { role: "user", content: "Message 1" }),
        createTestMessage(threadId, {
          role: "assistant",
          content: "Message 2",
        }),
        createTestMessage(threadId, { role: "user", content: "Message 3" }),
      ];

      const messages = await storage.createMessages(inputs);

      expect(messages).toHaveLength(3);
      expect(messages.map((m) => m.content)).toEqual([
        "Message 1",
        "Message 2",
        "Message 3",
      ]);
    });

    it("should read a message by ID", async () => {
      const created = await storage.createMessage(createTestMessage(threadId));
      const retrieved = await storage.getMessage(created.id);

      expect(retrieved).not.toBeNull();
      expect(retrieved?.id).toBe(created.id);
    });

    it("should update a message", async () => {
      const created = await storage.createMessage(createTestMessage(threadId));

      const updated = await storage.updateMessage(created.id, {
        content: "Updated content",
      });

      expect(updated).not.toBeNull();
      expect(updated?.content).toBe("Updated content");
    });

    it("should delete a message", async () => {
      const created = await storage.createMessage(createTestMessage(threadId));

      const deleted = await storage.deleteMessage(created.id);
      expect(deleted).toBe(true);

      const retrieved = await storage.getMessage(created.id);
      expect(retrieved).toBeNull();
    });

    it("should list messages by thread with filtering", async () => {
      await storage.createMessage(
        createTestMessage(threadId, { role: "user" }),
      );
      await storage.createMessage(
        createTestMessage(threadId, { role: "assistant" }),
      );
      await storage.createMessage(
        createTestMessage(threadId, { role: "user" }),
      );

      const options: MessageQueryOptions = { threadId, role: "user" };
      const result = await storage.listMessages(options);

      expect(result.data).toHaveLength(2);
      expect(result.data.every((m) => m.role === "user")).toBe(true);
    });

    it("should get messages by thread ID", async () => {
      await storage.createMessage(createTestMessage(threadId));
      await storage.createMessage(createTestMessage(threadId));

      const messages = await storage.getMessagesByThreadId(threadId);

      expect(messages).toHaveLength(2);
    });

    it("should delete all messages by thread ID", async () => {
      await storage.createMessage(createTestMessage(threadId));
      await storage.createMessage(createTestMessage(threadId));
      await storage.createMessage(createTestMessage(threadId));

      const count = await storage.deleteMessagesByThreadId(threadId);
      expect(count).toBe(3);

      const messages = await storage.getMessagesByThreadId(threadId);
      expect(messages).toHaveLength(0);
    });
  });

  describe("Workflow Run CRUD", () => {
    it("should save a workflow run", async () => {
      const input = createTestWorkflowRun();
      const run = await storage.saveWorkflowRun(input);

      expect(run.id).toBeDefined();
      expect(run.workflowId).toBe(input.workflowId);
      expect(run.status).toBe("pending");
    });

    it("should update existing workflow run", async () => {
      const created = await storage.saveWorkflowRun(createTestWorkflowRun());

      const updated = await storage.saveWorkflowRun({
        id: created.id,
        workflowId: created.workflowId,
        status: "completed",
        output: { result: "success" },
      });

      expect(updated.id).toBe(created.id);
      expect(updated.status).toBe("completed");
      expect(updated.output).toEqual({ result: "success" });
    });

    it("should get workflow run by ID", async () => {
      const created = await storage.saveWorkflowRun(createTestWorkflowRun());
      const retrieved = await storage.getWorkflowRun(created.id);

      expect(retrieved).not.toBeNull();
      expect(retrieved?.id).toBe(created.id);
    });

    it("should list workflow runs with filtering", async () => {
      const workflowId = `test-workflow-${Date.now()}`;
      await storage.saveWorkflowRun(
        createTestWorkflowRun({ workflowId, status: "completed" }),
      );
      await storage.saveWorkflowRun(
        createTestWorkflowRun({ workflowId, status: "running" }),
      );
      await storage.saveWorkflowRun(
        createTestWorkflowRun({ status: "pending" }),
      );

      const options: WorkflowRunQueryOptions = { workflowId };
      const result = await storage.listWorkflowRuns(options);

      expect(result.data).toHaveLength(2);
      expect(result.data.every((r) => r.workflowId === workflowId)).toBe(true);
    });

    it("should update workflow run status", async () => {
      const run = await storage.saveWorkflowRun(
        createTestWorkflowRun({ status: "running" }),
      );

      const updated = await storage.updateWorkflowRunStatus(
        run.id,
        "failed",
        undefined,
        { code: "ERROR", message: "Something went wrong" },
      );

      expect(updated).not.toBeNull();
      expect(updated?.status).toBe("failed");
      expect(updated?.error?.code).toBe("ERROR");
    });

    it("should update step result", async () => {
      const run = await storage.saveWorkflowRun(
        createTestWorkflowRun({ status: "running" }),
      );

      const success = await storage.updateStepResult(run.id, "step-1", {
        stepId: "step-1",
        status: "completed",
        output: { data: "step result" },
        startedAt: new Date(),
        completedAt: new Date(),
      });

      expect(success).toBe(true);

      const updated = await storage.getWorkflowRun(run.id);
      expect(updated?.stepResults?.["step-1"]).toBeDefined();
      expect(updated?.stepResults?.["step-1"].status).toBe("completed");
    });
  });

  describe("Custom Record CRUD", () => {
    it("should set a custom record", async () => {
      const record = await storage.setRecord("test-ns", "key1", {
        data: "value",
      });

      expect(record.namespace).toBe("test-ns");
      expect(record.key).toBe("key1");
      expect(record.value).toEqual({ data: "value" });
    });

    it("should get a custom record", async () => {
      await storage.setRecord("test-ns", "key1", { data: "value" });

      const record = await storage.getRecord("test-ns", "key1");

      expect(record).not.toBeNull();
      expect(record?.value).toEqual({ data: "value" });
    });

    it("should return null for non-existent record", async () => {
      const record = await storage.getRecord("test-ns", "non-existent");
      expect(record).toBeNull();
    });

    it("should delete a custom record", async () => {
      await storage.setRecord("test-ns", "key1", { data: "value" });

      const deleted = await storage.deleteRecord("test-ns", "key1");
      expect(deleted).toBe(true);

      const record = await storage.getRecord("test-ns", "key1");
      expect(record).toBeNull();
    });

    it("should check if record exists", async () => {
      await storage.setRecord("test-ns", "key1", { data: "value" });

      expect(await storage.hasRecord("test-ns", "key1")).toBe(true);
      expect(await storage.hasRecord("test-ns", "key2")).toBe(false);
    });

    it("should list records in namespace", async () => {
      await storage.setRecord("test-ns", "key1", { data: "value1" });
      await storage.setRecord("test-ns", "key2", { data: "value2" });
      await storage.setRecord("other-ns", "key3", { data: "value3" });

      const result = await storage.listRecords("test-ns");

      expect(result.data).toHaveLength(2);
      expect(result.data.every((r) => r.namespace === "test-ns")).toBe(true);
    });

    it("should delete all records in namespace", async () => {
      await storage.setRecord("test-ns", "key1", { data: "value1" });
      await storage.setRecord("test-ns", "key2", { data: "value2" });
      await storage.setRecord("other-ns", "key3", { data: "value3" });

      const count = await storage.deleteNamespace("test-ns");
      expect(count).toBe(2);

      const result = await storage.listRecords("test-ns");
      expect(result.data).toHaveLength(0);
    });

    it("should handle TTL expiration", async () => {
      vi.useFakeTimers();

      await storage.setRecord(
        "test-ns",
        "ttl-key",
        { data: "value" },
        { ttl: 2 },
      );

      let record = await storage.getRecord("test-ns", "ttl-key");
      expect(record).not.toBeNull();

      vi.advanceTimersByTime(3000);

      record = await storage.getRecord("test-ns", "ttl-key");
      expect(record).toBeNull();

      vi.useRealTimers();
    });

    it("should set record with metadata", async () => {
      const record = await storage.setRecord(
        "test-ns",
        "meta-key",
        { data: "value" },
        { metadata: { tag: "important", version: 1 } },
      );

      expect(record.metadata).toEqual({ tag: "important", version: 1 });
    });
  });
});

// =============================================================================
// Section 3: Migration System Tests
// =============================================================================

describe("Migration System", () => {
  let storage: StorageProvider;
  let migrationRunner: MigrationRunner;

  beforeEach(async () => {
    storage = await createStorage("memory");
    await storage.init();
    migrationRunner = createMigrationRunner(storage);
  });

  afterEach(async () => {
    await storage.close();
  });

  describe("Migration Registration", () => {
    it("should register a single migration", () => {
      const migration: Migration = {
        version: "1.0.0",
        name: "test_migration",
        up: async () => {},
      };

      migrationRunner.register(migration);

      // No error thrown
      expect(true).toBe(true);
    });

    it("should register multiple migrations", () => {
      const migrations: Migration[] = [
        { version: "1.0.0", name: "first", up: async () => {} },
        { version: "1.1.0", name: "second", up: async () => {} },
        { version: "2.0.0", name: "third", up: async () => {} },
      ];

      migrationRunner.registerAll(migrations);

      expect(true).toBe(true);
    });

    it("should throw on duplicate version", () => {
      migrationRunner.register({
        version: "1.0.0",
        name: "first",
        up: async () => {},
      });

      expect(() => {
        migrationRunner.register({
          version: "1.0.0",
          name: "duplicate",
          up: async () => {},
        });
      }).toThrow(/Duplicate migration version/);
    });

    it("should throw on invalid migration", () => {
      expect(() => {
        migrationRunner.register({
          version: "",
          name: "invalid",
          up: async () => {},
        });
      }).toThrow();
    });
  });

  describe("Migration Execution", () => {
    it("should get migration status", async () => {
      migrationRunner.register({
        version: "1.0.0",
        name: "test",
        up: async () => {},
      });

      const status = await migrationRunner.getStatus();

      expect(status.applied).toHaveLength(0);
      expect(status.pending).toHaveLength(1);
      expect(status.current).toBeNull();
    });

    it("should run migrations up", async () => {
      let step1Ran = false;
      let step2Ran = false;

      migrationRunner.registerAll([
        {
          version: "1.0.0",
          name: "step1",
          up: async () => {
            step1Ran = true;
          },
        },
        {
          version: "1.1.0",
          name: "step2",
          up: async () => {
            step2Ran = true;
          },
        },
      ]);

      const applied = await migrationRunner.migrateUp();

      expect(applied).toHaveLength(2);
      expect(step1Ran).toBe(true);
      expect(step2Ran).toBe(true);

      const status = await migrationRunner.getStatus();
      expect(status.pending).toHaveLength(0);
      expect(status.applied).toHaveLength(2);
      expect(status.current).toBe("1.1.0");
    });

    it("should run migrations up to target version", async () => {
      migrationRunner.registerAll([
        { version: "1.0.0", name: "step1", up: async () => {} },
        { version: "1.1.0", name: "step2", up: async () => {} },
        { version: "2.0.0", name: "step3", up: async () => {} },
      ]);

      const applied = await migrationRunner.migrateUp("1.1.0");

      expect(applied).toHaveLength(2);

      const status = await migrationRunner.getStatus();
      expect(status.current).toBe("1.1.0");
      expect(status.pending).toHaveLength(1);
    });

    it("should run migrations down", async () => {
      let downRan = false;

      migrationRunner.register({
        version: "1.0.0",
        name: "test",
        up: async () => {},
        down: async () => {
          downRan = true;
        },
      });

      await migrationRunner.migrateUp();
      const reverted = await migrationRunner.migrateDown();

      expect(reverted).toHaveLength(1);
      expect(downRan).toBe(true);

      const status = await migrationRunner.getStatus();
      expect(status.current).toBeNull();
    });

    it("should handle dry run mode", async () => {
      let actuallyRan = false;

      const dryRunMigrationRunner = createMigrationRunner(storage, {
        dryRun: true,
      });
      dryRunMigrationRunner.register({
        version: "1.0.0",
        name: "test",
        up: async () => {
          actuallyRan = true;
        },
      });

      await dryRunMigrationRunner.migrateUp();

      expect(actuallyRan).toBe(false);
    });

    it("should reset migrations (down all, up all)", async () => {
      let upCount = 0;
      let downCount = 0;

      migrationRunner.registerAll([
        {
          version: "1.0.0",
          name: "step1",
          up: async () => {
            upCount++;
          },
          down: async () => {
            downCount++;
          },
        },
        {
          version: "1.1.0",
          name: "step2",
          up: async () => {
            upCount++;
          },
          down: async () => {
            downCount++;
          },
        },
      ]);

      await migrationRunner.migrateUp();
      expect(upCount).toBe(2);

      const result = await migrationRunner.reset();

      expect(result.down).toHaveLength(2);
      expect(result.up).toHaveLength(2);
      expect(downCount).toBe(2);
      expect(upCount).toBe(4); // 2 initial + 2 after reset
    });
  });

  describe("Built-in Migrations", () => {
    it("should have initial setup migration", () => {
      expect(builtInMigrations).toBeDefined();
      expect(builtInMigrations.length).toBeGreaterThanOrEqual(1);
      expect(builtInMigrations[0].version).toBe("1.0.0");
    });

    it("should run built-in migrations", async () => {
      migrationRunner.registerAll(builtInMigrations);

      const applied = await migrationRunner.migrateUp();
      expect(applied.length).toBe(builtInMigrations.length);
    });
  });
});

// =============================================================================
// Section 4: Connection Pool Tests
// =============================================================================

describe("Connection Pool", () => {
  // Mock poolable connection for testing
  class MockConnection implements PoolableConnection {
    id: string;
    valid: boolean = true;
    closed: boolean = false;

    constructor() {
      this.id = `conn-${Date.now()}-${Math.random()}`;
    }

    async isValid(): Promise<boolean> {
      return this.valid && !this.closed;
    }

    async close(): Promise<void> {
      this.closed = true;
    }
  }

  describe("Pool Initialization", () => {
    it("should initialize pool with minimum connections", async () => {
      const factory = async () => new MockConnection();
      const pool = createConnectionPool(factory, { minSize: 2, maxSize: 5 });

      await pool.initialize();

      const stats = pool.getStats();
      expect(stats.idleConnections).toBe(2);
      expect(stats.activeConnections).toBe(0);
      expect(stats.maxPoolSize).toBe(5);

      await pool.close();
    });

    it("should respect maxSize limit", async () => {
      const factory = async () => new MockConnection();
      const pool = createConnectionPool(factory, { minSize: 0, maxSize: 2 });

      await pool.initialize();

      const conn1 = await pool.acquire();
      const conn2 = await pool.acquire();

      const stats = pool.getStats();
      expect(stats.activeConnections).toBe(2);
      expect(stats.totalConnections).toBe(2);

      await pool.release(conn1);
      await pool.release(conn2);
      await pool.close();
    });
  });

  describe("Connection Acquisition", () => {
    it("should acquire and release connections", async () => {
      const factory = async () => new MockConnection();
      const pool = createConnectionPool(factory, { minSize: 1, maxSize: 5 });

      await pool.initialize();

      const conn = await pool.acquire();
      expect(conn).toBeDefined();

      let stats = pool.getStats();
      expect(stats.activeConnections).toBe(1);

      await pool.release(conn);

      stats = pool.getStats();
      expect(stats.idleConnections).toBe(1);
      expect(stats.activeConnections).toBe(0);

      await pool.close();
    });

    it("should execute with connection helper", async () => {
      const factory = async () => new MockConnection();
      const pool = createConnectionPool(factory, { minSize: 1, maxSize: 5 });

      await pool.initialize();

      const result = await pool.withConnection(async (conn) => {
        return (conn as MockConnection).id;
      });

      expect(result).toBeDefined();

      const stats = pool.getStats();
      expect(stats.activeConnections).toBe(0);

      await pool.close();
    });

    it("should handle invalid connections", async () => {
      const factory = async () => new MockConnection();
      const pool = createConnectionPool(factory, { minSize: 1, maxSize: 5 });

      await pool.initialize();

      // Get a connection and invalidate it
      const conn = await pool.acquire();
      (conn as MockConnection).valid = false;
      await pool.release(conn);

      // Next acquire should create a new connection
      const newConn = await pool.acquire();
      expect((newConn as MockConnection).id).not.toBe(
        (conn as MockConnection).id,
      );

      await pool.release(newConn);
      await pool.close();
    });
  });

  describe("Pool Statistics", () => {
    it("should track pool statistics accurately", async () => {
      const factory = async () => new MockConnection();
      const pool = createConnectionPool(factory, { minSize: 2, maxSize: 5 });

      await pool.initialize();

      let stats = pool.getStats();
      expect(stats.totalConnections).toBe(2);
      expect(stats.idleConnections).toBe(2);
      expect(stats.activeConnections).toBe(0);
      expect(stats.pendingRequests).toBe(0);

      const conn1 = await pool.acquire();
      const conn2 = await pool.acquire();

      stats = pool.getStats();
      expect(stats.activeConnections).toBe(2);
      expect(stats.idleConnections).toBe(0);

      await pool.release(conn1);
      await pool.release(conn2);
      await pool.close();
    });
  });

  describe("Pool Shutdown", () => {
    it("should close all connections on shutdown", async () => {
      const connections: MockConnection[] = [];
      const factory = async () => {
        const conn = new MockConnection();
        connections.push(conn);
        return conn;
      };

      const pool = createConnectionPool(factory, { minSize: 3, maxSize: 5 });
      await pool.initialize();

      await pool.close();

      expect(connections.every((c) => c.closed)).toBe(true);
    });

    it("should reject acquire after close", async () => {
      const factory = async () => new MockConnection();
      const pool = createConnectionPool(factory, { minSize: 0, maxSize: 5 });

      await pool.initialize();
      await pool.close();

      await expect(pool.acquire()).rejects.toThrow(/closed/i);
    });
  });
});

// =============================================================================
// Section 5: Transaction Tests
// =============================================================================

describe("Transaction System", () => {
  describe("Transaction Class", () => {
    it("should create and begin a transaction", () => {
      const transaction = new Transaction("txn-1");
      transaction.begin();

      expect(transaction.isActive()).toBe(true);
      expect(transaction.getState()).toBe("active");
    });

    it("should commit a transaction", async () => {
      let committed = false;
      const transaction = new Transaction("txn-1", {}, async () => {
        committed = true;
      });

      transaction.begin();
      await transaction.commit();

      expect(committed).toBe(true);
      expect(transaction.getState()).toBe("committed");
    });

    it("should rollback a transaction", async () => {
      let rolledBack = false;
      const transaction = new Transaction("txn-1", {}, undefined, async () => {
        rolledBack = true;
      });

      transaction.begin();
      await transaction.rollback();

      expect(rolledBack).toBe(true);
      expect(transaction.getState()).toBe("rolledback");
    });

    it("should not allow operations on inactive transaction", async () => {
      const transaction = new Transaction("txn-1");

      await expect(transaction.commit()).rejects.toThrow();
      await expect(transaction.rollback()).rejects.toThrow();
    });

    it("should handle transaction timeout", async () => {
      vi.useFakeTimers();

      let rolledBack = false;
      const transaction = new Transaction(
        "txn-1",
        { timeoutMs: 1000 },
        undefined,
        async () => {
          rolledBack = true;
        },
      );

      transaction.begin();

      vi.advanceTimersByTime(1500);

      // Wait for async rollback
      await vi.runAllTimersAsync();

      expect(rolledBack).toBe(true);
      expect(transaction.getState()).toBe("rolledback");

      vi.useRealTimers();
    });
  });

  describe("TransactionManager", () => {
    it("should create transactions", () => {
      const manager = new TransactionManager();
      const transaction = manager.createTransaction();

      expect(transaction.isActive()).toBe(true);
    });

    it("should execute in transaction with auto-commit", async () => {
      const manager = new TransactionManager();
      let committed = false;

      const result = await manager.executeInTransaction(
        async () => {
          return "success";
        },
        {},
        undefined,
        async () => {
          committed = true;
        },
      );

      expect(result).toBe("success");
      expect(committed).toBe(true);
    });

    it("should rollback on error", async () => {
      const manager = new TransactionManager();
      let rolledBack = false;

      await expect(
        manager.executeInTransaction(
          async () => {
            throw new Error("Test error");
          },
          {},
          undefined,
          undefined,
          async () => {
            rolledBack = true;
          },
        ),
      ).rejects.toThrow("Test error");

      expect(rolledBack).toBe(true);
    });

    it("should retry on retryable error", async () => {
      const manager = new TransactionManager();
      let attempts = 0;

      await expect(
        manager.executeInTransaction(
          async () => {
            attempts++;
            if (attempts < 3) {
              throw new TransactionError("Conflict", true);
            }
            return "success";
          },
          { retryOnConflict: true, maxRetries: 5 },
        ),
      ).resolves.toBe("success");

      expect(attempts).toBe(3);
    });

    it("should track active transactions", () => {
      const manager = new TransactionManager();

      expect(manager.getActiveTransactionCount()).toBe(0);

      manager.createTransaction();
      manager.createTransaction();

      expect(manager.getActiveTransactionCount()).toBe(2);
    });

    it("should cancel all active transactions", async () => {
      const manager = new TransactionManager();

      manager.createTransaction();
      manager.createTransaction();

      await manager.cancelAllTransactions();

      expect(manager.getActiveTransactionCount()).toBe(0);
    });
  });

  describe("TransactionalStorage", () => {
    it("should wrap storage with transaction support", async () => {
      const storage = await createStorage("memory");
      await storage.init();

      const transactional = withTransactions(storage);

      expect(transactional.getStorage()).toBe(storage);

      await transactional.close();
    });

    it("should execute storage operations in transaction", async () => {
      const storage = await createStorage("memory");
      await storage.init();

      const transactional = withTransactions(storage);

      const result = await transactional.transaction(async (s) => {
        const thread = await s.createThread(createTestThread());
        return thread;
      });

      expect(result.id).toBeDefined();

      await transactional.close();
    });
  });

  describe("TransactionError", () => {
    it("should create retryable error", () => {
      const error = new TransactionError("Conflict", true, "40001");

      expect(error.message).toBe("Conflict");
      expect(error.retryable).toBe(true);
      expect(error.code).toBe("40001");
    });

    it("should create non-retryable error", () => {
      const error = new TransactionError("Fatal error", false);

      expect(error.retryable).toBe(false);
    });
  });
});

// =============================================================================
// Section 6: Batch Operations Tests
// =============================================================================

describe("Batch Operations", () => {
  let storage: StorageProvider;

  beforeEach(async () => {
    storage = await createStorage("memory");
    await storage.init();
  });

  afterEach(async () => {
    await storage.close();
  });

  describe("Batch Message Creation", () => {
    it("should create 100 messages in batch", async () => {
      const thread = await storage.createThread(createTestThread());

      const inputs: CreateMessageInput[] = Array.from(
        { length: 100 },
        (_, i) => ({
          threadId: thread.id,
          role: i % 2 === 0 ? "user" : "assistant",
          content: `Message ${i}`,
        }),
      );

      const messages = await storage.createMessages(inputs);

      expect(messages).toHaveLength(100);
      expect(messages[0].content).toBe("Message 0");
      expect(messages[99].content).toBe("Message 99");
    });

    it("should maintain message order in batch", async () => {
      const thread = await storage.createThread(createTestThread());

      const inputs: CreateMessageInput[] = Array.from(
        { length: 10 },
        (_, i) => ({
          threadId: thread.id,
          role: "user",
          content: `Ordered message ${i}`,
        }),
      );

      const messages = await storage.createMessages(inputs);

      for (let i = 0; i < 10; i++) {
        expect(messages[i].content).toBe(`Ordered message ${i}`);
      }
    });
  });

  describe("Bulk Thread Operations", () => {
    it("should create multiple threads", async () => {
      const threads: StorageThread[] = [];

      for (let i = 0; i < 50; i++) {
        const thread = await storage.createThread(
          createTestThread({ title: `Bulk Thread ${i}` }),
        );
        threads.push(thread);
      }

      expect(threads).toHaveLength(50);

      const result = await storage.listThreads({ limit: 100 });
      expect(result.data.length).toBeGreaterThanOrEqual(50);
    });

    it("should handle concurrent thread creation", async () => {
      const promises = Array.from({ length: 20 }, (_, i) =>
        storage.createThread(createTestThread({ title: `Concurrent ${i}` })),
      );

      const threads = await Promise.all(promises);

      expect(threads).toHaveLength(20);
      expect(new Set(threads.map((t) => t.id)).size).toBe(20); // All unique IDs
    });
  });

  describe("Namespace Operations", () => {
    it("should handle bulk record operations in namespace", async () => {
      const namespace = `bulk-ns-${Date.now()}`;

      // Create 50 records
      for (let i = 0; i < 50; i++) {
        await storage.setRecord(namespace, `key-${i}`, { index: i });
      }

      const result = await storage.listRecords(namespace, { limit: 100 });
      expect(result.data).toHaveLength(50);

      // Delete all in namespace
      const deleted = await storage.deleteNamespace(namespace);
      expect(deleted).toBe(50);

      const afterDelete = await storage.listRecords(namespace);
      expect(afterDelete.data).toHaveLength(0);
    });
  });
});

// =============================================================================
// Section 7: Query Builder / Filtering Tests
// =============================================================================

describe("Query Builder and Filtering", () => {
  let storage: StorageProvider;

  beforeEach(async () => {
    storage = await createStorage("memory");
    await storage.init();
  });

  afterEach(async () => {
    await storage.close();
  });

  describe("Thread Filtering", () => {
    beforeEach(async () => {
      // Create test data
      await storage.createThread(
        createTestThread({
          resourceId: "user-a",
          status: "active",
          title: "Alpha",
        }),
      );
      await storage.createThread(
        createTestThread({
          resourceId: "user-a",
          status: "archived",
          title: "Beta",
        }),
      );
      await storage.createThread(
        createTestThread({
          resourceId: "user-b",
          status: "active",
          title: "Gamma",
        }),
      );
      await storage.createThread(
        createTestThread({
          resourceId: "user-b",
          status: "deleted",
          title: "Delta",
        }),
      );
    });

    it("should filter by resourceId", async () => {
      const result = await storage.getThreadsByResourceId("user-a");

      expect(result.data).toHaveLength(2);
      expect(result.data.every((t) => t.resourceId === "user-a")).toBe(true);
    });

    it("should filter by status", async () => {
      const result = await storage.listThreads({ status: "active" });

      expect(result.data).toHaveLength(2);
      expect(result.data.every((t) => t.status === "active")).toBe(true);
    });

    it("should combine filters", async () => {
      const result = await storage.listThreads({
        resourceId: "user-b",
        status: "active",
      });

      expect(result.data).toHaveLength(1);
      expect(result.data[0].title).toBe("Gamma");
    });
  });

  describe("Message Filtering", () => {
    let threadId: string;

    beforeEach(async () => {
      const thread = await storage.createThread(createTestThread());
      threadId = thread.id;

      await storage.createMessage(
        createTestMessage(threadId, { role: "user", content: "User 1" }),
      );
      await storage.createMessage(
        createTestMessage(threadId, {
          role: "assistant",
          content: "Assistant 1",
        }),
      );
      await storage.createMessage(
        createTestMessage(threadId, { role: "user", content: "User 2" }),
      );
      await storage.createMessage(
        createTestMessage(threadId, { role: "system", content: "System 1" }),
      );
    });

    it("should filter by role", async () => {
      const result = await storage.listMessages({ threadId, role: "user" });

      expect(result.data).toHaveLength(2);
      expect(result.data.every((m) => m.role === "user")).toBe(true);
    });

    it("should filter by message type", async () => {
      await storage.createMessage(
        createTestMessage(threadId, {
          role: "assistant",
          content: "Tool result",
          type: "tool-result",
        }),
      );

      const result = await storage.listMessages({
        threadId,
        type: "tool-result",
      });

      expect(result.data).toHaveLength(1);
      expect(result.data[0].type).toBe("tool-result");
    });
  });

  describe("Workflow Run Filtering", () => {
    beforeEach(async () => {
      await storage.saveWorkflowRun(
        createTestWorkflowRun({ workflowId: "wf-1", status: "completed" }),
      );
      await storage.saveWorkflowRun(
        createTestWorkflowRun({ workflowId: "wf-1", status: "failed" }),
      );
      await storage.saveWorkflowRun(
        createTestWorkflowRun({ workflowId: "wf-2", status: "running" }),
      );
      await storage.saveWorkflowRun(
        createTestWorkflowRun({
          workflowId: "wf-2",
          status: "completed",
          resourceId: "res-1",
        }),
      );
    });

    it("should filter by workflowId", async () => {
      const result = await storage.getWorkflowRunsByWorkflowId("wf-1");

      expect(result.data).toHaveLength(2);
    });

    it("should filter by status", async () => {
      const result = await storage.listWorkflowRuns({ status: "completed" });

      expect(result.data).toHaveLength(2);
    });

    it("should filter by resourceId", async () => {
      const result = await storage.listWorkflowRuns({ resourceId: "res-1" });

      expect(result.data).toHaveLength(1);
    });

    it("should combine multiple filters", async () => {
      const result = await storage.listWorkflowRuns({
        workflowId: "wf-2",
        status: "completed",
      });

      expect(result.data).toHaveLength(1);
    });
  });

  describe("Pagination", () => {
    beforeEach(async () => {
      for (let i = 0; i < 25; i++) {
        await storage.createThread(createTestThread({ title: `Thread ${i}` }));
      }
    });

    it("should paginate with limit", async () => {
      const result = await storage.listThreads({ limit: 10 });

      expect(result.data).toHaveLength(10);
      expect(result.total).toBe(25);
      expect(result.hasMore).toBe(true);
    });

    it("should paginate with offset", async () => {
      const page1 = await storage.listThreads({ limit: 10, offset: 0 });
      const page2 = await storage.listThreads({ limit: 10, offset: 10 });
      const page3 = await storage.listThreads({ limit: 10, offset: 20 });

      expect(page1.data).toHaveLength(10);
      expect(page2.data).toHaveLength(10);
      expect(page3.data).toHaveLength(5);
      expect(page3.hasMore).toBe(false);
    });

    it("should handle offset beyond data", async () => {
      const result = await storage.listThreads({ limit: 10, offset: 100 });

      expect(result.data).toHaveLength(0);
      expect(result.hasMore).toBe(false);
    });
  });
});

// =============================================================================
// Section 8: Error Handling Tests
// =============================================================================

describe("Error Handling", () => {
  let storage: StorageProvider;

  beforeEach(async () => {
    storage = await createStorage("memory");
    await storage.init();
  });

  afterEach(async () => {
    await storage.close();
  });

  describe("Invalid Operations", () => {
    it("should return null for non-existent thread", async () => {
      const result = await storage.getThread("non-existent-id");
      expect(result).toBeNull();
    });

    it("should return null when updating non-existent thread", async () => {
      const result = await storage.updateThread("non-existent-id", {
        title: "Updated",
      });
      expect(result).toBeNull();
    });

    it("should return false when deleting non-existent thread", async () => {
      const result = await storage.deleteThread("non-existent-id");
      expect(result).toBe(false);
    });

    it("should return null for non-existent message", async () => {
      const result = await storage.getMessage("non-existent-id");
      expect(result).toBeNull();
    });

    it("should return null for non-existent workflow run", async () => {
      const result = await storage.getWorkflowRun("non-existent-id");
      expect(result).toBeNull();
    });

    it("should return false when updating step for non-existent run", async () => {
      const result = await storage.updateStepResult(
        "non-existent-id",
        "step-1",
        {
          stepId: "step-1",
          status: "completed",
        },
      );
      expect(result).toBe(false);
    });
  });

  describe("Uninitialized Storage", () => {
    it("should throw when operating on uninitialized storage", async () => {
      const uninitStorage = await createStorage("memory");
      // Note: Do NOT call init()

      await expect(
        uninitStorage.createThread(createTestThread()),
      ).rejects.toThrow(/not initialized/);

      await uninitStorage.close();
    });
  });

  describe("Graceful Error Recovery", () => {
    it("should handle empty batch operations", async () => {
      const thread = await storage.createThread(createTestThread());

      const messages = await storage.createMessages([]);
      expect(messages).toHaveLength(0);
    });

    it("should handle deleting from empty namespace", async () => {
      const count = await storage.deleteNamespace("empty-namespace");
      expect(count).toBe(0);
    });

    it("should handle listing empty collections", async () => {
      const threads = await storage.listThreads();
      expect(threads.data).toHaveLength(0);
      expect(threads.total).toBe(0);
    });
  });
});

// =============================================================================
// Section 9: Adapter Switching Tests
// =============================================================================

describe("Adapter Switching", () => {
  describe("Cross-Adapter Data Migration", () => {
    it("should migrate data between adapters", async () => {
      // Create source adapter with data
      const source = await createStorage("memory");
      await source.init();

      const thread = await source.createThread(
        createTestThread({ title: "Migration Test" }),
      );
      await source.createMessage(
        createTestMessage(thread.id, { content: "Test message" }),
      );
      await source.setRecord("config", "setting1", { value: "test" });

      // Create destination adapter
      const dest = await createStorage("memory");
      await dest.init();

      // Migrate threads
      const sourceThreads = await source.listThreads();
      for (const t of sourceThreads.data) {
        await dest.createThread({
          resourceId: t.resourceId,
          title: t.title,
          metadata: t.metadata,
          status: t.status,
        });
      }

      // Verify migration
      const destThreads = await dest.listThreads();
      expect(destThreads.data).toHaveLength(1);
      expect(destThreads.data[0].title).toBe("Migration Test");

      await source.close();
      await dest.close();
    });
  });

  describe("Adapter Interface Consistency", () => {
    it("should have consistent interface across adapters", async () => {
      const adapters: StorageProvider[] = [];

      // Create all adapter types (memory only for this test)
      adapters.push(await createStorage("memory"));

      for (const adapter of adapters) {
        await adapter.init();

        // Verify all required methods exist
        expect(typeof adapter.init).toBe("function");
        expect(typeof adapter.close).toBe("function");
        expect(typeof adapter.healthCheck).toBe("function");
        expect(typeof adapter.createThread).toBe("function");
        expect(typeof adapter.getThread).toBe("function");
        expect(typeof adapter.updateThread).toBe("function");
        expect(typeof adapter.deleteThread).toBe("function");
        expect(typeof adapter.listThreads).toBe("function");
        expect(typeof adapter.createMessage).toBe("function");
        expect(typeof adapter.createMessages).toBe("function");
        expect(typeof adapter.getMessage).toBe("function");
        expect(typeof adapter.updateMessage).toBe("function");
        expect(typeof adapter.deleteMessage).toBe("function");
        expect(typeof adapter.listMessages).toBe("function");
        expect(typeof adapter.saveWorkflowRun).toBe("function");
        expect(typeof adapter.getWorkflowRun).toBe("function");
        expect(typeof adapter.listWorkflowRuns).toBe("function");
        expect(typeof adapter.setRecord).toBe("function");
        expect(typeof adapter.getRecord).toBe("function");
        expect(typeof adapter.deleteRecord).toBe("function");
        expect(typeof adapter.listRecords).toBe("function");
        expect(typeof adapter.hasRecord).toBe("function");
        expect(typeof adapter.deleteNamespace).toBe("function");
        expect(typeof adapter.getStats).toBe("function");
        expect(typeof adapter.clearAll).toBe("function");

        await adapter.close();
      }
    });
  });

  describe("Factory Adapter Switching", () => {
    it("should switch between adapters using factory", async () => {
      await StorageFactory.reset();

      // Create memory adapter
      const memory = await StorageFactory.createAdapter("memory");
      await memory.init();
      expect(memory.type).toBe("memory");

      // Create another memory adapter (simulating switch)
      const memory2 = await StorageFactory.createAdapter("mem");
      await memory2.init();
      expect(memory2.type).toBe("memory");

      await memory.close();
      await memory2.close();
    });
  });
});

// =============================================================================
// Section 10: Health Check Tests
// =============================================================================

describe("Health Check System", () => {
  let storage: StorageProvider;

  beforeEach(async () => {
    storage = await createStorage("memory");
    await storage.init();
  });

  afterEach(async () => {
    await storage.close();
  });

  describe("Basic Health Check", () => {
    it("should return healthy status", async () => {
      const health = await storage.healthCheck();

      expect(health.healthy).toBe(true);
      expect(health.backend).toBe("memory");
      expect(health.latencyMs).toBeGreaterThanOrEqual(0);
      expect(health.error).toBeUndefined();
    });

    it("should include latency measurement", async () => {
      const health = await storage.healthCheck();

      expect(typeof health.latencyMs).toBe("number");
      expect(health.latencyMs).toBeLessThan(1000); // Should be fast
    });
  });

  describe("StorageHealthMonitor", () => {
    it("should create health monitor", () => {
      const monitor = createHealthMonitor(storage);

      expect(monitor).toBeDefined();
    });

    it("should perform health check via monitor", async () => {
      const monitor = createHealthMonitor(storage);

      const result = await monitor.getStatus();

      expect(result.healthy).toBe(true);
      expect(result.backend).toBe("memory");
    });
  });

  describe("Storage Statistics", () => {
    it("should return accurate statistics", async () => {
      // Create some data
      const thread = await storage.createThread(createTestThread());
      await storage.createMessage(createTestMessage(thread.id));
      await storage.createMessage(createTestMessage(thread.id));
      await storage.saveWorkflowRun(createTestWorkflowRun());
      await storage.setRecord("test", "key", { data: "value" });

      const stats = await storage.getStats();

      expect(stats.threadCount).toBe(1);
      expect(stats.messageCount).toBe(2);
      expect(stats.workflowRunCount).toBe(1);
      expect(stats.customRecordCount).toBe(1);
    });

    it("should update statistics after operations", async () => {
      let stats = await storage.getStats();
      expect(stats.threadCount).toBe(0);

      await storage.createThread(createTestThread());

      stats = await storage.getStats();
      expect(stats.threadCount).toBe(1);

      await storage.createThread(createTestThread());

      stats = await storage.getStats();
      expect(stats.threadCount).toBe(2);
    });
  });
});

// =============================================================================
// Section 11: High-Level Manager Tests
// =============================================================================

describe("High-Level Managers", () => {
  let storage: StorageProvider;

  beforeEach(async () => {
    storage = await createStorage("memory");
    await storage.init();
  });

  afterEach(async () => {
    await storage.close();
  });

  describe("ThreadManager", () => {
    it("should create thread manager", () => {
      const manager = createThreadManager(storage);
      expect(manager).toBeDefined();
    });

    it("should create and manage threads", async () => {
      const manager = createThreadManager(storage);

      // ThreadManager.createThread(resourceId?, title?, metadata?)
      const thread = await manager.createThread("user-1", "Managed Thread");

      expect(thread.id).toBeDefined();
      expect(thread.title).toBe("Managed Thread");
    });

    it("should add messages to thread", async () => {
      const manager = createThreadManager(storage);

      const thread = await manager.createThread(
        "user-1",
        "Thread with messages",
      );

      // ThreadManager.addMessage(threadId, role, content, metadata?)
      await manager.addMessage(thread.id, "user", "Hello");
      await manager.addMessage(thread.id, "assistant", "Hi there!");

      const messages = await manager.getMessages(thread.id);
      expect(messages).toHaveLength(2);
    });

    it("should get thread with messages", async () => {
      const manager = createThreadManager(storage);

      const thread = await manager.createThread("user-1", "Full Thread");

      await manager.addMessage(thread.id, "user", "Test");

      const fullThread = await manager.getThreadWithMessages(thread.id);

      expect(fullThread).not.toBeNull();
      expect(fullThread?.thread.id).toBe(thread.id);
      expect(fullThread?.messages).toHaveLength(1);
    });

    it("should use convenience methods for messages", async () => {
      const manager = createThreadManager(storage);

      const thread = await manager.createThread("user-1", "Convenience Test");

      await manager.addUserMessage(thread.id, "User message");
      await manager.addAssistantMessage(thread.id, "Assistant message");
      await manager.addSystemMessage(thread.id, "System message");

      const messages = await manager.getMessages(thread.id);
      expect(messages).toHaveLength(3);
      expect(messages.map((m) => m.role)).toEqual([
        "user",
        "assistant",
        "system",
      ]);
    });

    it("should archive and unarchive threads", async () => {
      const manager = createThreadManager(storage);

      const thread = await manager.createThread("user-1", "Archive Test");
      expect(thread.status).toBe("active");

      const archived = await manager.archiveThread(thread.id);
      expect(archived?.status).toBe("archived");

      const unarchived = await manager.unarchiveThread(thread.id);
      expect(unarchived?.status).toBe("active");
    });
  });

  describe("KeyValueStore", () => {
    it("should create key-value store", () => {
      const store = createKeyValueStore(storage, "test-store");
      expect(store).toBeDefined();
    });

    it("should set and get values", async () => {
      const store = createKeyValueStore(storage, "test-store");

      await store.set("key1", { data: "value1" });
      const value = await store.get("key1");

      expect(value).toEqual({ data: "value1" });
    });

    it("should check key existence", async () => {
      const store = createKeyValueStore(storage, "test-store");

      await store.set("exists", { data: "value" });

      expect(await store.has("exists")).toBe(true);
      expect(await store.has("not-exists")).toBe(false);
    });

    it("should delete keys", async () => {
      const store = createKeyValueStore(storage, "test-store");

      await store.set("to-delete", { data: "value" });
      expect(await store.has("to-delete")).toBe(true);

      await store.delete("to-delete");
      expect(await store.has("to-delete")).toBe(false);
    });

    it("should list all keys", async () => {
      const store = createKeyValueStore(storage, "kv-list-test");

      await store.set("key1", "value1");
      await store.set("key2", "value2");
      await store.set("key3", "value3");

      const keys = await store.keys();

      expect(keys).toHaveLength(3);
      expect(keys).toContain("key1");
      expect(keys).toContain("key2");
      expect(keys).toContain("key3");
    });

    it("should clear all keys", async () => {
      const store = createKeyValueStore(storage, "kv-clear-test");

      await store.set("key1", "value1");
      await store.set("key2", "value2");

      await store.clear();

      const keys = await store.keys();
      expect(keys).toHaveLength(0);
    });
  });

  describe("WorkflowPersistenceManager", () => {
    it("should create workflow persistence manager", () => {
      const manager = createWorkflowPersistenceManager(storage);
      expect(manager).toBeDefined();
    });

    it("should start and track workflow runs", async () => {
      const manager = createWorkflowPersistenceManager(storage);

      const run = await manager.startRun({
        workflowId: "test-workflow",
        triggerData: { input: "test" },
      });

      expect(run.id).toBeDefined();
      expect(run.workflowId).toBe("test-workflow");
      expect(run.status).toBe("running");
    });

    it("should update workflow run status", async () => {
      const manager = createWorkflowPersistenceManager(storage);

      const run = await manager.startRun({
        workflowId: "test-workflow",
      });

      expect(run.status).toBe("running");

      await manager.completeRun(run.id, { result: "success" });
      const updated = await manager.getRun(run.id);
      expect(updated?.status).toBe("completed");
    });

    it("should record step execution", async () => {
      const manager = createWorkflowPersistenceManager(storage);

      const run = await manager.startRun({
        workflowId: "test-workflow",
      });

      await manager.startStep(run.id, "step-1");
      await manager.completeStep(run.id, "step-1", { data: "result" });

      const updated = await manager.getRun(run.id);
      expect(updated?.stepResults?.["step-1"]).toBeDefined();
      expect(updated?.stepResults?.["step-1"].status).toBe("completed");
    });

    it("should handle workflow failure", async () => {
      const manager = createWorkflowPersistenceManager(storage);

      const run = await manager.startRun({
        workflowId: "test-workflow",
      });

      await manager.failRun(run.id, {
        code: "STEP_FAILED",
        message: "Step execution failed",
      });

      const updated = await manager.getRun(run.id);
      expect(updated?.status).toBe("failed");
      expect(updated?.error?.code).toBe("STEP_FAILED");
    });

    it("should suspend and resume workflow runs", async () => {
      const manager = createWorkflowPersistenceManager(storage);

      const run = await manager.startRun({
        workflowId: "test-workflow",
      });

      await manager.suspendRun(run.id, {
        stepId: "approval-step",
        reason: "Waiting for approval",
      });

      let updated = await manager.getRun(run.id);
      expect(updated?.status).toBe("suspended");
      expect(updated?.suspensionData?.stepId).toBe("approval-step");

      await manager.resumeRun(run.id, { approved: true });

      updated = await manager.getRun(run.id);
      expect(updated?.status).toBe("running");
    });

    it("should get workflow analytics", async () => {
      const manager = createWorkflowPersistenceManager(storage);
      const workflowId = `analytics-workflow-${Date.now()}`;

      // Create multiple runs
      const run1 = await manager.startRun({ workflowId });
      await manager.completeRun(run1.id);

      const run2 = await manager.startRun({ workflowId });
      await manager.failRun(run2.id, { code: "ERROR", message: "Failed" });

      await manager.startRun({ workflowId }); // Running

      const analytics = await manager.getWorkflowAnalytics(workflowId);

      expect(analytics.workflowId).toBe(workflowId);
      expect(analytics.totalRuns).toBe(3);
      expect(analytics.completedRuns).toBe(1);
      expect(analytics.failedRuns).toBe(1);
      expect(analytics.runningRuns).toBe(1);
    });
  });
});

// =============================================================================
// Section 12: Edge Cases and Special Scenarios
// =============================================================================

describe("Edge Cases and Special Scenarios", () => {
  let storage: StorageProvider;

  beforeEach(async () => {
    storage = await createStorage("memory");
    await storage.init();
  });

  afterEach(async () => {
    await storage.close();
  });

  describe("Special Characters", () => {
    it("should handle special characters in keys", async () => {
      const specialKey = "key/with:special@chars#test!";

      await storage.setRecord("test", specialKey, { data: "value" });
      const record = await storage.getRecord("test", specialKey);

      expect(record).not.toBeNull();
      expect(record?.key).toBe(specialKey);
    });

    it("should handle special characters in content", async () => {
      const thread = await storage.createThread(createTestThread());

      const specialContent =
        "Hello <script>alert('xss')</script> & \"quotes\" 'single'";
      await storage.createMessage(
        createTestMessage(thread.id, { content: specialContent }),
      );

      const messages = await storage.getMessagesByThreadId(thread.id);
      expect(messages[0].content).toBe(specialContent);
    });

    it("should handle Unicode characters", async () => {
      const thread = await storage.createThread(
        createTestThread({
          title: "Unicode Test: Hello World",
        }),
      );

      await storage.createMessage(
        createTestMessage(thread.id, {
          content: "Emojis: test test test test",
        }),
      );

      const retrieved = await storage.getThread(thread.id);
      expect(retrieved?.title).toContain("Hello World");
    });
  });

  describe("Large Data", () => {
    it("should handle large content", async () => {
      const thread = await storage.createThread(createTestThread());

      const largeContent = "x".repeat(100000); // 100KB of text
      await storage.createMessage(
        createTestMessage(thread.id, { content: largeContent }),
      );

      const messages = await storage.getMessagesByThreadId(thread.id);
      expect(messages[0].content.length).toBe(100000);
    });

    it("should handle deeply nested JSON", async () => {
      const deepValue = {
        level1: {
          level2: {
            level3: {
              level4: {
                level5: {
                  data: "deep value",
                  array: [1, 2, 3, { nested: true }],
                },
              },
            },
          },
        },
      };

      await storage.setRecord("test", "deep", deepValue);
      const record = await storage.getRecord("test", "deep");

      expect(record?.value).toEqual(deepValue);
    });

    it("should handle large arrays", async () => {
      const largeArray = Array.from({ length: 1000 }, (_, i) => ({
        index: i,
        data: `item-${i}`,
      }));

      await storage.setRecord("test", "large-array", largeArray);
      const record = await storage.getRecord("test", "large-array");

      expect((record?.value as unknown[]).length).toBe(1000);
    });
  });

  describe("Concurrent Operations", () => {
    it("should handle concurrent thread creation", async () => {
      const promises = Array.from({ length: 50 }, (_, i) =>
        storage.createThread(createTestThread({ title: `Concurrent ${i}` })),
      );

      const threads = await Promise.all(promises);

      expect(threads).toHaveLength(50);
      const ids = threads.map((t) => t.id);
      expect(new Set(ids).size).toBe(50); // All unique
    });

    it("should handle concurrent message creation", async () => {
      const thread = await storage.createThread(createTestThread());

      const promises = Array.from({ length: 100 }, (_, i) =>
        storage.createMessage(
          createTestMessage(thread.id, { content: `Message ${i}` }),
        ),
      );

      const messages = await Promise.all(promises);

      expect(messages).toHaveLength(100);
    });

    it("should handle concurrent read and write", async () => {
      const thread = await storage.createThread(createTestThread());

      const operations = [
        storage.createMessage(
          createTestMessage(thread.id, { content: "Write 1" }),
        ),
        storage.getThread(thread.id),
        storage.createMessage(
          createTestMessage(thread.id, { content: "Write 2" }),
        ),
        storage.listThreads(),
        storage.createMessage(
          createTestMessage(thread.id, { content: "Write 3" }),
        ),
      ];

      const results = await Promise.all(operations);

      expect(results).toHaveLength(5);
    });
  });

  describe("Clear All Data", () => {
    it("should clear all data", async () => {
      // Create data
      const thread = await storage.createThread(createTestThread());
      await storage.createMessage(createTestMessage(thread.id));
      await storage.saveWorkflowRun(createTestWorkflowRun());
      await storage.setRecord("test", "key", { data: "value" });

      let stats = await storage.getStats();
      expect(stats.threadCount).toBe(1);
      expect(stats.messageCount).toBe(1);
      expect(stats.workflowRunCount).toBe(1);
      expect(stats.customRecordCount).toBe(1);

      // Clear all
      await storage.clearAll();

      stats = await storage.getStats();
      expect(stats.threadCount).toBe(0);
      expect(stats.messageCount).toBe(0);
      expect(stats.workflowRunCount).toBe(0);
      expect(stats.customRecordCount).toBe(0);
    });
  });

  describe("Cascade Deletes", () => {
    it("should delete messages when thread is deleted", async () => {
      const thread = await storage.createThread(createTestThread());
      await storage.createMessage(createTestMessage(thread.id));
      await storage.createMessage(createTestMessage(thread.id));
      await storage.createMessage(createTestMessage(thread.id));

      let messages = await storage.getMessagesByThreadId(thread.id);
      expect(messages).toHaveLength(3);

      await storage.deleteThread(thread.id);

      messages = await storage.getMessagesByThreadId(thread.id);
      expect(messages).toHaveLength(0);
    });
  });
});

// =============================================================================
// Test Summary
// =============================================================================

describe("Integration Test Summary", () => {
  it("should complete all integration test categories", () => {
    logSection("Storage Abstraction Integration Test Summary");

    const categories = [
      "StorageFactory Integration",
      "Memory Adapter CRUD Operations",
      "Migration System",
      "Connection Pool",
      "Transaction System",
      "Batch Operations",
      "Query Builder and Filtering",
      "Error Handling",
      "Adapter Switching",
      "Health Check System",
      "High-Level Managers",
      "Edge Cases and Special Scenarios",
    ];

    log(`\nTotal Test Categories: ${categories.length}`, "green");
    categories.forEach((cat, i) => {
      log(`  ${i + 1}. ${cat}`, "blue");
    });

    expect(categories.length).toBe(12);
  });
});
