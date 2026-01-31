/**
 * Redis Storage Adapter
 *
 * Redis storage implementation for high-performance, distributed storage.
 * Ideal for caching, session management, and real-time applications.
 *
 * Features:
 * - Native TTL support for automatic expiration
 * - High-performance key-value operations
 * - Pub/Sub capabilities (for future use)
 * - Connection pooling via ioredis
 * - JSON serialization for complex data
 * - Atomic operations with Lua scripts
 */

import type { Redis, RedisOptions } from "ioredis";
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
  StorageRedisConfig,
} from "../../types/index.js";

/**
 * Redis key prefixes for different entity types
 */
const KEY_PREFIXES = {
  thread: "thread:",
  message: "message:",
  workflow: "workflow:",
  workflowRun: "workflow_run:",
  customRecord: "record:",
  threadIndex: "idx:thread:",
  messageIndex: "idx:message:",
  workflowIndex: "idx:workflow:",
} as const;

/**
 * Redis storage implementation
 *
 * Uses Redis for high-performance, distributed storage with native TTL support.
 */
export class RedisAdapter extends BaseStorageProvider {
  readonly type: StorageBackendType = "redis";

  /** Redis client */
  private client: Redis | null = null;

  /** Configuration */
  private config: StorageRedisConfig;

  /** Key prefix for all keys */
  private keyPrefix: string;

  constructor(config?: StorageRedisConfig) {
    super();
    this.config = config || { url: "redis://localhost:6379" };
    this.keyPrefix = config?.keyPrefix || "neurolink:";
  }

  /**
   * Get prefixed key
   */
  private key(prefix: string, id: string): string {
    return `${this.keyPrefix}${prefix}${id}`;
  }

  /**
   * Get index key
   */
  private indexKey(
    type: keyof typeof KEY_PREFIXES,
    field: string,
    value: string,
  ): string {
    return `${this.keyPrefix}${KEY_PREFIXES[`${type}Index` as keyof typeof KEY_PREFIXES] || "idx:"}${field}:${value}`;
  }

  // ============================================================================
  // Lifecycle Methods
  // ============================================================================

  async init(_options?: StorageInitOptions): Promise<void> {
    if (this.initialized) {
      this.log("debug", "Already initialized");
      return;
    }

    this.log("info", "Initializing Redis storage");

    // Dynamic import of ioredis
    let ioredisModule;
    try {
      ioredisModule = await import("ioredis");
    } catch {
      throw new Error(
        `Redis driver not installed. Run: pnpm add ioredis\n` +
          `The 'ioredis' package is a peer dependency required for Redis storage.`,
      );
    }
    const ioredis = ioredisModule;
    const Redis = ioredis.default as unknown as new (
      urlOrOptions: string | RedisOptions,
      options?: RedisOptions,
    ) => import("ioredis").Redis;

    // Build client options
    const clientOptions: RedisOptions = {};

    if (this.config.url) {
      this.client = new Redis(this.config.url, clientOptions);
    } else {
      clientOptions.host = this.config.host || "localhost";
      clientOptions.port = this.config.port || 6379;
      if (this.config.password) {
        clientOptions.password = this.config.password;
      }
      if (this.config.db !== undefined) {
        clientOptions.db = this.config.db;
      }
      if (this.config.tls) {
        clientOptions.tls = {};
      }
      this.client = new Redis(clientOptions);
    }

    // Wait for connection
    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error("Redis connection timeout"));
      }, this.config.connectTimeoutMs || 10000);

      this.client!.once("ready", () => {
        clearTimeout(timeout);
        resolve();
      });

      this.client!.once("error", (err: Error) => {
        clearTimeout(timeout);
        reject(err);
      });
    });

    this.initialized = true;
    this.log("info", "Redis storage initialized");
  }

  async close(): Promise<void> {
    if (this.client) {
      await this.client.quit();
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
        const pong = await this.client!.ping();
        return pong === "PONG";
      });

      if (result) {
        return this.createHealthSuccess(latencyMs);
      }
      return this.createHealthError("Ping failed");
    } catch (error) {
      return this.createHealthError(error);
    }
  }

  // ============================================================================
  // Thread Operations
  // ============================================================================

  async createThread(input: CreateThreadInput): Promise<StorageThread> {
    this.ensureInitialized();

    const now = this.now();
    const thread: StorageThread = {
      id: this.generateId(),
      resourceId: input.resourceId,
      title: input.title,
      metadata: input.metadata,
      status: input.status || "active",
      createdAt: now,
      updatedAt: now,
    };

    const key = this.key(KEY_PREFIXES.thread, thread.id);
    await this.client!.set(key, JSON.stringify(this.serializeThread(thread)));

    // Add to resource index
    await this.client!.sadd(
      this.indexKey("thread", "resource", input.resourceId),
      thread.id,
    );

    // Add to status index
    await this.client!.sadd(
      this.indexKey("thread", "status", thread.status || "active"),
      thread.id,
    );

    this.log("debug", "Created thread", { threadId: thread.id });
    return thread;
  }

  async getThread(threadId: string): Promise<StorageThread | null> {
    this.ensureInitialized();

    const key = this.key(KEY_PREFIXES.thread, threadId);
    const data = await this.client!.get(key);

    if (!data) {
      return null;
    }
    return this.deserializeThread(JSON.parse(data));
  }

  async updateThread(
    threadId: string,
    updates: UpdateThreadInput,
  ): Promise<StorageThread | null> {
    this.ensureInitialized();

    const existing = await this.getThread(threadId);
    if (!existing) {
      return null;
    }

    // Update status index if status changed
    if (updates.status && updates.status !== existing.status) {
      await this.client!.srem(
        this.indexKey("thread", "status", existing.status || "active"),
        threadId,
      );
      await this.client!.sadd(
        this.indexKey("thread", "status", updates.status),
        threadId,
      );
    }

    // Update resource index if resourceId changed
    if (updates.resourceId && updates.resourceId !== existing.resourceId) {
      await this.client!.srem(
        this.indexKey("thread", "resource", existing.resourceId),
        threadId,
      );
      await this.client!.sadd(
        this.indexKey("thread", "resource", updates.resourceId),
        threadId,
      );
    }

    const updatedThread: StorageThread = {
      ...existing,
      ...updates,
      updatedAt: this.now(),
    };

    const key = this.key(KEY_PREFIXES.thread, threadId);
    await this.client!.set(
      key,
      JSON.stringify(this.serializeThread(updatedThread)),
    );

    return updatedThread;
  }

  async deleteThread(threadId: string): Promise<boolean> {
    this.ensureInitialized();

    const existing = await this.getThread(threadId);
    if (!existing) {
      return false;
    }

    // Delete messages first
    await this.deleteMessagesByThreadId(threadId);

    // Remove from indexes
    await this.client!.srem(
      this.indexKey("thread", "resource", existing.resourceId),
      threadId,
    );
    await this.client!.srem(
      this.indexKey("thread", "status", existing.status || "active"),
      threadId,
    );

    // Delete the thread
    const key = this.key(KEY_PREFIXES.thread, threadId);
    const deleted = await this.client!.del(key);

    return deleted > 0;
  }

  async listThreads(
    options?: ThreadQueryOptions,
  ): Promise<PaginatedResult<StorageThread>> {
    this.ensureInitialized();

    let threadIds: string[];

    if (options?.resourceId && options?.status) {
      // Intersection of resource and status indexes
      const resourceSet = this.indexKey(
        "thread",
        "resource",
        options.resourceId,
      );
      const statusSet = this.indexKey("thread", "status", options.status);
      threadIds = await this.client!.sinter(resourceSet, statusSet);
    } else if (options?.resourceId) {
      threadIds = await this.client!.smembers(
        this.indexKey("thread", "resource", options.resourceId),
      );
    } else if (options?.status) {
      threadIds = await this.client!.smembers(
        this.indexKey("thread", "status", options.status),
      );
    } else {
      // Get all thread keys
      const pattern = this.key(KEY_PREFIXES.thread, "*");
      const keys = await this.client!.keys(pattern);
      threadIds = keys.map((k) =>
        k.replace(this.key(KEY_PREFIXES.thread, ""), ""),
      );
    }

    // Fetch all threads
    const threads: StorageThread[] = [];
    for (const id of threadIds) {
      const thread = await this.getThread(id);
      if (thread) {
        threads.push(thread);
      }
    }

    // Sort by updatedAt descending
    threads.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());

    return this.paginate(threads, options);
  }

  async getThreadsByResourceId(
    resourceId: string,
    options?: StorageQueryOptions,
  ): Promise<PaginatedResult<StorageThread>> {
    return this.listThreads({ ...options, resourceId });
  }

  private serializeThread(thread: StorageThread): Record<string, unknown> {
    return {
      ...thread,
      createdAt: thread.createdAt.toISOString(),
      updatedAt: thread.updatedAt.toISOString(),
    };
  }

  private deserializeThread(data: Record<string, unknown>): StorageThread {
    return {
      id: data.id as string,
      resourceId: data.resourceId as string,
      title: data.title as string | undefined,
      metadata: data.metadata as JsonObject | undefined,
      status: data.status as StorageThread["status"],
      createdAt: new Date(data.createdAt as string),
      updatedAt: new Date(data.updatedAt as string),
    };
  }

  // ============================================================================
  // Message Operations
  // ============================================================================

  async createMessage(input: CreateMessageInput): Promise<StorageMessage> {
    this.ensureInitialized();

    const now = this.now();
    const message: StorageMessage = {
      id: this.generateId(),
      threadId: input.threadId,
      role: input.role,
      content: input.content,
      type: input.type || "text",
      toolInfo: input.toolInfo,
      metadata: input.metadata,
      createdAt: now,
      updatedAt: now,
    };

    const key = this.key(KEY_PREFIXES.message, message.id);
    await this.client!.set(key, JSON.stringify(this.serializeMessage(message)));

    // Add to thread index with score for ordering
    await this.client!.zadd(
      this.indexKey("message", "thread", input.threadId),
      now.getTime(),
      message.id,
    );

    return message;
  }

  async createMessages(
    inputs: CreateMessageInput[],
  ): Promise<StorageMessage[]> {
    this.ensureInitialized();
    if (inputs.length === 0) {
      return [];
    }

    const messages: StorageMessage[] = [];
    const pipeline = this.client!.pipeline();
    const now = this.now();

    for (const input of inputs) {
      const message: StorageMessage = {
        id: this.generateId(),
        threadId: input.threadId,
        role: input.role,
        content: input.content,
        type: input.type || "text",
        toolInfo: input.toolInfo,
        metadata: input.metadata,
        createdAt: now,
        updatedAt: now,
      };

      const key = this.key(KEY_PREFIXES.message, message.id);
      pipeline.set(key, JSON.stringify(this.serializeMessage(message)));
      pipeline.zadd(
        this.indexKey("message", "thread", input.threadId),
        now.getTime(),
        message.id,
      );

      messages.push(message);
    }

    await pipeline.exec();
    return messages;
  }

  async getMessage(messageId: string): Promise<StorageMessage | null> {
    this.ensureInitialized();

    const key = this.key(KEY_PREFIXES.message, messageId);
    const data = await this.client!.get(key);

    if (!data) {
      return null;
    }
    return this.deserializeMessage(JSON.parse(data));
  }

  async updateMessage(
    messageId: string,
    updates: UpdateMessageInput,
  ): Promise<StorageMessage | null> {
    this.ensureInitialized();

    const existing = await this.getMessage(messageId);
    if (!existing) {
      return null;
    }

    const updatedMessage: StorageMessage = {
      ...existing,
      ...updates,
      updatedAt: this.now(),
    };

    const key = this.key(KEY_PREFIXES.message, messageId);
    await this.client!.set(
      key,
      JSON.stringify(this.serializeMessage(updatedMessage)),
    );

    return updatedMessage;
  }

  async deleteMessage(messageId: string): Promise<boolean> {
    this.ensureInitialized();

    const existing = await this.getMessage(messageId);
    if (!existing) {
      return false;
    }

    // Remove from thread index
    await this.client!.zrem(
      this.indexKey("message", "thread", existing.threadId),
      messageId,
    );

    // Delete the message
    const key = this.key(KEY_PREFIXES.message, messageId);
    const deleted = await this.client!.del(key);

    return deleted > 0;
  }

  async listMessages(
    options: MessageQueryOptions,
  ): Promise<PaginatedResult<StorageMessage>> {
    this.ensureInitialized();

    const indexKey = this.indexKey("message", "thread", options.threadId);
    const messageIds = await this.client!.zrange(indexKey, 0, -1);

    // Fetch all messages
    let messages: StorageMessage[] = [];
    for (const id of messageIds) {
      const message = await this.getMessage(id);
      if (message) {
        messages.push(message);
      }
    }

    // Apply filters
    if (options.role) {
      messages = messages.filter((m) => m.role === options.role);
    }
    if (options.type) {
      messages = messages.filter((m) => m.type === options.type);
    }
    if (options.dateRange?.from) {
      messages = messages.filter(
        (m) => m.createdAt >= options.dateRange!.from!,
      );
    }
    if (options.dateRange?.to) {
      messages = messages.filter((m) => m.createdAt <= options.dateRange!.to!);
    }

    // Already sorted by score (createdAt)
    return this.paginate(messages, { ...options, limit: options.limit || 100 });
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

    const indexKey = this.indexKey("message", "thread", threadId);
    const messageIds = await this.client!.zrange(indexKey, 0, -1);

    if (messageIds.length === 0) {
      return 0;
    }

    const pipeline = this.client!.pipeline();
    for (const id of messageIds) {
      pipeline.del(this.key(KEY_PREFIXES.message, id));
    }
    pipeline.del(indexKey);

    await pipeline.exec();
    return messageIds.length;
  }

  private serializeMessage(message: StorageMessage): Record<string, unknown> {
    return {
      ...message,
      createdAt: message.createdAt.toISOString(),
      updatedAt: message.updatedAt.toISOString(),
    };
  }

  private deserializeMessage(data: Record<string, unknown>): StorageMessage {
    return {
      id: data.id as string,
      threadId: data.threadId as string,
      role: data.role as StorageMessage["role"],
      content: data.content as string,
      type: data.type as StorageMessage["type"],
      toolInfo: data.toolInfo as StorageMessage["toolInfo"],
      metadata: data.metadata as JsonObject | undefined,
      createdAt: new Date(data.createdAt as string),
      updatedAt: new Date(data.updatedAt as string),
    };
  }

  // ============================================================================
  // Workflow Run Operations
  // ============================================================================

  async saveWorkflowRun(
    input: SaveWorkflowRunInput,
  ): Promise<StorageWorkflowRun> {
    this.ensureInitialized();

    const now = this.now();
    const id = input.id || this.generateId();

    // Check if exists
    const existing = input.id ? await this.getWorkflowRun(input.id) : null;

    const run: StorageWorkflowRun = {
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
      createdAt: existing?.createdAt || now,
      updatedAt: now,
    };

    const key = this.key(KEY_PREFIXES.workflowRun, id);
    await this.client!.set(key, JSON.stringify(this.serializeWorkflowRun(run)));

    // Update indexes
    await this.client!.sadd(
      this.indexKey("workflow", "workflow", input.workflowId),
      id,
    );
    await this.client!.sadd(
      this.indexKey("workflow", "status", input.status),
      id,
    );

    return run;
  }

  async getWorkflowRun(runId: string): Promise<StorageWorkflowRun | null> {
    this.ensureInitialized();

    const key = this.key(KEY_PREFIXES.workflowRun, runId);
    const data = await this.client!.get(key);

    if (!data) {
      return null;
    }
    return this.deserializeWorkflowRun(JSON.parse(data));
  }

  async listWorkflowRuns(
    options?: WorkflowRunQueryOptions,
  ): Promise<PaginatedResult<StorageWorkflowRun>> {
    this.ensureInitialized();

    let runIds: string[];

    if (options?.workflowId && options?.status) {
      const workflowSet = this.indexKey(
        "workflow",
        "workflow",
        options.workflowId,
      );
      const statusSet = this.indexKey("workflow", "status", options.status);
      runIds = await this.client!.sinter(workflowSet, statusSet);
    } else if (options?.workflowId) {
      runIds = await this.client!.smembers(
        this.indexKey("workflow", "workflow", options.workflowId),
      );
    } else if (options?.status) {
      runIds = await this.client!.smembers(
        this.indexKey("workflow", "status", options.status),
      );
    } else {
      const pattern = this.key(KEY_PREFIXES.workflowRun, "*");
      const keys = await this.client!.keys(pattern);
      runIds = keys.map((k) =>
        k.replace(this.key(KEY_PREFIXES.workflowRun, ""), ""),
      );
    }

    // Fetch all runs
    let runs: StorageWorkflowRun[] = [];
    for (const id of runIds) {
      const run = await this.getWorkflowRun(id);
      if (run) {
        runs.push(run);
      }
    }

    // Apply additional filters
    if (options?.resourceId) {
      runs = runs.filter((r) => r.resourceId === options.resourceId);
    }
    if (options?.threadId) {
      runs = runs.filter((r) => r.threadId === options.threadId);
    }

    // Sort by createdAt descending
    runs.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    return this.paginate(runs, options);
  }

  async updateWorkflowRunStatus(
    runId: string,
    status: WorkflowRunStatus,
    output?: JsonValue,
    error?: StorageWorkflowError,
  ): Promise<StorageWorkflowRun | null> {
    this.ensureInitialized();

    const existing = await this.getWorkflowRun(runId);
    if (!existing) {
      return null;
    }

    // Update status index
    if (status !== existing.status) {
      await this.client!.srem(
        this.indexKey("workflow", "status", existing.status),
        runId,
      );
      await this.client!.sadd(
        this.indexKey("workflow", "status", status),
        runId,
      );
    }

    const updatedRun: StorageWorkflowRun = {
      ...existing,
      status,
      output: output !== undefined ? output : existing.output,
      error: error !== undefined ? error : existing.error,
      updatedAt: this.now(),
    };

    const key = this.key(KEY_PREFIXES.workflowRun, runId);
    await this.client!.set(
      key,
      JSON.stringify(this.serializeWorkflowRun(updatedRun)),
    );

    return updatedRun;
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

    const stepResults = existing.stepResults || {};
    stepResults[stepId] = result;

    const updatedRun: StorageWorkflowRun = {
      ...existing,
      stepResults,
      updatedAt: this.now(),
    };

    const key = this.key(KEY_PREFIXES.workflowRun, runId);
    await this.client!.set(
      key,
      JSON.stringify(this.serializeWorkflowRun(updatedRun)),
    );

    return true;
  }

  async getWorkflowRunsByWorkflowId(
    workflowId: string,
    options?: StorageQueryOptions,
  ): Promise<PaginatedResult<StorageWorkflowRun>> {
    return this.listWorkflowRuns({ ...options, workflowId });
  }

  private serializeWorkflowRun(
    run: StorageWorkflowRun,
  ): Record<string, unknown> {
    return {
      ...run,
      createdAt: run.createdAt.toISOString(),
      updatedAt: run.updatedAt.toISOString(),
    };
  }

  private deserializeWorkflowRun(
    data: Record<string, unknown>,
  ): StorageWorkflowRun {
    return {
      id: data.id as string,
      workflowId: data.workflowId as string,
      status: data.status as WorkflowRunStatus,
      triggerData: data.triggerData as JsonObject | undefined,
      output: data.output as JsonValue | undefined,
      error: data.error as StorageWorkflowError | undefined,
      stepResults: data.stepResults as Record<string, StepRunResult>,
      suspensionData:
        data.suspensionData as StorageWorkflowRun["suspensionData"],
      resourceId: data.resourceId as string | undefined,
      threadId: data.threadId as string | undefined,
      createdAt: new Date(data.createdAt as string),
      updatedAt: new Date(data.updatedAt as string),
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

    const now = this.now();
    const recordKey = this.key(
      KEY_PREFIXES.customRecord,
      `${namespace}:${key}`,
    );

    // Check if exists
    const existingData = await this.client!.get(recordKey);
    const existing = existingData ? JSON.parse(existingData) : null;

    const record: StorageCustomRecord = {
      namespace,
      key,
      value,
      metadata: options?.metadata,
      ttl: options?.ttl,
      createdAt: existing ? new Date(existing.createdAt) : now,
      updatedAt: now,
    };

    const serialized = this.serializeCustomRecord(record);

    if (options?.ttl) {
      await this.client!.setex(
        recordKey,
        options.ttl,
        JSON.stringify(serialized),
      );
    } else {
      await this.client!.set(recordKey, JSON.stringify(serialized));
    }

    // Add to namespace index
    await this.client!.sadd(
      this.indexKey("customRecord" as "thread", "namespace", namespace),
      `${namespace}:${key}`,
    );

    return record;
  }

  async getRecord(
    namespace: string,
    key: string,
  ): Promise<StorageCustomRecord | null> {
    this.ensureInitialized();

    const recordKey = this.key(
      KEY_PREFIXES.customRecord,
      `${namespace}:${key}`,
    );
    const data = await this.client!.get(recordKey);

    if (!data) {
      return null;
    }
    return this.deserializeCustomRecord(JSON.parse(data));
  }

  async deleteRecord(namespace: string, key: string): Promise<boolean> {
    this.ensureInitialized();

    const recordKey = this.key(
      KEY_PREFIXES.customRecord,
      `${namespace}:${key}`,
    );

    // Remove from namespace index
    await this.client!.srem(
      this.indexKey("customRecord" as "thread", "namespace", namespace),
      `${namespace}:${key}`,
    );

    const deleted = await this.client!.del(recordKey);
    return deleted > 0;
  }

  async listRecords(
    namespace: string,
    options?: StorageQueryOptions,
  ): Promise<PaginatedResult<StorageCustomRecord>> {
    this.ensureInitialized();

    const indexKey = this.indexKey(
      "customRecord" as "thread",
      "namespace",
      namespace,
    );
    const recordKeys = await this.client!.smembers(indexKey);

    // Fetch all records
    const records: StorageCustomRecord[] = [];
    for (const rk of recordKeys) {
      const [ns, k] = rk.split(":");
      const record = await this.getRecord(ns, k);
      if (record) {
        records.push(record);
      }
    }

    // Sort by updatedAt descending
    records.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());

    return this.paginate(records, { ...options, limit: options?.limit || 100 });
  }

  async hasRecord(namespace: string, key: string): Promise<boolean> {
    this.ensureInitialized();

    const recordKey = this.key(
      KEY_PREFIXES.customRecord,
      `${namespace}:${key}`,
    );
    const exists = await this.client!.exists(recordKey);
    return exists === 1;
  }

  async deleteNamespace(namespace: string): Promise<number> {
    this.ensureInitialized();

    const indexKey = this.indexKey(
      "customRecord" as "thread",
      "namespace",
      namespace,
    );
    const recordKeys = await this.client!.smembers(indexKey);

    if (recordKeys.length === 0) {
      return 0;
    }

    const pipeline = this.client!.pipeline();
    for (const rk of recordKeys) {
      pipeline.del(this.key(KEY_PREFIXES.customRecord, rk));
    }
    pipeline.del(indexKey);

    await pipeline.exec();
    return recordKeys.length;
  }

  private serializeCustomRecord(
    record: StorageCustomRecord,
  ): Record<string, unknown> {
    return {
      ...record,
      createdAt: record.createdAt.toISOString(),
      updatedAt: record.updatedAt.toISOString(),
    };
  }

  private deserializeCustomRecord(
    data: Record<string, unknown>,
  ): StorageCustomRecord {
    return {
      namespace: data.namespace as string,
      key: data.key as string,
      value: data.value as JsonValue,
      metadata: data.metadata as JsonObject | undefined,
      ttl: data.ttl as number | undefined,
      createdAt: new Date(data.createdAt as string),
      updatedAt: new Date(data.updatedAt as string),
    };
  }

  // ============================================================================
  // Utility Methods
  // ============================================================================

  async getStats(): Promise<StorageStats> {
    this.ensureInitialized();

    const [threadKeys, messageKeys, workflowKeys, recordKeys] =
      await Promise.all([
        this.client!.keys(this.key(KEY_PREFIXES.thread, "*")),
        this.client!.keys(this.key(KEY_PREFIXES.message, "*")),
        this.client!.keys(this.key(KEY_PREFIXES.workflowRun, "*")),
        this.client!.keys(this.key(KEY_PREFIXES.customRecord, "*")),
      ]);

    // Get memory info
    let storageSize: number | undefined;
    try {
      const info = await this.client!.info("memory");
      const match = info.match(/used_memory:(\d+)/);
      if (match) {
        storageSize = parseInt(match[1], 10);
      }
    } catch {
      // Ignore if info not available
    }

    return {
      threadCount: threadKeys.length,
      messageCount: messageKeys.length,
      workflowRunCount: workflowKeys.length,
      customRecordCount: recordKeys.length,
      storageSize,
    };
  }

  async clearAll(): Promise<void> {
    this.ensureInitialized();

    // Get all keys with our prefix
    const pattern = `${this.keyPrefix}*`;
    const keys = await this.client!.keys(pattern);

    if (keys.length > 0) {
      await this.client!.del(...keys);
    }

    this.log("warn", "All data cleared");
  }
}
