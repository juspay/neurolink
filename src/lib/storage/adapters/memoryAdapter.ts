/**
 * Memory Storage Adapter
 *
 * In-memory storage implementation for development, testing, and single-instance deployments.
 * Data is not persisted across restarts.
 *
 * Features:
 * - Fast in-memory operations
 * - TTL support with automatic cleanup
 * - Full storage interface implementation
 * - Ideal for testing and development
 */

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
  MemoryStorageConfig,
} from "../../types/index.js";

/**
 * In-memory storage implementation
 *
 * Suitable for development, testing, and single-instance deployments.
 * All data is stored in Maps and lost on process restart.
 */
export class MemoryAdapter extends BaseStorageProvider {
  readonly type: StorageBackendType = "memory";

  /** Thread storage */
  private threads = new Map<string, StorageThread>();

  /** Message storage */
  private messages = new Map<string, StorageMessage>();

  /** Workflow run storage */
  private workflowRuns = new Map<string, StorageWorkflowRun>();

  /** Custom record storage (key: "namespace:key") */
  private customRecords = new Map<string, StorageCustomRecord>();

  /** TTL timers for custom records */
  private ttlTimers = new Map<string, NodeJS.Timeout>();

  /** Configuration */
  private config: MemoryStorageConfig;

  /** Cleanup interval timer */
  private cleanupTimer?: NodeJS.Timeout;

  constructor(config?: MemoryStorageConfig) {
    super();
    this.config = config || {};
  }

  // ============================================================================
  // Lifecycle Methods
  // ============================================================================

  async init(_options?: StorageInitOptions): Promise<void> {
    if (this.initialized) {
      this.log("debug", "Already initialized");
      return;
    }

    this.log("info", "Initializing in-memory storage");

    // Start cleanup interval if configured
    if (this.config.cleanupIntervalMs) {
      this.cleanupTimer = setInterval(() => {
        this.cleanupExpiredRecords();
      }, this.config.cleanupIntervalMs);
    }

    this.initialized = true;
    this.log("info", "In-memory storage initialized");
  }

  async close(): Promise<void> {
    this.log("info", "Closing in-memory storage");

    // Clear cleanup timer
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = undefined;
    }

    // Clear all TTL timers
    for (const timer of this.ttlTimers.values()) {
      clearTimeout(timer);
    }
    this.ttlTimers.clear();

    // Clear all data maps to release memory immediately
    this.threads.clear();
    this.messages.clear();
    this.workflowRuns.clear();
    this.customRecords.clear();

    this.initialized = false;
  }

  async healthCheck(): Promise<StorageHealthResult> {
    return this.tracedOp("healthCheck", async (_span) => {
      const start = performance.now();

      try {
        // Simple health check - verify we can read/write
        const testKey = `__health_check_${Date.now()}`;
        this.threads.set(testKey, {
          id: testKey,
          resourceId: "health",
          createdAt: new Date(),
          updatedAt: new Date(),
        });
        this.threads.delete(testKey);

        const latencyMs = Math.round(performance.now() - start);

        return this.createHealthSuccess(latencyMs);
      } catch (error) {
        return this.createHealthError(error);
      }
    });
  }

  // ============================================================================
  // Thread Operations
  // ============================================================================

  async createThread(input: CreateThreadInput): Promise<StorageThread> {
    return this.tracedOp("createThread", async (span) => {
      this.ensureInitialized();

      const thread = this.createBaseEntity({
        ...input,
        status: input.status || "active",
      }) as StorageThread;

      this.threads.set(thread.id, thread);
      span.setAttribute("storage.thread_id", thread.id);
      this.log("debug", "Created thread", { threadId: thread.id });

      return thread;
    });
  }

  async getThread(threadId: string): Promise<StorageThread | null> {
    return this.tracedOp(
      "getThread",
      async (span) => {
        this.ensureInitialized();
        span.setAttribute("storage.thread_id", threadId);
        return this.threads.get(threadId) || null;
      },
      { "storage.thread_id": threadId },
    );
  }

  async updateThread(
    threadId: string,
    updates: UpdateThreadInput,
  ): Promise<StorageThread | null> {
    this.ensureInitialized();

    const thread = this.threads.get(threadId);
    if (!thread) {
      return null;
    }

    const updatedThread: StorageThread = {
      ...thread,
      ...updates,
      updatedAt: this.now(),
    };

    this.threads.set(threadId, updatedThread);
    return updatedThread;
  }

  async deleteThread(threadId: string): Promise<boolean> {
    this.ensureInitialized();

    // Delete all messages in the thread first
    await this.deleteMessagesByThreadId(threadId);

    return this.threads.delete(threadId);
  }

  async listThreads(
    options?: ThreadQueryOptions,
  ): Promise<PaginatedResult<StorageThread>> {
    this.ensureInitialized();

    let threads = Array.from(this.threads.values());

    // Apply filters
    if (options?.resourceId) {
      threads = threads.filter((t) => t.resourceId === options.resourceId);
    }
    if (options?.status) {
      threads = threads.filter((t) => t.status === options.status);
    }

    // Sort by updatedAt descending (most recent first)
    threads.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());

    return this.paginate(threads, options);
  }

  async getThreadsByResourceId(
    resourceId: string,
    options?: StorageQueryOptions,
  ): Promise<PaginatedResult<StorageThread>> {
    return this.listThreads({ ...options, resourceId });
  }

  // ============================================================================
  // Message Operations
  // ============================================================================

  async createMessage(input: CreateMessageInput): Promise<StorageMessage> {
    return this.tracedOp("createMessage", async (span) => {
      this.ensureInitialized();

      const message = this.createBaseEntity({
        ...input,
        type: input.type || "text",
      }) as StorageMessage;

      this.messages.set(message.id, message);
      span.setAttribute("storage.message_id", message.id);
      span.setAttribute("storage.thread_id", message.threadId);
      return message;
    });
  }

  async createMessages(
    inputs: CreateMessageInput[],
  ): Promise<StorageMessage[]> {
    this.ensureInitialized();

    const messages: StorageMessage[] = [];
    for (const input of inputs) {
      messages.push(await this.createMessage(input));
    }
    return messages;
  }

  async getMessage(messageId: string): Promise<StorageMessage | null> {
    this.ensureInitialized();
    return this.messages.get(messageId) || null;
  }

  async updateMessage(
    messageId: string,
    updates: UpdateMessageInput,
  ): Promise<StorageMessage | null> {
    this.ensureInitialized();

    const message = this.messages.get(messageId);
    if (!message) {
      return null;
    }

    const updatedMessage: StorageMessage = {
      ...message,
      ...updates,
      updatedAt: this.now(),
    };

    this.messages.set(messageId, updatedMessage);
    return updatedMessage;
  }

  async deleteMessage(messageId: string): Promise<boolean> {
    this.ensureInitialized();
    return this.messages.delete(messageId);
  }

  async listMessages(
    options: MessageQueryOptions,
  ): Promise<PaginatedResult<StorageMessage>> {
    this.ensureInitialized();

    let messages = Array.from(this.messages.values()).filter(
      (m) => m.threadId === options.threadId,
    );

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

    // Sort by createdAt ascending (chronological order)
    messages.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());

    return this.paginate(messages, { ...options, limit: options.limit || 100 });
  }

  async getMessagesByThreadId(
    threadId: string,
    options?: StorageQueryOptions,
  ): Promise<StorageMessage[]> {
    return this.tracedOp(
      "getMessagesByThreadId",
      async (span) => {
        span.setAttribute("storage.thread_id", threadId);
        const result = await this.listMessages({ ...options, threadId });
        span.setAttribute("storage.record_count", result.data.length);
        return result.data;
      },
      { "storage.thread_id": threadId },
    );
  }

  async deleteMessagesByThreadId(threadId: string): Promise<number> {
    this.ensureInitialized();

    let count = 0;
    for (const [id, message] of this.messages) {
      if (message.threadId === threadId) {
        this.messages.delete(id);
        count++;
      }
    }
    return count;
  }

  // ============================================================================
  // Workflow Run Operations
  // ============================================================================

  async saveWorkflowRun(
    input: SaveWorkflowRunInput,
  ): Promise<StorageWorkflowRun> {
    this.ensureInitialized();

    const existingRun = input.id ? this.workflowRuns.get(input.id) : null;
    const now = this.now();

    const run: StorageWorkflowRun = {
      ...input,
      id: input.id || this.generateId(),
      createdAt: existingRun?.createdAt || now,
      updatedAt: now,
    };

    this.workflowRuns.set(run.id, run);
    return run;
  }

  async getWorkflowRun(runId: string): Promise<StorageWorkflowRun | null> {
    this.ensureInitialized();
    return this.workflowRuns.get(runId) || null;
  }

  async listWorkflowRuns(
    options?: WorkflowRunQueryOptions,
  ): Promise<PaginatedResult<StorageWorkflowRun>> {
    this.ensureInitialized();

    let runs = Array.from(this.workflowRuns.values());

    // Apply filters
    if (options?.workflowId) {
      runs = runs.filter((r) => r.workflowId === options.workflowId);
    }
    if (options?.status) {
      runs = runs.filter((r) => r.status === options.status);
    }
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

    const run = this.workflowRuns.get(runId);
    if (!run) {
      return null;
    }

    const updatedRun: StorageWorkflowRun = {
      ...run,
      status,
      output: output !== undefined ? output : run.output,
      error: error !== undefined ? error : run.error,
      updatedAt: this.now(),
    };

    this.workflowRuns.set(runId, updatedRun);
    return updatedRun;
  }

  async updateStepResult(
    runId: string,
    stepId: string,
    result: StepRunResult,
  ): Promise<boolean> {
    this.ensureInitialized();

    const run = this.workflowRuns.get(runId);
    if (!run) {
      return false;
    }

    const stepResults = run.stepResults || {};
    stepResults[stepId] = result;

    const updatedRun: StorageWorkflowRun = {
      ...run,
      stepResults,
      updatedAt: this.now(),
    };

    this.workflowRuns.set(runId, updatedRun);
    return true;
  }

  async getWorkflowRunsByWorkflowId(
    workflowId: string,
    options?: StorageQueryOptions,
  ): Promise<PaginatedResult<StorageWorkflowRun>> {
    return this.listWorkflowRuns({ ...options, workflowId });
  }

  // ============================================================================
  // Custom Record Operations
  // ============================================================================

  private getRecordKey(namespace: string, key: string): string {
    return `${namespace}:${key}`;
  }

  async setRecord(
    namespace: string,
    key: string,
    value: JsonValue,
    options?: SetRecordOptions,
  ): Promise<StorageCustomRecord> {
    this.ensureInitialized();

    const recordKey = this.getRecordKey(namespace, key);
    const existing = this.customRecords.get(recordKey);
    const now = this.now();

    const record: StorageCustomRecord = {
      namespace,
      key,
      value,
      createdAt: existing?.createdAt || now,
      updatedAt: now,
      ttl: options?.ttl,
      metadata: options?.metadata,
    };

    this.customRecords.set(recordKey, record);

    // Clear existing TTL timer
    const existingTimer = this.ttlTimers.get(recordKey);
    if (existingTimer) {
      clearTimeout(existingTimer);
      this.ttlTimers.delete(recordKey);
    }

    // Set TTL timer if specified
    if (options?.ttl) {
      const timer = setTimeout(() => {
        this.customRecords.delete(recordKey);
        this.ttlTimers.delete(recordKey);
      }, options.ttl * 1000);

      this.ttlTimers.set(recordKey, timer);
    }

    return record;
  }

  async getRecord(
    namespace: string,
    key: string,
  ): Promise<StorageCustomRecord | null> {
    this.ensureInitialized();
    return this.customRecords.get(this.getRecordKey(namespace, key)) || null;
  }

  async deleteRecord(namespace: string, key: string): Promise<boolean> {
    this.ensureInitialized();

    const recordKey = this.getRecordKey(namespace, key);

    // Clear TTL timer if exists
    const timer = this.ttlTimers.get(recordKey);
    if (timer) {
      clearTimeout(timer);
      this.ttlTimers.delete(recordKey);
    }

    return this.customRecords.delete(recordKey);
  }

  async listRecords(
    namespace: string,
    options?: StorageQueryOptions,
  ): Promise<PaginatedResult<StorageCustomRecord>> {
    this.ensureInitialized();

    const records = Array.from(this.customRecords.values()).filter(
      (r) => r.namespace === namespace,
    );

    // Sort by updatedAt descending
    records.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());

    return this.paginate(records, { ...options, limit: options?.limit || 100 });
  }

  async hasRecord(namespace: string, key: string): Promise<boolean> {
    this.ensureInitialized();
    return this.customRecords.has(this.getRecordKey(namespace, key));
  }

  async deleteNamespace(namespace: string): Promise<number> {
    this.ensureInitialized();

    let count = 0;
    for (const [recordKey, record] of this.customRecords) {
      if (record.namespace === namespace) {
        // Clear TTL timer
        const timer = this.ttlTimers.get(recordKey);
        if (timer) {
          clearTimeout(timer);
          this.ttlTimers.delete(recordKey);
        }

        this.customRecords.delete(recordKey);
        count++;
      }
    }
    return count;
  }

  // ============================================================================
  // Utility Methods
  // ============================================================================

  async getStats(): Promise<StorageStats> {
    this.ensureInitialized();

    return {
      threadCount: this.threads.size,
      messageCount: this.messages.size,
      workflowRunCount: this.workflowRuns.size,
      customRecordCount: this.customRecords.size,
    };
  }

  async clearAll(): Promise<void> {
    this.ensureInitialized();

    // Clear all TTL timers
    for (const timer of this.ttlTimers.values()) {
      clearTimeout(timer);
    }
    this.ttlTimers.clear();

    // Clear all data
    this.threads.clear();
    this.messages.clear();
    this.workflowRuns.clear();
    this.customRecords.clear();

    this.log("warn", "All data cleared");
  }

  // ============================================================================
  // Private Methods
  // ============================================================================

  /**
   * Cleanup expired records (called periodically if configured)
   */
  private cleanupExpiredRecords(): void {
    // TTL is already handled by individual timers
    // This can be used for additional cleanup logic if needed

    // Enforce max entries limit
    if (this.config.maxEntries) {
      this.enforceMaxEntries(this.threads, this.config.maxEntries);
      this.enforceMaxEntries(this.messages, this.config.maxEntries);
      this.enforceMaxEntries(this.workflowRuns, this.config.maxEntries);
      this.enforceMaxEntries(this.customRecords, this.config.maxEntries);
    }
  }

  /**
   * Enforce maximum entries limit by removing oldest entries
   */
  private enforceMaxEntries<T extends { createdAt: Date }>(
    map: Map<string, T>,
    maxEntries: number,
  ): void {
    if (map.size <= maxEntries) {
      return;
    }

    // Sort entries by createdAt
    const entries = Array.from(map.entries()).sort(
      ([, a], [, b]) => a.createdAt.getTime() - b.createdAt.getTime(),
    );

    // Remove oldest entries
    const toRemove = entries.slice(0, map.size - maxEntries);
    for (const [key] of toRemove) {
      map.delete(key);
    }
  }
}
