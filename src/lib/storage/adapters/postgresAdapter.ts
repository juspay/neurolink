/**
 * PostgreSQL Storage Adapter
 *
 * Production-ready PostgreSQL storage implementation with full ACID compliance.
 * Uses connection pooling for efficient resource management.
 *
 * Features:
 * - Full CRUD operations for all entity types
 * - Connection pooling with configurable limits
 * - Schema isolation with custom schema support
 * - Automatic table creation and migrations
 * - Efficient batch operations
 * - JSONB support for flexible metadata
 */

import type { Pool, PoolConfig } from "pg";
import type { JsonValue, JsonObject } from "../../types/index.js";
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
  PostgresStorageConfig,
} from "../../types/index.js";

/**
 * PostgreSQL storage implementation
 *
 * Production-ready storage with full ACID compliance and connection pooling.
 */
export class PostgresAdapter extends BaseStorageProvider {
  readonly type: StorageBackendType = "postgresql";

  /** Connection pool */
  private pool: Pool | null = null;

  /** Configuration */
  private config: PostgresStorageConfig;

  /** Schema name */
  private schema: string;

  /** Table prefix */
  private tablePrefix: string;

  constructor(config?: PostgresStorageConfig) {
    super();
    this.config = config || {};
    this.schema = config?.schema || "neurolink";
    this.tablePrefix = config?.tablePrefix || "";
  }

  /**
   * Get fully qualified table name
   */
  private tableName(name: string): string {
    return `"${this.schema}"."${this.tablePrefix}${name}"`;
  }

  // ============================================================================
  // Lifecycle Methods
  // ============================================================================

  async init(options?: StorageInitOptions): Promise<void> {
    if (this.initialized) {
      this.log("debug", "Already initialized");
      return;
    }

    this.log("info", "Initializing PostgreSQL storage", {
      schema: this.schema,
    });

    // Dynamic import of pg module
    let pgModule;
    try {
      pgModule = await import("pg");
    } catch {
      throw new Error(
        `PostgreSQL driver not installed. Run: pnpm add pg\n` +
          `The 'pg' package is a peer dependency required for PostgreSQL storage.`,
      );
    }
    const { Pool } = pgModule;

    // Build pool configuration
    const poolConfig: PoolConfig = this.config.connectionString
      ? { connectionString: this.config.connectionString }
      : {
          host: this.config.host || "localhost",
          port: this.config.port || 5432,
          database: this.config.database || "neurolink",
          user: this.config.user,
          password: this.config.password,
        };

    // Add SSL configuration
    if (this.config.ssl) {
      poolConfig.ssl =
        typeof this.config.ssl === "boolean"
          ? { rejectUnauthorized: false }
          : this.config.ssl;
    }

    // Add pool size configuration
    if (this.config.poolSize) {
      poolConfig.max = this.config.poolSize;
    }
    if (this.config.idleTimeoutMs) {
      poolConfig.idleTimeoutMillis = this.config.idleTimeoutMs;
    }
    if (this.config.connectionTimeoutMs) {
      poolConfig.connectionTimeoutMillis = this.config.connectionTimeoutMs;
    }

    this.pool = new Pool(poolConfig);

    // Create schema if not exists
    await this.pool.query(`CREATE SCHEMA IF NOT EXISTS "${this.schema}"`);

    // Run migrations if requested
    if (options?.runMigrations !== false) {
      await this.runMigrations();
    }

    this.initialized = true;
    this.log("info", "PostgreSQL storage initialized");
  }

  /**
   * Run database migrations
   */
  private async runMigrations(): Promise<void> {
    if (!this.pool) {
      throw new Error("Pool not initialized");
    }

    this.log("info", "Running migrations");

    // Create threads table
    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS ${this.tableName("threads")} (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        resource_id VARCHAR(255) NOT NULL,
        title VARCHAR(500),
        metadata JSONB DEFAULT '{}',
        status VARCHAR(50) DEFAULT 'active',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `);

    // Create messages table
    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS ${this.tableName("messages")} (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        thread_id UUID NOT NULL REFERENCES ${this.tableName("threads")}(id) ON DELETE CASCADE,
        role VARCHAR(50) NOT NULL,
        content TEXT NOT NULL,
        type VARCHAR(50) DEFAULT 'text',
        tool_info JSONB,
        metadata JSONB DEFAULT '{}',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `);

    // Create workflow_runs table
    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS ${this.tableName("workflow_runs")} (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        workflow_id VARCHAR(255) NOT NULL,
        status VARCHAR(50) NOT NULL DEFAULT 'pending',
        trigger_data JSONB,
        output JSONB,
        error JSONB,
        step_results JSONB DEFAULT '{}',
        suspension_data JSONB,
        resource_id VARCHAR(255),
        thread_id UUID REFERENCES ${this.tableName("threads")}(id) ON DELETE SET NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `);

    // Create custom_records table
    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS ${this.tableName("custom_records")} (
        namespace VARCHAR(255) NOT NULL,
        key VARCHAR(255) NOT NULL,
        value JSONB NOT NULL,
        metadata JSONB DEFAULT '{}',
        ttl INTEGER,
        expires_at TIMESTAMP WITH TIME ZONE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        PRIMARY KEY (namespace, key)
      )
    `);

    // Create indexes
    await this.pool.query(`
      CREATE INDEX IF NOT EXISTS idx_threads_resource_id
      ON ${this.tableName("threads")}(resource_id)
    `);
    await this.pool.query(`
      CREATE INDEX IF NOT EXISTS idx_threads_status
      ON ${this.tableName("threads")}(status)
    `);
    await this.pool.query(`
      CREATE INDEX IF NOT EXISTS idx_messages_thread_id
      ON ${this.tableName("messages")}(thread_id)
    `);
    await this.pool.query(`
      CREATE INDEX IF NOT EXISTS idx_messages_created_at
      ON ${this.tableName("messages")}(created_at)
    `);
    await this.pool.query(`
      CREATE INDEX IF NOT EXISTS idx_workflow_runs_workflow_id
      ON ${this.tableName("workflow_runs")}(workflow_id)
    `);
    await this.pool.query(`
      CREATE INDEX IF NOT EXISTS idx_workflow_runs_status
      ON ${this.tableName("workflow_runs")}(status)
    `);
    await this.pool.query(`
      CREATE INDEX IF NOT EXISTS idx_custom_records_expires_at
      ON ${this.tableName("custom_records")}(expires_at)
      WHERE expires_at IS NOT NULL
    `);

    this.log("info", "Migrations completed");
  }

  async close(): Promise<void> {
    if (this.pool) {
      await this.pool.end();
      this.pool = null;
    }
    this.initialized = false;
    this.log("info", "Connection closed");
  }

  async healthCheck(): Promise<StorageHealthResult> {
    if (!this.pool) {
      return this.createHealthError("Pool not initialized");
    }

    try {
      const { result, latencyMs } = await this.measureLatency(async () => {
        const res = await this.pool!.query("SELECT 1 as health");
        return res.rowCount === 1;
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

    const result = await this.pool!.query(
      `INSERT INTO ${this.tableName("threads")}
       (resource_id, title, metadata, status)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [
        input.resourceId,
        input.title || null,
        JSON.stringify(input.metadata || {}),
        input.status || "active",
      ],
    );

    return this.mapThreadRow(result.rows[0]);
  }

  async getThread(threadId: string): Promise<StorageThread | null> {
    this.ensureInitialized();

    const result = await this.pool!.query(
      `SELECT * FROM ${this.tableName("threads")} WHERE id = $1`,
      [threadId],
    );

    return result.rows[0] ? this.mapThreadRow(result.rows[0]) : null;
  }

  async updateThread(
    threadId: string,
    updates: UpdateThreadInput,
  ): Promise<StorageThread | null> {
    this.ensureInitialized();

    const setClauses: string[] = ["updated_at = NOW()"];
    const values: unknown[] = [];
    let paramIndex = 1;

    if (updates.resourceId !== undefined) {
      setClauses.push(`resource_id = $${paramIndex++}`);
      values.push(updates.resourceId);
    }
    if (updates.title !== undefined) {
      setClauses.push(`title = $${paramIndex++}`);
      values.push(updates.title);
    }
    if (updates.metadata !== undefined) {
      setClauses.push(`metadata = $${paramIndex++}`);
      values.push(JSON.stringify(updates.metadata));
    }
    if (updates.status !== undefined) {
      setClauses.push(`status = $${paramIndex++}`);
      values.push(updates.status);
    }

    values.push(threadId);

    const result = await this.pool!.query(
      `UPDATE ${this.tableName("threads")}
       SET ${setClauses.join(", ")}
       WHERE id = $${paramIndex}
       RETURNING *`,
      values,
    );

    return result.rows[0] ? this.mapThreadRow(result.rows[0]) : null;
  }

  async deleteThread(threadId: string): Promise<boolean> {
    this.ensureInitialized();

    const result = await this.pool!.query(
      `DELETE FROM ${this.tableName("threads")} WHERE id = $1`,
      [threadId],
    );

    return (result.rowCount || 0) > 0;
  }

  async listThreads(
    options?: ThreadQueryOptions,
  ): Promise<PaginatedResult<StorageThread>> {
    this.ensureInitialized();

    let whereClause = "WHERE 1=1";
    const values: unknown[] = [];
    let paramIndex = 1;

    if (options?.resourceId) {
      whereClause += ` AND resource_id = $${paramIndex++}`;
      values.push(options.resourceId);
    }
    if (options?.status) {
      whereClause += ` AND status = $${paramIndex++}`;
      values.push(options.status);
    }

    const limit = options?.limit || 50;
    const offset = options?.offset || 0;

    // Count query
    const countResult = await this.pool!.query(
      `SELECT COUNT(*) FROM ${this.tableName("threads")} ${whereClause}`,
      values,
    );
    const total = parseInt(countResult.rows[0].count, 10);

    // Data query
    const result = await this.pool!.query(
      `SELECT * FROM ${this.tableName("threads")}
       ${whereClause}
       ORDER BY updated_at DESC
       LIMIT $${paramIndex++} OFFSET $${paramIndex}`,
      [...values, limit, offset],
    );

    return {
      data: result.rows.map((row) =>
        this.mapThreadRow(row as Record<string, unknown>),
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
      metadata: row.metadata as JsonObject | undefined,
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

    const result = await this.pool!.query(
      `INSERT INTO ${this.tableName("messages")}
       (thread_id, role, content, type, tool_info, metadata)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [
        input.threadId,
        input.role,
        input.content,
        input.type || "text",
        input.toolInfo ? JSON.stringify(input.toolInfo) : null,
        JSON.stringify(input.metadata || {}),
      ],
    );

    return this.mapMessageRow(result.rows[0]);
  }

  async createMessages(
    inputs: CreateMessageInput[],
  ): Promise<StorageMessage[]> {
    this.ensureInitialized();
    if (inputs.length === 0) {
      return [];
    }

    // Build bulk insert
    const values: unknown[] = [];
    const placeholders: string[] = [];
    let paramIndex = 1;

    for (const input of inputs) {
      placeholders.push(
        `($${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++})`,
      );
      values.push(
        input.threadId,
        input.role,
        input.content,
        input.type || "text",
        input.toolInfo ? JSON.stringify(input.toolInfo) : null,
        JSON.stringify(input.metadata || {}),
      );
    }

    const result = await this.pool!.query(
      `INSERT INTO ${this.tableName("messages")}
       (thread_id, role, content, type, tool_info, metadata)
       VALUES ${placeholders.join(", ")}
       RETURNING *`,
      values,
    );

    return result.rows.map((row) =>
      this.mapMessageRow(row as Record<string, unknown>),
    );
  }

  async getMessage(messageId: string): Promise<StorageMessage | null> {
    this.ensureInitialized();

    const result = await this.pool!.query(
      `SELECT * FROM ${this.tableName("messages")} WHERE id = $1`,
      [messageId],
    );

    return result.rows[0] ? this.mapMessageRow(result.rows[0]) : null;
  }

  async updateMessage(
    messageId: string,
    updates: UpdateMessageInput,
  ): Promise<StorageMessage | null> {
    this.ensureInitialized();

    const setClauses: string[] = ["updated_at = NOW()"];
    const values: unknown[] = [];
    let paramIndex = 1;

    if (updates.role !== undefined) {
      setClauses.push(`role = $${paramIndex++}`);
      values.push(updates.role);
    }
    if (updates.content !== undefined) {
      setClauses.push(`content = $${paramIndex++}`);
      values.push(updates.content);
    }
    if (updates.type !== undefined) {
      setClauses.push(`type = $${paramIndex++}`);
      values.push(updates.type);
    }
    if (updates.toolInfo !== undefined) {
      setClauses.push(`tool_info = $${paramIndex++}`);
      values.push(JSON.stringify(updates.toolInfo));
    }
    if (updates.metadata !== undefined) {
      setClauses.push(`metadata = $${paramIndex++}`);
      values.push(JSON.stringify(updates.metadata));
    }

    values.push(messageId);

    const result = await this.pool!.query(
      `UPDATE ${this.tableName("messages")}
       SET ${setClauses.join(", ")}
       WHERE id = $${paramIndex}
       RETURNING *`,
      values,
    );

    return result.rows[0] ? this.mapMessageRow(result.rows[0]) : null;
  }

  async deleteMessage(messageId: string): Promise<boolean> {
    this.ensureInitialized();

    const result = await this.pool!.query(
      `DELETE FROM ${this.tableName("messages")} WHERE id = $1`,
      [messageId],
    );

    return (result.rowCount || 0) > 0;
  }

  async listMessages(
    options: MessageQueryOptions,
  ): Promise<PaginatedResult<StorageMessage>> {
    this.ensureInitialized();

    let whereClause = "WHERE thread_id = $1";
    const values: unknown[] = [options.threadId];
    let paramIndex = 2;

    if (options.role) {
      whereClause += ` AND role = $${paramIndex++}`;
      values.push(options.role);
    }
    if (options.type) {
      whereClause += ` AND type = $${paramIndex++}`;
      values.push(options.type);
    }
    if (options.dateRange?.from) {
      whereClause += ` AND created_at >= $${paramIndex++}`;
      values.push(options.dateRange.from);
    }
    if (options.dateRange?.to) {
      whereClause += ` AND created_at <= $${paramIndex++}`;
      values.push(options.dateRange.to);
    }

    const limit = options.limit || 100;
    const offset = options.offset || 0;

    // Count query
    const countResult = await this.pool!.query(
      `SELECT COUNT(*) FROM ${this.tableName("messages")} ${whereClause}`,
      values,
    );
    const total = parseInt(countResult.rows[0].count, 10);

    // Data query
    const result = await this.pool!.query(
      `SELECT * FROM ${this.tableName("messages")}
       ${whereClause}
       ORDER BY created_at ASC
       LIMIT $${paramIndex++} OFFSET $${paramIndex}`,
      [...values, limit, offset],
    );

    return {
      data: result.rows.map((row) =>
        this.mapMessageRow(row as Record<string, unknown>),
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

    const result = await this.pool!.query(
      `DELETE FROM ${this.tableName("messages")} WHERE thread_id = $1`,
      [threadId],
    );

    return result.rowCount || 0;
  }

  private mapMessageRow(row: Record<string, unknown>): StorageMessage {
    return {
      id: row.id as string,
      threadId: row.thread_id as string,
      role: row.role as StorageMessage["role"],
      content: row.content as string,
      type: row.type as StorageMessage["type"],
      toolInfo: row.tool_info as StorageMessage["toolInfo"],
      metadata: row.metadata as JsonObject | undefined,
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

    const result = await this.pool!.query(
      `INSERT INTO ${this.tableName("workflow_runs")}
       (id, workflow_id, status, trigger_data, output, error, step_results,
        suspension_data, resource_id, thread_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       ON CONFLICT (id) DO UPDATE SET
         status = EXCLUDED.status,
         trigger_data = EXCLUDED.trigger_data,
         output = EXCLUDED.output,
         error = EXCLUDED.error,
         step_results = EXCLUDED.step_results,
         suspension_data = EXCLUDED.suspension_data,
         updated_at = NOW()
       RETURNING *`,
      [
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
      ],
    );

    return this.mapWorkflowRunRow(result.rows[0]);
  }

  async getWorkflowRun(runId: string): Promise<StorageWorkflowRun | null> {
    this.ensureInitialized();

    const result = await this.pool!.query(
      `SELECT * FROM ${this.tableName("workflow_runs")} WHERE id = $1`,
      [runId],
    );

    return result.rows[0] ? this.mapWorkflowRunRow(result.rows[0]) : null;
  }

  async listWorkflowRuns(
    options?: WorkflowRunQueryOptions,
  ): Promise<PaginatedResult<StorageWorkflowRun>> {
    this.ensureInitialized();

    let whereClause = "WHERE 1=1";
    const values: unknown[] = [];
    let paramIndex = 1;

    if (options?.workflowId) {
      whereClause += ` AND workflow_id = $${paramIndex++}`;
      values.push(options.workflowId);
    }
    if (options?.status) {
      whereClause += ` AND status = $${paramIndex++}`;
      values.push(options.status);
    }
    if (options?.resourceId) {
      whereClause += ` AND resource_id = $${paramIndex++}`;
      values.push(options.resourceId);
    }
    if (options?.threadId) {
      whereClause += ` AND thread_id = $${paramIndex++}`;
      values.push(options.threadId);
    }

    const limit = options?.limit || 50;
    const offset = options?.offset || 0;

    // Count query
    const countResult = await this.pool!.query(
      `SELECT COUNT(*) FROM ${this.tableName("workflow_runs")} ${whereClause}`,
      values,
    );
    const total = parseInt(countResult.rows[0].count, 10);

    // Data query
    const result = await this.pool!.query(
      `SELECT * FROM ${this.tableName("workflow_runs")}
       ${whereClause}
       ORDER BY created_at DESC
       LIMIT $${paramIndex++} OFFSET $${paramIndex}`,
      [...values, limit, offset],
    );

    return {
      data: result.rows.map((row) =>
        this.mapWorkflowRunRow(row as Record<string, unknown>),
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

    const result = await this.pool!.query(
      `UPDATE ${this.tableName("workflow_runs")}
       SET status = $1,
           output = COALESCE($2, output),
           error = COALESCE($3, error),
           updated_at = NOW()
       WHERE id = $4
       RETURNING *`,
      [
        status,
        output !== undefined ? JSON.stringify(output) : null,
        error ? JSON.stringify(error) : null,
        runId,
      ],
    );

    return result.rows[0] ? this.mapWorkflowRunRow(result.rows[0]) : null;
  }

  async updateStepResult(
    runId: string,
    stepId: string,
    result: StepRunResult,
  ): Promise<boolean> {
    this.ensureInitialized();

    const queryResult = await this.pool!.query(
      `UPDATE ${this.tableName("workflow_runs")}
       SET step_results = jsonb_set(
         COALESCE(step_results, '{}'::jsonb),
         $1::text[],
         $2::jsonb
       ),
       updated_at = NOW()
       WHERE id = $3`,
      [[stepId], JSON.stringify(result), runId],
    );

    return (queryResult.rowCount || 0) > 0;
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
      triggerData: row.trigger_data as JsonObject | undefined,
      output: row.output as JsonValue | undefined,
      error: row.error as StorageWorkflowError | undefined,
      stepResults: row.step_results as Record<string, StepRunResult>,
      suspensionData:
        row.suspension_data as StorageWorkflowRun["suspensionData"],
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

    const expiresAt = options?.ttl
      ? new Date(Date.now() + options.ttl * 1000)
      : null;

    const result = await this.pool!.query(
      `INSERT INTO ${this.tableName("custom_records")}
       (namespace, key, value, metadata, ttl, expires_at)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (namespace, key) DO UPDATE SET
         value = EXCLUDED.value,
         metadata = EXCLUDED.metadata,
         ttl = EXCLUDED.ttl,
         expires_at = EXCLUDED.expires_at,
         updated_at = NOW()
       RETURNING *`,
      [
        namespace,
        key,
        JSON.stringify(value),
        JSON.stringify(options?.metadata || {}),
        options?.ttl || null,
        expiresAt,
      ],
    );

    return this.mapCustomRecordRow(result.rows[0]);
  }

  async getRecord(
    namespace: string,
    key: string,
  ): Promise<StorageCustomRecord | null> {
    this.ensureInitialized();

    const result = await this.pool!.query(
      `SELECT * FROM ${this.tableName("custom_records")}
       WHERE namespace = $1 AND key = $2
       AND (expires_at IS NULL OR expires_at > NOW())`,
      [namespace, key],
    );

    return result.rows[0] ? this.mapCustomRecordRow(result.rows[0]) : null;
  }

  async deleteRecord(namespace: string, key: string): Promise<boolean> {
    this.ensureInitialized();

    const result = await this.pool!.query(
      `DELETE FROM ${this.tableName("custom_records")}
       WHERE namespace = $1 AND key = $2`,
      [namespace, key],
    );

    return (result.rowCount || 0) > 0;
  }

  async listRecords(
    namespace: string,
    options?: StorageQueryOptions,
  ): Promise<PaginatedResult<StorageCustomRecord>> {
    this.ensureInitialized();

    const limit = options?.limit || 100;
    const offset = options?.offset || 0;

    // Count query (excluding expired)
    const countResult = await this.pool!.query(
      `SELECT COUNT(*) FROM ${this.tableName("custom_records")}
       WHERE namespace = $1 AND (expires_at IS NULL OR expires_at > NOW())`,
      [namespace],
    );
    const total = parseInt(countResult.rows[0].count, 10);

    // Data query
    const result = await this.pool!.query(
      `SELECT * FROM ${this.tableName("custom_records")}
       WHERE namespace = $1 AND (expires_at IS NULL OR expires_at > NOW())
       ORDER BY updated_at DESC
       LIMIT $2 OFFSET $3`,
      [namespace, limit, offset],
    );

    return {
      data: result.rows.map((row) =>
        this.mapCustomRecordRow(row as Record<string, unknown>),
      ),
      total,
      hasMore: offset + limit < total,
    };
  }

  async hasRecord(namespace: string, key: string): Promise<boolean> {
    this.ensureInitialized();

    const result = await this.pool!.query(
      `SELECT 1 FROM ${this.tableName("custom_records")}
       WHERE namespace = $1 AND key = $2
       AND (expires_at IS NULL OR expires_at > NOW())`,
      [namespace, key],
    );

    return (result.rowCount || 0) > 0;
  }

  async deleteNamespace(namespace: string): Promise<number> {
    this.ensureInitialized();

    const result = await this.pool!.query(
      `DELETE FROM ${this.tableName("custom_records")} WHERE namespace = $1`,
      [namespace],
    );

    return result.rowCount || 0;
  }

  private mapCustomRecordRow(
    row: Record<string, unknown>,
  ): StorageCustomRecord {
    return {
      namespace: row.namespace as string,
      key: row.key as string,
      value: row.value as JsonValue,
      metadata: row.metadata as JsonObject | undefined,
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
      this.pool!.query(`SELECT COUNT(*) FROM ${this.tableName("threads")}`),
      this.pool!.query(`SELECT COUNT(*) FROM ${this.tableName("messages")}`),
      this.pool!.query(
        `SELECT COUNT(*) FROM ${this.tableName("workflow_runs")}`,
      ),
      this.pool!.query(
        `SELECT COUNT(*) FROM ${this.tableName("custom_records")}
         WHERE expires_at IS NULL OR expires_at > NOW()`,
      ),
    ]);

    // Get storage size (PostgreSQL specific)
    let storageSize: number | undefined;
    try {
      const sizeResult = await this.pool!.query(
        `SELECT pg_total_relation_size($1) as size`,
        [this.schema],
      );
      storageSize = parseInt(sizeResult.rows[0].size, 10);
    } catch {
      // Ignore if size query fails
    }

    return {
      threadCount: parseInt(threads.rows[0].count, 10),
      messageCount: parseInt(messages.rows[0].count, 10),
      workflowRunCount: parseInt(runs.rows[0].count, 10),
      customRecordCount: parseInt(records.rows[0].count, 10),
      storageSize,
    };
  }

  async clearAll(): Promise<void> {
    this.ensureInitialized();

    // Use TRUNCATE for faster deletion (CASCADE handles foreign keys)
    await this.pool!.query(`TRUNCATE ${this.tableName("messages")} CASCADE`);
    await this.pool!.query(`TRUNCATE ${this.tableName("threads")} CASCADE`);
    await this.pool!.query(`TRUNCATE ${this.tableName("workflow_runs")}`);
    await this.pool!.query(`TRUNCATE ${this.tableName("custom_records")}`);

    this.log("warn", "All data cleared");
  }

  /**
   * Clean up expired custom records (can be called periodically)
   */
  async cleanupExpiredRecords(): Promise<number> {
    this.ensureInitialized();

    const result = await this.pool!.query(
      `DELETE FROM ${this.tableName("custom_records")}
       WHERE expires_at IS NOT NULL AND expires_at <= NOW()`,
    );

    const deleted = result.rowCount || 0;
    if (deleted > 0) {
      this.log("debug", `Cleaned up ${deleted} expired records`);
    }

    return deleted;
  }
}
