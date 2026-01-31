/**
 * LibSQL Storage Adapter
 *
 * LibSQL (SQLite) storage implementation for lightweight and edge deployments.
 * Supports both local SQLite files and remote Turso databases.
 *
 * Features:
 * - Local file-based storage (SQLite)
 * - Remote Turso database support
 * - Embedded replicas with sync
 * - Lightweight and serverless-ready
 * - ACID compliant transactions
 */

import type { Client, InStatement, InValue } from "@libsql/client";
import type { JsonValue } from "../../types/index.js";
import { BaseStorageProvider } from "../storageProvider.js";
import type {
  StorageBackendType,
  StorageThread,
  StorageMessage,
  StorageWorkflowRun,
  StorageCustomRecord,
  StorageStats,
  StorageHealthResult,
  StorageInitOptions,
  CreateThreadInput,
  UpdateThreadInput,
  CreateMessageInput,
  UpdateMessageInput,
  SaveWorkflowRunInput,
  ThreadQueryOptions,
  MessageQueryOptions,
  WorkflowRunQueryOptions,
  StorageQueryOptions,
  PaginatedResult,
  WorkflowRunStatus,
  StorageWorkflowError,
  StepRunResult,
  SetRecordOptions,
  LibSQLStorageConfig,
} from "../../types/index.js";

/**
 * LibSQL (SQLite) storage implementation
 *
 * Lightweight storage suitable for edge deployments and local development.
 */
export class LibSQLAdapter extends BaseStorageProvider {
  readonly type: StorageBackendType = "libsql";

  /** LibSQL client */
  private client: Client | null = null;

  /** Configuration */
  private config: LibSQLStorageConfig;

  /** Table prefix */
  private tablePrefix: string;

  constructor(config?: LibSQLStorageConfig) {
    super();
    this.config = config || { url: "file:local.db" };
    this.tablePrefix = config?.tablePrefix || "";
  }

  /**
   * Get table name with prefix
   */
  private tableName(name: string): string {
    return `${this.tablePrefix}${name}`;
  }

  // ============================================================================
  // Lifecycle Methods
  // ============================================================================

  async init(options?: StorageInitOptions): Promise<void> {
    if (this.initialized) {
      this.log("debug", "Already initialized");
      return;
    }

    this.log("info", "Initializing LibSQL storage", {
      url: this.config.url.replace(/:[^:]*@/, ":***@"), // Mask credentials
    });

    // Dynamic import of libsql client
    let libsqlModule;
    try {
      libsqlModule = await import("@libsql/client");
    } catch {
      throw new Error(
        `LibSQL client not installed. Run: pnpm add @libsql/client\n` +
          `The '@libsql/client' package is a peer dependency required for LibSQL storage.`,
      );
    }
    const { createClient } = libsqlModule;

    const clientOptions: Record<string, unknown> = {
      url: this.config.url,
    };

    if (this.config.authToken) {
      clientOptions.authToken = this.config.authToken;
    }
    if (this.config.syncUrl) {
      clientOptions.syncUrl = this.config.syncUrl;
    }
    if (this.config.syncIntervalMs) {
      clientOptions.syncInterval = this.config.syncIntervalMs;
    }

    this.client = createClient(
      clientOptions as unknown as Parameters<typeof createClient>[0],
    );

    // Run migrations if requested
    if (options?.runMigrations !== false) {
      await this.runMigrations();
    }

    this.initialized = true;
    this.log("info", "LibSQL storage initialized");
  }

  /**
   * Run database migrations
   */
  private async runMigrations(): Promise<void> {
    if (!this.client) {
      throw new Error("Client not initialized");
    }

    this.log("info", "Running migrations");

    // Create threads table
    await this.client.execute(`
      CREATE TABLE IF NOT EXISTS ${this.tableName("threads")} (
        id TEXT PRIMARY KEY,
        resource_id TEXT NOT NULL,
        title TEXT,
        metadata TEXT DEFAULT '{}',
        status TEXT DEFAULT 'active',
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now'))
      )
    `);

    // Create messages table
    await this.client.execute(`
      CREATE TABLE IF NOT EXISTS ${this.tableName("messages")} (
        id TEXT PRIMARY KEY,
        thread_id TEXT NOT NULL,
        role TEXT NOT NULL,
        content TEXT NOT NULL,
        type TEXT DEFAULT 'text',
        tool_info TEXT,
        metadata TEXT DEFAULT '{}',
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now')),
        FOREIGN KEY (thread_id) REFERENCES ${this.tableName("threads")}(id) ON DELETE CASCADE
      )
    `);

    // Create workflow_runs table
    await this.client.execute(`
      CREATE TABLE IF NOT EXISTS ${this.tableName("workflow_runs")} (
        id TEXT PRIMARY KEY,
        workflow_id TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'pending',
        trigger_data TEXT,
        output TEXT,
        error TEXT,
        step_results TEXT DEFAULT '{}',
        suspension_data TEXT,
        resource_id TEXT,
        thread_id TEXT,
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now')),
        FOREIGN KEY (thread_id) REFERENCES ${this.tableName("threads")}(id) ON DELETE SET NULL
      )
    `);

    // Create custom_records table
    await this.client.execute(`
      CREATE TABLE IF NOT EXISTS ${this.tableName("custom_records")} (
        namespace TEXT NOT NULL,
        key TEXT NOT NULL,
        value TEXT NOT NULL,
        metadata TEXT DEFAULT '{}',
        ttl INTEGER,
        expires_at TEXT,
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now')),
        PRIMARY KEY (namespace, key)
      )
    `);

    // Create indexes
    await this.client.execute(`
      CREATE INDEX IF NOT EXISTS idx_threads_resource_id
      ON ${this.tableName("threads")}(resource_id)
    `);
    await this.client.execute(`
      CREATE INDEX IF NOT EXISTS idx_threads_status
      ON ${this.tableName("threads")}(status)
    `);
    await this.client.execute(`
      CREATE INDEX IF NOT EXISTS idx_messages_thread_id
      ON ${this.tableName("messages")}(thread_id)
    `);
    await this.client.execute(`
      CREATE INDEX IF NOT EXISTS idx_workflow_runs_workflow_id
      ON ${this.tableName("workflow_runs")}(workflow_id)
    `);
    await this.client.execute(`
      CREATE INDEX IF NOT EXISTS idx_workflow_runs_status
      ON ${this.tableName("workflow_runs")}(status)
    `);
    await this.client.execute(`
      CREATE INDEX IF NOT EXISTS idx_custom_records_namespace
      ON ${this.tableName("custom_records")}(namespace)
    `);
    await this.client.execute(`
      CREATE INDEX IF NOT EXISTS idx_custom_records_expires_at
      ON ${this.tableName("custom_records")}(expires_at)
    `);

    this.log("info", "Migrations completed");
  }

  async close(): Promise<void> {
    if (this.client) {
      this.client.close();
      this.client = null;
    }
    this.initialized = false;
    this.log("info", "Connection closed");
  }

  async healthCheck(): Promise<StorageHealthResult> {
    if (!this.client) {
      return this.createHealthError("Client not initialized");
    }

    try {
      const { result, latencyMs } = await this.measureLatency(async () => {
        await this.client!.execute("SELECT 1");
        return true;
      });

      if (result) {
        return this.createHealthSuccess(latencyMs);
      }
      return this.createHealthError("Health check query failed");
    } catch (error) {
      return this.createHealthError(error);
    }
  }

  // ============================================================================
  // Thread Operations
  // ============================================================================

  async createThread(input: CreateThreadInput): Promise<StorageThread> {
    this.ensureInitialized();

    const id = this.generateId();
    const now = new Date().toISOString();

    await this.client!.execute({
      sql: `INSERT INTO ${this.tableName("threads")}
            (id, resource_id, title, metadata, status, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?)`,
      args: [
        id,
        input.resourceId,
        input.title || null,
        JSON.stringify(input.metadata || {}),
        input.status || "active",
        now,
        now,
      ],
    });

    return {
      id,
      resourceId: input.resourceId,
      title: input.title,
      metadata: input.metadata,
      status: input.status || "active",
      createdAt: new Date(now),
      updatedAt: new Date(now),
    };
  }

  async getThread(threadId: string): Promise<StorageThread | null> {
    this.ensureInitialized();

    const result = await this.client!.execute({
      sql: `SELECT * FROM ${this.tableName("threads")} WHERE id = ?`,
      args: [threadId],
    });

    if (result.rows.length === 0) {
      return null;
    }
    return this.mapThreadRow(result.rows[0] as Record<string, unknown>);
  }

  async updateThread(
    threadId: string,
    updates: UpdateThreadInput,
  ): Promise<StorageThread | null> {
    this.ensureInitialized();

    const setClauses: string[] = ["updated_at = datetime('now')"];
    const args: InValue[] = [];

    if (updates.resourceId !== undefined) {
      setClauses.push("resource_id = ?");
      args.push(updates.resourceId);
    }
    if (updates.title !== undefined) {
      setClauses.push("title = ?");
      args.push(updates.title);
    }
    if (updates.metadata !== undefined) {
      setClauses.push("metadata = ?");
      args.push(JSON.stringify(updates.metadata));
    }
    if (updates.status !== undefined) {
      setClauses.push("status = ?");
      args.push(updates.status);
    }

    args.push(threadId);

    await this.client!.execute({
      sql: `UPDATE ${this.tableName("threads")}
            SET ${setClauses.join(", ")}
            WHERE id = ?`,
      args,
    });

    return this.getThread(threadId);
  }

  async deleteThread(threadId: string): Promise<boolean> {
    this.ensureInitialized();

    // Delete messages first (due to foreign key)
    await this.deleteMessagesByThreadId(threadId);

    const result = await this.client!.execute({
      sql: `DELETE FROM ${this.tableName("threads")} WHERE id = ?`,
      args: [threadId],
    });

    return (result.rowsAffected || 0) > 0;
  }

  async listThreads(
    options?: ThreadQueryOptions,
  ): Promise<PaginatedResult<StorageThread>> {
    this.ensureInitialized();

    let whereClause = "WHERE 1=1";
    const args: InValue[] = [];

    if (options?.resourceId) {
      whereClause += " AND resource_id = ?";
      args.push(options.resourceId);
    }
    if (options?.status) {
      whereClause += " AND status = ?";
      args.push(options.status);
    }

    const limit = options?.limit || 50;
    const offset = options?.offset || 0;

    // Count query
    const countResult = await this.client!.execute({
      sql: `SELECT COUNT(*) as count FROM ${this.tableName("threads")} ${whereClause}`,
      args,
    });
    const total = Number(countResult.rows[0].count);

    // Data query
    const result = await this.client!.execute({
      sql: `SELECT * FROM ${this.tableName("threads")}
            ${whereClause}
            ORDER BY updated_at DESC
            LIMIT ? OFFSET ?`,
      args: [...args, limit, offset],
    });

    return {
      data: result.rows.map((row: Record<string, unknown>) =>
        this.mapThreadRow(row),
      ),
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

  private mapThreadRow(row: Record<string, unknown>): StorageThread {
    return {
      id: row.id as string,
      resourceId: row.resource_id as string,
      title: row.title as string | undefined,
      metadata: row.metadata
        ? this.safeJsonParse(row.metadata as string, {})
        : undefined,
      status: row.status as StorageThread["status"],
      createdAt: new Date(row.created_at as string),
      updatedAt: new Date(row.updated_at as string),
    };
  }

  // ============================================================================
  // Message Operations
  // ============================================================================

  async createMessage(input: CreateMessageInput): Promise<StorageMessage> {
    this.ensureInitialized();

    const id = this.generateId();
    const now = new Date().toISOString();

    await this.client!.execute({
      sql: `INSERT INTO ${this.tableName("messages")}
            (id, thread_id, role, content, type, tool_info, metadata, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        id,
        input.threadId,
        input.role,
        input.content,
        input.type || "text",
        input.toolInfo ? JSON.stringify(input.toolInfo) : null,
        JSON.stringify(input.metadata || {}),
        now,
        now,
      ],
    });

    return {
      id,
      threadId: input.threadId,
      role: input.role,
      content: input.content,
      type: input.type || "text",
      toolInfo: input.toolInfo,
      metadata: input.metadata,
      createdAt: new Date(now),
      updatedAt: new Date(now),
    };
  }

  async createMessages(
    inputs: CreateMessageInput[],
  ): Promise<StorageMessage[]> {
    this.ensureInitialized();
    if (inputs.length === 0) {
      return [];
    }

    const messages: StorageMessage[] = [];
    const now = new Date().toISOString();

    // Build batch statements
    const statements: InStatement[] = inputs.map((input) => {
      const id = this.generateId();
      messages.push({
        id,
        threadId: input.threadId,
        role: input.role,
        content: input.content,
        type: input.type || "text",
        toolInfo: input.toolInfo,
        metadata: input.metadata,
        createdAt: new Date(now),
        updatedAt: new Date(now),
      });

      return {
        sql: `INSERT INTO ${this.tableName("messages")}
              (id, thread_id, role, content, type, tool_info, metadata, created_at, updated_at)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [
          id,
          input.threadId,
          input.role,
          input.content,
          input.type || "text",
          input.toolInfo ? JSON.stringify(input.toolInfo) : null,
          JSON.stringify(input.metadata || {}),
          now,
          now,
        ],
      };
    });

    await this.client!.batch(statements, "write");
    return messages;
  }

  async getMessage(messageId: string): Promise<StorageMessage | null> {
    this.ensureInitialized();

    const result = await this.client!.execute({
      sql: `SELECT * FROM ${this.tableName("messages")} WHERE id = ?`,
      args: [messageId],
    });

    if (result.rows.length === 0) {
      return null;
    }
    return this.mapMessageRow(result.rows[0] as Record<string, unknown>);
  }

  async updateMessage(
    messageId: string,
    updates: UpdateMessageInput,
  ): Promise<StorageMessage | null> {
    this.ensureInitialized();

    const setClauses: string[] = ["updated_at = datetime('now')"];
    const args: InValue[] = [];

    if (updates.role !== undefined) {
      setClauses.push("role = ?");
      args.push(updates.role);
    }
    if (updates.content !== undefined) {
      setClauses.push("content = ?");
      args.push(updates.content);
    }
    if (updates.type !== undefined) {
      setClauses.push("type = ?");
      args.push(updates.type);
    }
    if (updates.toolInfo !== undefined) {
      setClauses.push("tool_info = ?");
      args.push(JSON.stringify(updates.toolInfo));
    }
    if (updates.metadata !== undefined) {
      setClauses.push("metadata = ?");
      args.push(JSON.stringify(updates.metadata));
    }

    args.push(messageId);

    await this.client!.execute({
      sql: `UPDATE ${this.tableName("messages")}
            SET ${setClauses.join(", ")}
            WHERE id = ?`,
      args,
    });

    return this.getMessage(messageId);
  }

  async deleteMessage(messageId: string): Promise<boolean> {
    this.ensureInitialized();

    const result = await this.client!.execute({
      sql: `DELETE FROM ${this.tableName("messages")} WHERE id = ?`,
      args: [messageId],
    });

    return (result.rowsAffected || 0) > 0;
  }

  async listMessages(
    options: MessageQueryOptions,
  ): Promise<PaginatedResult<StorageMessage>> {
    this.ensureInitialized();

    let whereClause = "WHERE thread_id = ?";
    const args: InValue[] = [options.threadId];

    if (options.role) {
      whereClause += " AND role = ?";
      args.push(options.role);
    }
    if (options.type) {
      whereClause += " AND type = ?";
      args.push(options.type);
    }
    if (options.dateRange?.from) {
      whereClause += " AND created_at >= ?";
      args.push(options.dateRange.from.toISOString());
    }
    if (options.dateRange?.to) {
      whereClause += " AND created_at <= ?";
      args.push(options.dateRange.to.toISOString());
    }

    const limit = options.limit || 100;
    const offset = options.offset || 0;

    // Count query
    const countResult = await this.client!.execute({
      sql: `SELECT COUNT(*) as count FROM ${this.tableName("messages")} ${whereClause}`,
      args,
    });
    const total = Number(countResult.rows[0].count);

    // Data query
    const result = await this.client!.execute({
      sql: `SELECT * FROM ${this.tableName("messages")}
            ${whereClause}
            ORDER BY created_at ASC
            LIMIT ? OFFSET ?`,
      args: [...args, limit, offset],
    });

    return {
      data: result.rows.map((row: Record<string, unknown>) =>
        this.mapMessageRow(row),
      ),
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

    const result = await this.client!.execute({
      sql: `DELETE FROM ${this.tableName("messages")} WHERE thread_id = ?`,
      args: [threadId],
    });

    return result.rowsAffected || 0;
  }

  private mapMessageRow(row: Record<string, unknown>): StorageMessage {
    return {
      id: row.id as string,
      threadId: row.thread_id as string,
      role: row.role as StorageMessage["role"],
      content: row.content as string,
      type: row.type as StorageMessage["type"],
      toolInfo: row.tool_info
        ? this.safeJsonParse(row.tool_info as string, undefined)
        : undefined,
      metadata: row.metadata
        ? this.safeJsonParse(row.metadata as string, {})
        : undefined,
      createdAt: new Date(row.created_at as string),
      updatedAt: new Date(row.updated_at as string),
    };
  }

  // ============================================================================
  // Workflow Run Operations
  // ============================================================================

  async saveWorkflowRun(
    input: SaveWorkflowRunInput,
  ): Promise<StorageWorkflowRun> {
    this.ensureInitialized();

    const id = input.id || this.generateId();
    const now = new Date().toISOString();

    // Check if exists for upsert
    const existing = await this.client!.execute({
      sql: `SELECT created_at FROM ${this.tableName("workflow_runs")} WHERE id = ?`,
      args: [id],
    });

    const createdAt =
      existing.rows.length > 0 ? (existing.rows[0].created_at as string) : now;

    await this.client!.execute({
      sql: `INSERT OR REPLACE INTO ${this.tableName("workflow_runs")}
            (id, workflow_id, status, trigger_data, output, error, step_results,
             suspension_data, resource_id, thread_id, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        id,
        input.workflowId,
        input.status,
        input.triggerData ? JSON.stringify(input.triggerData) : null,
        input.output !== undefined ? JSON.stringify(input.output) : null,
        input.error ? JSON.stringify(input.error) : null,
        JSON.stringify(input.stepResults || {}),
        input.suspensionData ? JSON.stringify(input.suspensionData) : null,
        input.resourceId || null,
        input.threadId || null,
        createdAt,
        now,
      ],
    });

    return {
      id,
      workflowId: input.workflowId,
      status: input.status,
      triggerData: input.triggerData,
      output: input.output,
      error: input.error,
      stepResults: input.stepResults,
      suspensionData: input.suspensionData,
      resourceId: input.resourceId,
      threadId: input.threadId,
      createdAt: new Date(createdAt),
      updatedAt: new Date(now),
    };
  }

  async getWorkflowRun(runId: string): Promise<StorageWorkflowRun | null> {
    this.ensureInitialized();

    const result = await this.client!.execute({
      sql: `SELECT * FROM ${this.tableName("workflow_runs")} WHERE id = ?`,
      args: [runId],
    });

    if (result.rows.length === 0) {
      return null;
    }
    return this.mapWorkflowRunRow(result.rows[0] as Record<string, unknown>);
  }

  async listWorkflowRuns(
    options?: WorkflowRunQueryOptions,
  ): Promise<PaginatedResult<StorageWorkflowRun>> {
    this.ensureInitialized();

    let whereClause = "WHERE 1=1";
    const args: InValue[] = [];

    if (options?.workflowId) {
      whereClause += " AND workflow_id = ?";
      args.push(options.workflowId);
    }
    if (options?.status) {
      whereClause += " AND status = ?";
      args.push(options.status);
    }
    if (options?.resourceId) {
      whereClause += " AND resource_id = ?";
      args.push(options.resourceId);
    }
    if (options?.threadId) {
      whereClause += " AND thread_id = ?";
      args.push(options.threadId);
    }

    const limit = options?.limit || 50;
    const offset = options?.offset || 0;

    // Count query
    const countResult = await this.client!.execute({
      sql: `SELECT COUNT(*) as count FROM ${this.tableName("workflow_runs")} ${whereClause}`,
      args,
    });
    const total = Number(countResult.rows[0].count);

    // Data query
    const result = await this.client!.execute({
      sql: `SELECT * FROM ${this.tableName("workflow_runs")}
            ${whereClause}
            ORDER BY created_at DESC
            LIMIT ? OFFSET ?`,
      args: [...args, limit, offset],
    });

    return {
      data: result.rows.map((row: Record<string, unknown>) =>
        this.mapWorkflowRunRow(row),
      ),
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

    const setClauses: string[] = ["status = ?", "updated_at = datetime('now')"];
    const args: InValue[] = [status];

    if (output !== undefined) {
      setClauses.push("output = ?");
      args.push(JSON.stringify(output));
    }
    if (error) {
      setClauses.push("error = ?");
      args.push(JSON.stringify(error));
    }

    args.push(runId);

    await this.client!.execute({
      sql: `UPDATE ${this.tableName("workflow_runs")}
            SET ${setClauses.join(", ")}
            WHERE id = ?`,
      args,
    });

    return this.getWorkflowRun(runId);
  }

  async updateStepResult(
    runId: string,
    stepId: string,
    result: StepRunResult,
  ): Promise<boolean> {
    this.ensureInitialized();

    // Get current step_results
    const run = await this.getWorkflowRun(runId);
    if (!run) {
      return false;
    }

    const stepResults = run.stepResults || {};
    stepResults[stepId] = result;

    const updateResult = await this.client!.execute({
      sql: `UPDATE ${this.tableName("workflow_runs")}
            SET step_results = ?, updated_at = datetime('now')
            WHERE id = ?`,
      args: [JSON.stringify(stepResults), runId],
    });

    return (updateResult.rowsAffected || 0) > 0;
  }

  async getWorkflowRunsByWorkflowId(
    workflowId: string,
    options?: StorageQueryOptions,
  ): Promise<PaginatedResult<StorageWorkflowRun>> {
    return this.listWorkflowRuns({ ...options, workflowId });
  }

  private mapWorkflowRunRow(row: Record<string, unknown>): StorageWorkflowRun {
    return {
      id: row.id as string,
      workflowId: row.workflow_id as string,
      status: row.status as WorkflowRunStatus,
      triggerData: row.trigger_data
        ? this.safeJsonParse(row.trigger_data as string, undefined)
        : undefined,
      output: row.output
        ? this.safeJsonParse(row.output as string, undefined)
        : undefined,
      error: row.error
        ? this.safeJsonParse(row.error as string, undefined)
        : undefined,
      stepResults: row.step_results
        ? this.safeJsonParse(row.step_results as string, {})
        : {},
      suspensionData: row.suspension_data
        ? this.safeJsonParse(row.suspension_data as string, undefined)
        : undefined,
      resourceId: row.resource_id as string | undefined,
      threadId: row.thread_id as string | undefined,
      createdAt: new Date(row.created_at as string),
      updatedAt: new Date(row.updated_at as string),
    };
  }

  // ============================================================================
  // Custom Record Operations
  // ============================================================================

  async setRecord(
    namespace: string,
    key: string,
    value: JsonValue,
    options?: SetRecordOptions,
  ): Promise<StorageCustomRecord> {
    this.ensureInitialized();

    const now = new Date().toISOString();
    const expiresAt = options?.ttl
      ? new Date(Date.now() + options.ttl * 1000).toISOString()
      : null;

    // Check if exists for upsert
    const existing = await this.client!.execute({
      sql: `SELECT created_at FROM ${this.tableName("custom_records")} WHERE namespace = ? AND key = ?`,
      args: [namespace, key],
    });

    const createdAt =
      existing.rows.length > 0 ? (existing.rows[0].created_at as string) : now;

    await this.client!.execute({
      sql: `INSERT OR REPLACE INTO ${this.tableName("custom_records")}
            (namespace, key, value, metadata, ttl, expires_at, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        namespace,
        key,
        JSON.stringify(value),
        JSON.stringify(options?.metadata || {}),
        options?.ttl || null,
        expiresAt,
        createdAt,
        now,
      ],
    });

    return {
      namespace,
      key,
      value,
      metadata: options?.metadata,
      ttl: options?.ttl,
      createdAt: new Date(createdAt),
      updatedAt: new Date(now),
    };
  }

  async getRecord(
    namespace: string,
    key: string,
  ): Promise<StorageCustomRecord | null> {
    this.ensureInitialized();

    const result = await this.client!.execute({
      sql: `SELECT * FROM ${this.tableName("custom_records")}
            WHERE namespace = ? AND key = ?
            AND (expires_at IS NULL OR expires_at > datetime('now'))`,
      args: [namespace, key],
    });

    if (result.rows.length === 0) {
      return null;
    }
    return this.mapCustomRecordRow(result.rows[0] as Record<string, unknown>);
  }

  async deleteRecord(namespace: string, key: string): Promise<boolean> {
    this.ensureInitialized();

    const result = await this.client!.execute({
      sql: `DELETE FROM ${this.tableName("custom_records")} WHERE namespace = ? AND key = ?`,
      args: [namespace, key],
    });

    return (result.rowsAffected || 0) > 0;
  }

  async listRecords(
    namespace: string,
    options?: StorageQueryOptions,
  ): Promise<PaginatedResult<StorageCustomRecord>> {
    this.ensureInitialized();

    const limit = options?.limit || 100;
    const offset = options?.offset || 0;

    // Count query (excluding expired)
    const countResult = await this.client!.execute({
      sql: `SELECT COUNT(*) as count FROM ${this.tableName("custom_records")}
            WHERE namespace = ? AND (expires_at IS NULL OR expires_at > datetime('now'))`,
      args: [namespace],
    });
    const total = Number(countResult.rows[0].count);

    // Data query
    const result = await this.client!.execute({
      sql: `SELECT * FROM ${this.tableName("custom_records")}
            WHERE namespace = ? AND (expires_at IS NULL OR expires_at > datetime('now'))
            ORDER BY updated_at DESC
            LIMIT ? OFFSET ?`,
      args: [namespace, limit, offset],
    });

    return {
      data: result.rows.map((row: Record<string, unknown>) =>
        this.mapCustomRecordRow(row),
      ),
      total,
      hasMore: offset + limit < total,
    };
  }

  async hasRecord(namespace: string, key: string): Promise<boolean> {
    this.ensureInitialized();

    const result = await this.client!.execute({
      sql: `SELECT 1 FROM ${this.tableName("custom_records")}
            WHERE namespace = ? AND key = ?
            AND (expires_at IS NULL OR expires_at > datetime('now'))`,
      args: [namespace, key],
    });

    return result.rows.length > 0;
  }

  async deleteNamespace(namespace: string): Promise<number> {
    this.ensureInitialized();

    const result = await this.client!.execute({
      sql: `DELETE FROM ${this.tableName("custom_records")} WHERE namespace = ?`,
      args: [namespace],
    });

    return result.rowsAffected || 0;
  }

  private mapCustomRecordRow(
    row: Record<string, unknown>,
  ): StorageCustomRecord {
    return {
      namespace: row.namespace as string,
      key: row.key as string,
      value: this.safeJsonParse(row.value as string, null),
      metadata: row.metadata
        ? this.safeJsonParse(row.metadata as string, {})
        : undefined,
      ttl: row.ttl as number | undefined,
      createdAt: new Date(row.created_at as string),
      updatedAt: new Date(row.updated_at as string),
    };
  }

  // ============================================================================
  // Utility Methods
  // ============================================================================

  async getStats(): Promise<StorageStats> {
    this.ensureInitialized();

    const [threads, messages, runs, records] = await Promise.all([
      this.client!.execute(
        `SELECT COUNT(*) as count FROM ${this.tableName("threads")}`,
      ),
      this.client!.execute(
        `SELECT COUNT(*) as count FROM ${this.tableName("messages")}`,
      ),
      this.client!.execute(
        `SELECT COUNT(*) as count FROM ${this.tableName("workflow_runs")}`,
      ),
      this.client!.execute(
        `SELECT COUNT(*) as count FROM ${this.tableName("custom_records")}
         WHERE expires_at IS NULL OR expires_at > datetime('now')`,
      ),
    ]);

    return {
      threadCount: Number(threads.rows[0].count),
      messageCount: Number(messages.rows[0].count),
      workflowRunCount: Number(runs.rows[0].count),
      customRecordCount: Number(records.rows[0].count),
    };
  }

  async clearAll(): Promise<void> {
    this.ensureInitialized();

    await this.client!.batch(
      [
        `DELETE FROM ${this.tableName("messages")}`,
        `DELETE FROM ${this.tableName("threads")}`,
        `DELETE FROM ${this.tableName("workflow_runs")}`,
        `DELETE FROM ${this.tableName("custom_records")}`,
      ],
      "write",
    );

    this.log("warn", "All data cleared");
  }

  /**
   * Clean up expired custom records
   */
  async cleanupExpiredRecords(): Promise<number> {
    this.ensureInitialized();

    const result = await this.client!.execute({
      sql: `DELETE FROM ${this.tableName("custom_records")}
            WHERE expires_at IS NOT NULL AND expires_at <= datetime('now')`,
      args: [],
    });

    const deleted = result.rowsAffected || 0;
    if (deleted > 0) {
      this.log("debug", `Cleaned up ${deleted} expired records`);
    }

    return deleted;
  }

  /**
   * Sync embedded replica (for Turso embedded replicas)
   */
  async sync(): Promise<void> {
    if (this.client && "sync" in this.client) {
      await (this.client as unknown as { sync: () => Promise<void> }).sync();
      this.log("debug", "Replica synced");
    }
  }
}
