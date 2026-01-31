/**
 * SQLiteStorageAdapter - SQLite Storage Implementation
 *
 * Provides local, file-based SQL storage using SQLite/LibSQL.
 * Suitable for single-instance deployments and embedded applications.
 *
 * Features:
 * - Full MastraStorage interface implementation
 * - ACID-compliant transactions
 * - WAL mode for better concurrency
 * - Zero external dependencies for simple setup
 *
 * @module SQLiteStorageAdapter
 * @since 9.0.0
 */

import { randomUUID } from "crypto";
import { createErrorFactory } from "../../core/infrastructure/baseError.js";
import type { JsonObject, JsonValue } from "../../types/index.js";
import { logger } from "../../utils/logger.js";
import type {
  CreateMessageInput,
  CreateThreadInput,
  MastraStorage,
  MessageQueryOptions,
  PaginatedResult,
  SaveWorkflowRunInput,
  StorageQueryOptions,
  StepRunResult,
  StorageCustomRecord,
  StorageHealthResult,
  StorageInitOptions,
  StorageMessage,
  StorageStats,
  StorageThread,
  StorageWorkflowError,
  StorageWorkflowRun,
  ThreadQueryOptions,
  UpdateMessageInput,
  UpdateThreadInput,
  WorkflowRunQueryOptions,
  WorkflowRunStatus,
} from "../../types/index.js";
import type {
  SQLiteStorageConfig,
  MastraStorageConfig as StorageProviderConfig,
} from "../../types/index.js";
import type { StorageSQLiteDatabase } from "../../types/index.js";

// =============================================================================
// Error Factory
// =============================================================================

const SQLiteErrors = createErrorFactory("SQLiteStorage", {
  NOT_INITIALIZED: "SQLITE_NOT_INITIALIZED",
  CONNECTION_FAILED: "SQLITE_CONNECTION_FAILED",
  QUERY_FAILED: "SQLITE_QUERY_FAILED",
  VALIDATION_ERROR: "SQLITE_VALIDATION_ERROR",
});

// =============================================================================
// SQLiteStorageAdapter Class
// =============================================================================

export class SQLiteStorageAdapter implements MastraStorage {
  readonly type = "sqlite" as const;

  private config: SQLiteStorageConfig;
  private db: StorageSQLiteDatabase | null = null;
  private initialized = false;
  private tablePrefix: string;

  constructor(
    config: StorageProviderConfig | Omit<SQLiteStorageConfig, "type">,
  ) {
    // Allow config without type field for convenience
    const configWithType =
      "type" in config ? config : { ...config, type: "sqlite" as const };

    if (configWithType.type !== "sqlite") {
      throw SQLiteErrors.create(
        "VALIDATION_ERROR",
        `Invalid config type: expected 'sqlite', got '${configWithType.type}'`,
      );
    }
    this.config = configWithType as SQLiteStorageConfig;
    this.tablePrefix = this.config.tablePrefix || "neurolink_";
  }

  async init(options?: StorageInitOptions): Promise<void> {
    if (this.initialized) {
      return;
    }

    logger.debug(
      `SQLiteStorageAdapter: Initializing with ${this.config.filename}`,
    );

    try {
      // Try better-sqlite3 first, fall back to sql.js
      const Database = await this.loadDatabaseDriver();
      this.db = new Database(
        this.config.filename,
      ) as unknown as StorageSQLiteDatabase;

      // Enable WAL mode
      if (this.config.wal !== false) {
        this.db.exec("PRAGMA journal_mode = WAL");
      }

      // Set busy timeout
      if (this.config.busyTimeout) {
        this.db.exec(`PRAGMA busy_timeout = ${this.config.busyTimeout}`);
      }

      // Run migrations
      if (options?.runMigrations !== false) {
        await this.runMigrations();
      }

      this.initialized = true;
      logger.info("SQLiteStorageAdapter: Initialized successfully");
    } catch (error) {
      throw SQLiteErrors.create(
        "CONNECTION_FAILED",
        `Failed to open SQLite database: ${error instanceof Error ? error.message : String(error)}`,
        { cause: error instanceof Error ? error : undefined },
      );
    }
  }

  async close(): Promise<void> {
    if (this.db) {
      this.db.close();
      this.db = null;
    }
    this.initialized = false;
    logger.info("SQLiteStorageAdapter: Closed");
  }

  async healthCheck(): Promise<StorageHealthResult> {
    const start = performance.now();

    if (!this.initialized || !this.db) {
      return {
        healthy: false,
        backend: "sqlite",
        error: "Storage not initialized",
      };
    }

    try {
      this.db.prepare("SELECT 1").get();
      const latencyMs = Math.round(performance.now() - start);
      return {
        healthy: true,
        backend: "sqlite",
        latencyMs,
      };
    } catch (error) {
      return {
        healthy: false,
        backend: "sqlite",
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  // =========================================================================
  // Thread Operations
  // =========================================================================

  async createThread(thread: CreateThreadInput): Promise<StorageThread> {
    this.ensureInitialized();
    const now = new Date();
    const newThread: StorageThread = {
      ...thread,
      id: randomUUID(),
      createdAt: now,
      updatedAt: now,
      status: thread.status || "active",
    };

    this.db!.prepare(
      `INSERT INTO ${this.table("threads")}
       (id, resource_id, title, metadata, status, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
    ).run(
      newThread.id,
      newThread.resourceId,
      newThread.title || null,
      JSON.stringify(newThread.metadata || {}),
      newThread.status,
      now.toISOString(),
      now.toISOString(),
    );

    return { ...newThread };
  }

  async getThread(threadId: string): Promise<StorageThread | null> {
    this.ensureInitialized();
    const row = this.db!.prepare(
      `SELECT * FROM ${this.table("threads")} WHERE id = ?`,
    ).get(threadId) as Record<string, unknown> | undefined;

    return row ? this.mapThread(row) : null;
  }

  async updateThread(
    threadId: string,
    updates: UpdateThreadInput,
  ): Promise<StorageThread | null> {
    this.ensureInitialized();
    const now = new Date();
    const setClauses: string[] = ["updated_at = ?"];
    const params: unknown[] = [now.toISOString()];

    if (updates.title !== undefined) {
      setClauses.push("title = ?");
      params.push(updates.title);
    }
    if (updates.resourceId !== undefined) {
      setClauses.push("resource_id = ?");
      params.push(updates.resourceId);
    }
    if (updates.metadata !== undefined) {
      setClauses.push("metadata = ?");
      params.push(JSON.stringify(updates.metadata));
    }
    if (updates.status !== undefined) {
      setClauses.push("status = ?");
      params.push(updates.status);
    }

    params.push(threadId);

    const result = this.db!.prepare(
      `UPDATE ${this.table("threads")} SET ${setClauses.join(", ")} WHERE id = ?`,
    ).run(...params);

    if (result.changes === 0) {
      return null;
    }
    return this.getThread(threadId);
  }

  async deleteThread(threadId: string): Promise<boolean> {
    this.ensureInitialized();
    await this.deleteMessagesByThreadId(threadId);
    const result = this.db!.prepare(
      `DELETE FROM ${this.table("threads")} WHERE id = ?`,
    ).run(threadId);
    return result.changes > 0;
  }

  async listThreads(
    options?: ThreadQueryOptions,
  ): Promise<PaginatedResult<StorageThread>> {
    this.ensureInitialized();
    const whereClauses: string[] = [];
    const params: unknown[] = [];

    if (options?.resourceId) {
      whereClauses.push("resource_id = ?");
      params.push(options.resourceId);
    }
    if (options?.status) {
      whereClauses.push("status = ?");
      params.push(options.status);
    }

    const whereClause =
      whereClauses.length > 0 ? `WHERE ${whereClauses.join(" AND ")}` : "";
    const limit = options?.limit || 50;
    const offset = options?.offset || 0;

    const countRow = this.db!.prepare(
      `SELECT COUNT(*) as count FROM ${this.table("threads")} ${whereClause}`,
    ).get(...params) as { count: number };
    const total = countRow.count;

    const rows = this.db!.prepare(
      `SELECT * FROM ${this.table("threads")} ${whereClause}
       ORDER BY created_at DESC LIMIT ? OFFSET ?`,
    ).all(...params, limit, offset) as Record<string, unknown>[];

    return {
      data: rows.map((row) => this.mapThread(row)),
      total,
      hasMore: offset + limit < total,
    };
  }

  async getThreadsByResourceId(
    resourceId: string,
    options?: StorageQueryOptions,
  ): Promise<PaginatedResult<StorageThread>> {
    return this.listThreads({ ...options, resourceId });
  }

  // =========================================================================
  // Message Operations
  // =========================================================================

  async createMessage(message: CreateMessageInput): Promise<StorageMessage> {
    this.ensureInitialized();
    const now = new Date();
    const newMessage: StorageMessage = {
      ...message,
      id: randomUUID(),
      createdAt: now,
      updatedAt: now,
    };

    this.db!.prepare(
      `INSERT INTO ${this.table("messages")}
       (id, thread_id, role, content, type, tool_info, metadata, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).run(
      newMessage.id,
      newMessage.threadId,
      newMessage.role,
      newMessage.content,
      newMessage.type || "text",
      message.toolInfo ? JSON.stringify(message.toolInfo) : null,
      JSON.stringify(newMessage.metadata || {}),
      now.toISOString(),
      now.toISOString(),
    );

    return { ...newMessage };
  }

  async createMessages(
    messages: CreateMessageInput[],
  ): Promise<StorageMessage[]> {
    return Promise.all(messages.map((m) => this.createMessage(m)));
  }

  async getMessage(messageId: string): Promise<StorageMessage | null> {
    this.ensureInitialized();
    const row = this.db!.prepare(
      `SELECT * FROM ${this.table("messages")} WHERE id = ?`,
    ).get(messageId) as Record<string, unknown> | undefined;

    return row ? this.mapMessage(row) : null;
  }

  async updateMessage(
    messageId: string,
    updates: UpdateMessageInput,
  ): Promise<StorageMessage | null> {
    this.ensureInitialized();
    const now = new Date();
    const setClauses: string[] = ["updated_at = ?"];
    const params: unknown[] = [now.toISOString()];

    if (updates.content !== undefined) {
      setClauses.push("content = ?");
      params.push(updates.content);
    }
    if (updates.role !== undefined) {
      setClauses.push("role = ?");
      params.push(updates.role);
    }
    if (updates.metadata !== undefined) {
      setClauses.push("metadata = ?");
      params.push(JSON.stringify(updates.metadata));
    }

    params.push(messageId);

    const result = this.db!.prepare(
      `UPDATE ${this.table("messages")} SET ${setClauses.join(", ")} WHERE id = ?`,
    ).run(...params);

    if (result.changes === 0) {
      return null;
    }
    return this.getMessage(messageId);
  }

  async deleteMessage(messageId: string): Promise<boolean> {
    this.ensureInitialized();
    const result = this.db!.prepare(
      `DELETE FROM ${this.table("messages")} WHERE id = ?`,
    ).run(messageId);
    return result.changes > 0;
  }

  async listMessages(
    options: MessageQueryOptions,
  ): Promise<PaginatedResult<StorageMessage>> {
    this.ensureInitialized();
    const whereClauses: string[] = ["thread_id = ?"];
    const params: unknown[] = [options.threadId];

    if (options.role) {
      whereClauses.push("role = ?");
      params.push(options.role);
    }
    if (options.type) {
      whereClauses.push("type = ?");
      params.push(options.type);
    }

    const whereClause = `WHERE ${whereClauses.join(" AND ")}`;
    const limit = options.limit || 50;
    const offset = options.offset || 0;

    const countRow = this.db!.prepare(
      `SELECT COUNT(*) as count FROM ${this.table("messages")} ${whereClause}`,
    ).get(...params) as { count: number };
    const total = countRow.count;

    const rows = this.db!.prepare(
      `SELECT * FROM ${this.table("messages")} ${whereClause}
       ORDER BY created_at ASC LIMIT ? OFFSET ?`,
    ).all(...params, limit, offset) as Record<string, unknown>[];

    return {
      data: rows.map((row) => this.mapMessage(row)),
      total,
      hasMore: offset + limit < total,
    };
  }

  async getMessagesByThreadId(
    threadId: string,
    options?: StorageQueryOptions,
  ): Promise<StorageMessage[]> {
    const result = await this.listMessages({ ...options, threadId });
    return result.data;
  }

  async deleteMessagesByThreadId(threadId: string): Promise<number> {
    this.ensureInitialized();
    const result = this.db!.prepare(
      `DELETE FROM ${this.table("messages")} WHERE thread_id = ?`,
    ).run(threadId);
    return result.changes;
  }

  // =========================================================================
  // Workflow Run Operations
  // =========================================================================

  async saveWorkflowRun(
    run: SaveWorkflowRunInput,
  ): Promise<StorageWorkflowRun> {
    this.ensureInitialized();
    const now = new Date();
    const id = run.id || randomUUID();
    const existing = run.id ? await this.getWorkflowRun(run.id) : null;

    const workflowRun: StorageWorkflowRun = {
      ...run,
      id,
      createdAt: existing?.createdAt || now,
      updatedAt: now,
    };

    this.db!.prepare(
      `INSERT OR REPLACE INTO ${this.table("workflow_runs")}
       (id, workflow_id, status, trigger_data, output, error, step_results,
        suspension_data, resource_id, thread_id, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).run(
      id,
      workflowRun.workflowId,
      workflowRun.status,
      workflowRun.triggerData ? JSON.stringify(workflowRun.triggerData) : null,
      workflowRun.output !== undefined
        ? JSON.stringify(workflowRun.output)
        : null,
      workflowRun.error ? JSON.stringify(workflowRun.error) : null,
      workflowRun.stepResults ? JSON.stringify(workflowRun.stepResults) : null,
      workflowRun.suspensionData
        ? JSON.stringify(workflowRun.suspensionData)
        : null,
      workflowRun.resourceId || null,
      workflowRun.threadId || null,
      workflowRun.createdAt.toISOString(),
      workflowRun.updatedAt.toISOString(),
    );

    return { ...workflowRun };
  }

  async getWorkflowRun(runId: string): Promise<StorageWorkflowRun | null> {
    this.ensureInitialized();
    const row = this.db!.prepare(
      `SELECT * FROM ${this.table("workflow_runs")} WHERE id = ?`,
    ).get(runId) as Record<string, unknown> | undefined;

    return row ? this.mapWorkflowRun(row) : null;
  }

  async listWorkflowRuns(
    options?: WorkflowRunQueryOptions,
  ): Promise<PaginatedResult<StorageWorkflowRun>> {
    this.ensureInitialized();
    const whereClauses: string[] = [];
    const params: unknown[] = [];

    if (options?.workflowId) {
      whereClauses.push("workflow_id = ?");
      params.push(options.workflowId);
    }
    if (options?.status) {
      whereClauses.push("status = ?");
      params.push(options.status);
    }

    const whereClause =
      whereClauses.length > 0 ? `WHERE ${whereClauses.join(" AND ")}` : "";
    const limit = options?.limit || 50;
    const offset = options?.offset || 0;

    const countRow = this.db!.prepare(
      `SELECT COUNT(*) as count FROM ${this.table("workflow_runs")} ${whereClause}`,
    ).get(...params) as { count: number };
    const total = countRow.count;

    const rows = this.db!.prepare(
      `SELECT * FROM ${this.table("workflow_runs")} ${whereClause}
       ORDER BY created_at DESC LIMIT ? OFFSET ?`,
    ).all(...params, limit, offset) as Record<string, unknown>[];

    return {
      data: rows.map((row) => this.mapWorkflowRun(row)),
      total,
      hasMore: offset + limit < total,
    };
  }

  async updateWorkflowRunStatus(
    runId: string,
    status: WorkflowRunStatus,
    output?: JsonValue,
    error?: StorageWorkflowError,
  ): Promise<StorageWorkflowRun | null> {
    this.ensureInitialized();
    const result = this.db!.prepare(
      `UPDATE ${this.table("workflow_runs")}
       SET status = ?, output = ?, error = ?, updated_at = ?
       WHERE id = ?`,
    ).run(
      status,
      output !== undefined ? JSON.stringify(output) : null,
      error ? JSON.stringify(error) : null,
      new Date().toISOString(),
      runId,
    );

    if (result.changes === 0) {
      return null;
    }
    return this.getWorkflowRun(runId);
  }

  async updateStepResult(
    runId: string,
    stepId: string,
    result: StepRunResult,
  ): Promise<boolean> {
    this.ensureInitialized();
    const existing = await this.getWorkflowRun(runId);
    if (!existing) {
      return false;
    }

    const stepResults = { ...existing.stepResults, [stepId]: result };

    const updateResult = this.db!.prepare(
      `UPDATE ${this.table("workflow_runs")}
       SET step_results = ?, updated_at = ?
       WHERE id = ?`,
    ).run(JSON.stringify(stepResults), new Date().toISOString(), runId);

    return updateResult.changes > 0;
  }

  async getWorkflowRunsByWorkflowId(
    workflowId: string,
    options?: StorageQueryOptions,
  ): Promise<PaginatedResult<StorageWorkflowRun>> {
    return this.listWorkflowRuns({ ...options, workflowId });
  }

  // =========================================================================
  // Custom Record Operations
  // =========================================================================

  async setRecord(
    namespace: string,
    key: string,
    value: JsonValue,
    options?: { ttl?: number; metadata?: JsonObject },
  ): Promise<StorageCustomRecord> {
    this.ensureInitialized();
    const now = new Date();
    const existing = await this.getRecord(namespace, key);

    const record: StorageCustomRecord = {
      namespace,
      key,
      value,
      ttl: options?.ttl,
      metadata: options?.metadata,
      createdAt: existing?.createdAt || now,
      updatedAt: now,
    };

    this.db!.prepare(
      `INSERT OR REPLACE INTO ${this.table("records")}
       (namespace, key, value, ttl, metadata, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
    ).run(
      namespace,
      key,
      JSON.stringify(value),
      options?.ttl || null,
      options?.metadata ? JSON.stringify(options.metadata) : null,
      record.createdAt.toISOString(),
      record.updatedAt.toISOString(),
    );

    return { ...record };
  }

  async getRecord(
    namespace: string,
    key: string,
  ): Promise<StorageCustomRecord | null> {
    this.ensureInitialized();
    const row = this.db!.prepare(
      `SELECT * FROM ${this.table("records")} WHERE namespace = ? AND key = ?`,
    ).get(namespace, key) as Record<string, unknown> | undefined;

    if (!row) {
      return null;
    }

    const record = this.mapRecord(row);

    if (record.ttl) {
      const expiresAt = new Date(
        record.updatedAt.getTime() + record.ttl * 1000,
      );
      if (new Date() > expiresAt) {
        await this.deleteRecord(namespace, key);
        return null;
      }
    }

    return record;
  }

  async deleteRecord(namespace: string, key: string): Promise<boolean> {
    this.ensureInitialized();
    const result = this.db!.prepare(
      `DELETE FROM ${this.table("records")} WHERE namespace = ? AND key = ?`,
    ).run(namespace, key);
    return result.changes > 0;
  }

  async listRecords(
    namespace: string,
    options?: StorageQueryOptions,
  ): Promise<PaginatedResult<StorageCustomRecord>> {
    this.ensureInitialized();
    const limit = options?.limit || 50;
    const offset = options?.offset || 0;

    const countRow = this.db!.prepare(
      `SELECT COUNT(*) as count FROM ${this.table("records")} WHERE namespace = ?`,
    ).get(namespace) as { count: number };
    const total = countRow.count;

    const rows = this.db!.prepare(
      `SELECT * FROM ${this.table("records")} WHERE namespace = ?
       ORDER BY key ASC LIMIT ? OFFSET ?`,
    ).all(namespace, limit, offset) as Record<string, unknown>[];

    return {
      data: rows.map((row) => this.mapRecord(row)),
      total,
      hasMore: offset + limit < total,
    };
  }

  async hasRecord(namespace: string, key: string): Promise<boolean> {
    return (await this.getRecord(namespace, key)) !== null;
  }

  async deleteNamespace(namespace: string): Promise<number> {
    this.ensureInitialized();
    const result = this.db!.prepare(
      `DELETE FROM ${this.table("records")} WHERE namespace = ?`,
    ).run(namespace);
    return result.changes;
  }

  // =========================================================================
  // Utility Methods
  // =========================================================================

  async getStats(): Promise<StorageStats> {
    this.ensureInitialized();

    const threadCount = (
      this.db!.prepare(
        `SELECT COUNT(*) as count FROM ${this.table("threads")}`,
      ).get() as { count: number }
    ).count;

    const messageCount = (
      this.db!.prepare(
        `SELECT COUNT(*) as count FROM ${this.table("messages")}`,
      ).get() as { count: number }
    ).count;

    const workflowRunCount = (
      this.db!.prepare(
        `SELECT COUNT(*) as count FROM ${this.table("workflow_runs")}`,
      ).get() as { count: number }
    ).count;

    const customRecordCount = (
      this.db!.prepare(
        `SELECT COUNT(*) as count FROM ${this.table("records")}`,
      ).get() as { count: number }
    ).count;

    return { threadCount, messageCount, workflowRunCount, customRecordCount };
  }

  async clearAll(): Promise<void> {
    this.ensureInitialized();
    this.db!.exec(`
      DELETE FROM ${this.table("records")};
      DELETE FROM ${this.table("workflow_runs")};
      DELETE FROM ${this.table("messages")};
      DELETE FROM ${this.table("threads")};
    `);
    logger.warn("SQLiteStorageAdapter: All data cleared");
  }

  // =========================================================================
  // Private Helpers
  // =========================================================================

  private ensureInitialized(): void {
    if (!this.initialized || !this.db) {
      throw SQLiteErrors.create("NOT_INITIALIZED", "Storage not initialized");
    }
  }

  private table(name: string): string {
    return `${this.tablePrefix}${name}`;
  }

  private async loadDatabaseDriver(): Promise<
    new (filename: string) => unknown
  > {
    try {
      const { default: Database } = await import("better-sqlite3");
      return Database;
    } catch {
      throw new Error(
        `SQLite driver not installed. Run: pnpm add better-sqlite3\n` +
          `The 'better-sqlite3' package is a peer dependency required for SQLite storage.`,
      );
    }
  }

  private async runMigrations(): Promise<void> {
    logger.debug("SQLiteStorageAdapter: Running migrations");

    this.db!.exec(`
      CREATE TABLE IF NOT EXISTS ${this.table("threads")} (
        id TEXT PRIMARY KEY,
        resource_id TEXT NOT NULL,
        title TEXT,
        metadata TEXT DEFAULT '{}',
        status TEXT DEFAULT 'active',
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS ${this.table("messages")} (
        id TEXT PRIMARY KEY,
        thread_id TEXT NOT NULL,
        role TEXT NOT NULL,
        content TEXT NOT NULL,
        type TEXT DEFAULT 'text',
        tool_info TEXT,
        metadata TEXT DEFAULT '{}',
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY (thread_id) REFERENCES ${this.table("threads")}(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS ${this.table("workflow_runs")} (
        id TEXT PRIMARY KEY,
        workflow_id TEXT NOT NULL,
        status TEXT NOT NULL,
        trigger_data TEXT,
        output TEXT,
        error TEXT,
        step_results TEXT,
        suspension_data TEXT,
        resource_id TEXT,
        thread_id TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS ${this.table("records")} (
        namespace TEXT NOT NULL,
        key TEXT NOT NULL,
        value TEXT NOT NULL,
        ttl INTEGER,
        metadata TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        PRIMARY KEY (namespace, key)
      );

      CREATE INDEX IF NOT EXISTS idx_threads_resource ON ${this.table("threads")}(resource_id);
      CREATE INDEX IF NOT EXISTS idx_messages_thread ON ${this.table("messages")}(thread_id);
      CREATE INDEX IF NOT EXISTS idx_workflow_runs_workflow ON ${this.table("workflow_runs")}(workflow_id);
      CREATE INDEX IF NOT EXISTS idx_records_namespace ON ${this.table("records")}(namespace);
    `);

    logger.debug("SQLiteStorageAdapter: Migrations complete");
  }

  private mapThread(row: Record<string, unknown>): StorageThread {
    return {
      id: row.id as string,
      resourceId: row.resource_id as string,
      title: row.title as string | undefined,
      metadata: row.metadata ? JSON.parse(row.metadata as string) : undefined,
      status: row.status as StorageThread["status"],
      createdAt: new Date(row.created_at as string),
      updatedAt: new Date(row.updated_at as string),
    };
  }

  private mapMessage(row: Record<string, unknown>): StorageMessage {
    return {
      id: row.id as string,
      threadId: row.thread_id as string,
      role: row.role as StorageMessage["role"],
      content: row.content as string,
      type: row.type as StorageMessage["type"],
      toolInfo: row.tool_info ? JSON.parse(row.tool_info as string) : undefined,
      metadata: row.metadata ? JSON.parse(row.metadata as string) : undefined,
      createdAt: new Date(row.created_at as string),
      updatedAt: new Date(row.updated_at as string),
    };
  }

  private mapWorkflowRun(row: Record<string, unknown>): StorageWorkflowRun {
    return {
      id: row.id as string,
      workflowId: row.workflow_id as string,
      status: row.status as WorkflowRunStatus,
      triggerData: row.trigger_data
        ? JSON.parse(row.trigger_data as string)
        : undefined,
      output: row.output ? JSON.parse(row.output as string) : undefined,
      error: row.error ? JSON.parse(row.error as string) : undefined,
      stepResults: row.step_results
        ? JSON.parse(row.step_results as string)
        : undefined,
      suspensionData: row.suspension_data
        ? JSON.parse(row.suspension_data as string)
        : undefined,
      resourceId: row.resource_id as string | undefined,
      threadId: row.thread_id as string | undefined,
      createdAt: new Date(row.created_at as string),
      updatedAt: new Date(row.updated_at as string),
    };
  }

  private mapRecord(row: Record<string, unknown>): StorageCustomRecord {
    return {
      namespace: row.namespace as string,
      key: row.key as string,
      value: JSON.parse(row.value as string),
      ttl: row.ttl as number | undefined,
      metadata: row.metadata ? JSON.parse(row.metadata as string) : undefined,
      createdAt: new Date(row.created_at as string),
      updatedAt: new Date(row.updated_at as string),
    };
  }
}
