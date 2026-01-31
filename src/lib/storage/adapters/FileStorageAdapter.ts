/**
 * FileStorageAdapter - File System Storage Implementation
 *
 * Provides persistent file-based storage using the local file system.
 * Suitable for single-instance deployments and local development.
 *
 * Features:
 * - Full MastraStorage interface implementation
 * - Atomic writes with temp files
 * - JSON-based data storage
 * - Directory-based namespacing
 *
 * @module FileStorageAdapter
 * @since 9.0.0
 */

import { randomUUID } from "crypto";
import { promises as fs } from "fs";
import { dirname, join } from "path";
import { createErrorFactory } from "../../core/infrastructure/baseError.js";
import { BaseStorageProvider } from "../storageProvider.js";
import type { JsonObject, JsonValue } from "../../types/index.js";
import type {
  CreateMessageInput,
  CreateThreadInput,
  FilterOperator,
  MessageQueryOptions,
  PaginatedResult,
  PaginationOptions,
  QueryFilters,
  SaveWorkflowRunInput,
  StorageQueryOptions,
  SortOptions,
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
  FileStorageConfig,
  MastraStorageConfig as StorageProviderConfig,
} from "../../types/index.js";
import type { StorageFileData } from "../../types/index.js";

// =============================================================================
// Error Factory
// =============================================================================

const FileErrors = createErrorFactory("FileStorage", {
  NOT_INITIALIZED: "FILE_NOT_INITIALIZED",
  THREAD_NOT_FOUND: "FILE_THREAD_NOT_FOUND",
  MESSAGE_NOT_FOUND: "FILE_MESSAGE_NOT_FOUND",
  WORKFLOW_NOT_FOUND: "FILE_WORKFLOW_NOT_FOUND",
  RECORD_NOT_FOUND: "FILE_RECORD_NOT_FOUND",
  IO_ERROR: "FILE_IO_ERROR",
  VALIDATION_ERROR: "FILE_VALIDATION_ERROR",
});

// =============================================================================
// FileStorageAdapter Class
// =============================================================================

/**
 * File system storage implementation
 *
 * @example
 * ```typescript
 * const storage = new FileStorageAdapter({
 *   type: 'file',
 *   baseDir: './data/storage',
 *   atomicWrites: true
 * });
 *
 * await storage.init();
 *
 * const thread = await storage.createThread({
 *   resourceId: 'user-123',
 *   title: 'Support Chat'
 * });
 * ```
 */
export class FileStorageAdapter extends BaseStorageProvider {
  readonly type = "file" as const;

  private config: FileStorageConfig;
  private data: StorageFileData | null = null;
  private dirty = false;
  private saveTimeout: NodeJS.Timeout | null = null;

  constructor(config?: StorageProviderConfig) {
    super();
    const defaultConfig: FileStorageConfig = {
      type: "file",
      baseDir: "./neurolink-storage",
      namespace: "default",
      encoding: "utf-8",
      atomicWrites: true,
      extension: ".json",
    };

    if (config && config.type !== "file") {
      throw FileErrors.create(
        "VALIDATION_ERROR",
        `Invalid config type: expected 'file', got '${config.type}'`,
      );
    }

    const baseConfig =
      config && config.type === "file" ? config : defaultConfig;
    this.config = {
      ...baseConfig,
      encoding: baseConfig.encoding || "utf-8",
      atomicWrites: baseConfig.atomicWrites !== false,
      extension: baseConfig.extension || ".json",
    };
  }

  // =========================================================================
  // Lifecycle Methods
  // =========================================================================

  async init(_options?: StorageInitOptions): Promise<void> {
    if (this.initialized) {
      return;
    }

    this.log("debug", `Initializing with baseDir ${this.config.baseDir}`);

    try {
      // Ensure base directory exists
      await fs.mkdir(this.config.baseDir, { recursive: true });

      // Load existing data or create new
      await this.loadData();

      this.initialized = true;
      this.log("info", "Initialized successfully");
    } catch (error) {
      throw FileErrors.create(
        "IO_ERROR",
        `Failed to initialize file storage: ${error instanceof Error ? error.message : String(error)}`,
        { cause: error instanceof Error ? error : undefined },
      );
    }
  }

  async close(): Promise<void> {
    this.log("debug", "Closing");

    // Clear any pending save
    if (this.saveTimeout) {
      clearTimeout(this.saveTimeout);
      this.saveTimeout = null;
    }

    // Save any pending changes
    if (this.dirty) {
      await this.saveData();
    }

    this.data = null;
    this.initialized = false;
    this.log("info", "Closed");
  }

  async healthCheck(): Promise<StorageHealthResult> {
    const start = performance.now();

    if (!this.initialized) {
      return {
        healthy: false,
        backend: "file",
        error: "Storage not initialized",
      };
    }

    try {
      await fs.access(this.config.baseDir);
      const latencyMs = Math.round(performance.now() - start);
      return {
        healthy: true,
        backend: "file",
        latencyMs,
      };
    } catch (error) {
      return {
        healthy: false,
        backend: "file",
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

    this.data!.threads[newThread.id] = newThread;
    this.markDirty();

    this.log("debug", `Created thread ${newThread.id}`);
    return this.deserializeEntity({ ...newThread });
  }

  async getThread(threadId: string): Promise<StorageThread | null> {
    this.ensureInitialized();
    const thread = this.data!.threads[threadId];
    return thread ? this.deserializeEntity({ ...thread }) : null;
  }

  async updateThread(
    threadId: string,
    updates: UpdateThreadInput,
  ): Promise<StorageThread | null> {
    this.ensureInitialized();

    const existing = this.data!.threads[threadId];
    if (!existing) {
      return null;
    }

    const updated: StorageThread = {
      ...existing,
      ...updates,
      id: existing.id,
      createdAt: existing.createdAt,
      updatedAt: new Date(),
    };

    this.data!.threads[threadId] = updated;
    this.markDirty();

    this.log("debug", `Updated thread ${threadId}`);
    return this.deserializeEntity({ ...updated });
  }

  async deleteThread(threadId: string): Promise<boolean> {
    this.ensureInitialized();

    if (!this.data!.threads[threadId]) {
      return false;
    }

    // Delete all messages in thread
    await this.deleteMessagesByThreadId(threadId);

    delete this.data!.threads[threadId];
    this.markDirty();

    this.log("debug", `Deleted thread ${threadId}`);
    return true;
  }

  async listThreads(
    options?: ThreadQueryOptions,
  ): Promise<PaginatedResult<StorageThread>> {
    this.ensureInitialized();

    let threads = Object.values(this.data!.threads).map((t) =>
      this.deserializeEntity(t),
    );

    // Apply filters
    if (options?.resourceId) {
      threads = threads.filter((t) => t.resourceId === options.resourceId);
    }
    if (options?.status) {
      threads = threads.filter((t) => t.status === options.status);
    }

    threads = this.applyFilters(threads, options?.filters);
    threads = this.applySorting(threads, options?.sort);

    return this.paginate(threads, options);
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

    if (!this.data!.threads[message.threadId]) {
      throw FileErrors.create(
        "THREAD_NOT_FOUND",
        `Thread ${message.threadId} not found`,
      );
    }

    const now = new Date();
    const newMessage: StorageMessage = {
      ...message,
      id: randomUUID(),
      createdAt: now,
      updatedAt: now,
    };

    this.data!.messages[newMessage.id] = newMessage;
    this.markDirty();

    this.log("debug", `Created message ${newMessage.id}`);
    return this.deserializeEntity({ ...newMessage });
  }

  async createMessages(
    messages: CreateMessageInput[],
  ): Promise<StorageMessage[]> {
    const results: StorageMessage[] = [];
    for (const message of messages) {
      const created = await this.createMessage(message);
      results.push(created);
    }
    return results;
  }

  async getMessage(messageId: string): Promise<StorageMessage | null> {
    this.ensureInitialized();
    const message = this.data!.messages[messageId];
    return message ? this.deserializeEntity({ ...message }) : null;
  }

  async updateMessage(
    messageId: string,
    updates: UpdateMessageInput,
  ): Promise<StorageMessage | null> {
    this.ensureInitialized();

    const existing = this.data!.messages[messageId];
    if (!existing) {
      return null;
    }

    const updated: StorageMessage = {
      ...existing,
      ...updates,
      id: existing.id,
      threadId: existing.threadId,
      createdAt: existing.createdAt,
      updatedAt: new Date(),
    };

    this.data!.messages[messageId] = updated;
    this.markDirty();

    this.log("debug", `Updated message ${messageId}`);
    return this.deserializeEntity({ ...updated });
  }

  async deleteMessage(messageId: string): Promise<boolean> {
    this.ensureInitialized();

    if (!this.data!.messages[messageId]) {
      return false;
    }

    delete this.data!.messages[messageId];
    this.markDirty();

    this.log("debug", `Deleted message ${messageId}`);
    return true;
  }

  async listMessages(
    options: MessageQueryOptions,
  ): Promise<PaginatedResult<StorageMessage>> {
    this.ensureInitialized();

    let messages = Object.values(this.data!.messages)
      .filter((m) => m.threadId === options.threadId)
      .map((m) => this.deserializeEntity(m));

    if (options.role) {
      messages = messages.filter((m) => m.role === options.role);
    }
    if (options.type) {
      messages = messages.filter((m) => m.type === options.type);
    }
    if (options.dateRange) {
      if (options.dateRange.from) {
        messages = messages.filter(
          (m) => m.createdAt >= options.dateRange!.from!,
        );
      }
      if (options.dateRange.to) {
        messages = messages.filter(
          (m) => m.createdAt <= options.dateRange!.to!,
        );
      }
    }

    messages = this.applyFilters(messages, options.filters);
    messages = this.applySorting(
      messages,
      options.sort || [{ field: "createdAt", direction: "asc" }],
    );

    return this.paginate(messages, options);
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

    let count = 0;
    for (const [id, message] of Object.entries(this.data!.messages)) {
      if (message.threadId === threadId) {
        delete this.data!.messages[id];
        count++;
      }
    }

    if (count > 0) {
      this.markDirty();
    }

    this.log("debug", `Deleted ${count} messages from thread ${threadId}`);
    return count;
  }

  // =========================================================================
  // Workflow Run Operations
  // =========================================================================

  async saveWorkflowRun(
    run: SaveWorkflowRunInput,
  ): Promise<StorageWorkflowRun> {
    this.ensureInitialized();

    const now = new Date();
    const existing = run.id ? this.data!.workflowRuns[run.id] : null;

    const workflowRun: StorageWorkflowRun = {
      ...run,
      id: run.id || randomUUID(),
      createdAt: existing?.createdAt || now,
      updatedAt: now,
    };

    this.data!.workflowRuns[workflowRun.id] = workflowRun;
    this.markDirty();

    this.log("debug", `Saved workflow run ${workflowRun.id}`);
    return this.deserializeEntity({ ...workflowRun });
  }

  async getWorkflowRun(runId: string): Promise<StorageWorkflowRun | null> {
    this.ensureInitialized();
    const run = this.data!.workflowRuns[runId];
    return run ? this.deserializeEntity({ ...run }) : null;
  }

  async listWorkflowRuns(
    options?: WorkflowRunQueryOptions,
  ): Promise<PaginatedResult<StorageWorkflowRun>> {
    this.ensureInitialized();

    let runs = Object.values(this.data!.workflowRuns).map((r) =>
      this.deserializeEntity(r),
    );

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

    runs = this.applyFilters(runs, options?.filters);
    runs = this.applySorting(
      runs,
      options?.sort || [{ field: "createdAt", direction: "desc" }],
    );

    return this.paginate(runs, options);
  }

  async updateWorkflowRunStatus(
    runId: string,
    status: WorkflowRunStatus,
    output?: JsonValue,
    error?: StorageWorkflowError,
  ): Promise<StorageWorkflowRun | null> {
    this.ensureInitialized();

    const existing = this.data!.workflowRuns[runId];
    if (!existing) {
      return null;
    }

    const updated: StorageWorkflowRun = {
      ...existing,
      status,
      output: output !== undefined ? output : existing.output,
      error: error !== undefined ? error : existing.error,
      updatedAt: new Date(),
    };

    this.data!.workflowRuns[runId] = updated;
    this.markDirty();

    this.log("debug", `Updated workflow run ${runId} status to ${status}`);
    return this.deserializeEntity({ ...updated });
  }

  async updateStepResult(
    runId: string,
    stepId: string,
    result: StepRunResult,
  ): Promise<boolean> {
    this.ensureInitialized();

    const existing = this.data!.workflowRuns[runId];
    if (!existing) {
      return false;
    }

    const updated: StorageWorkflowRun = {
      ...existing,
      stepResults: {
        ...existing.stepResults,
        [stepId]: result,
      },
      updatedAt: new Date(),
    };

    this.data!.workflowRuns[runId] = updated;
    this.markDirty();

    this.log("debug", `Updated step ${stepId} in workflow run ${runId}`);
    return true;
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

    const recordKey = this.getRecordKey(namespace, key);
    const now = new Date();
    const existing = this.data!.customRecords[recordKey];

    const record: StorageCustomRecord = {
      namespace,
      key,
      value,
      createdAt: existing?.createdAt || now,
      updatedAt: now,
      ttl: options?.ttl,
      metadata: options?.metadata,
    };

    this.data!.customRecords[recordKey] = record;
    this.markDirty();

    this.log("debug", `Set record ${namespace}:${key}`);
    return { ...record };
  }

  async getRecord(
    namespace: string,
    key: string,
  ): Promise<StorageCustomRecord | null> {
    this.ensureInitialized();

    const recordKey = this.getRecordKey(namespace, key);
    const record = this.data!.customRecords[recordKey];

    if (!record) {
      return null;
    }

    // Check TTL expiration
    if (record.ttl) {
      const updatedAt = new Date(record.updatedAt);
      const expiresAt = new Date(updatedAt.getTime() + record.ttl * 1000);
      if (new Date() > expiresAt) {
        delete this.data!.customRecords[recordKey];
        this.markDirty();
        return null;
      }
    }

    return this.deserializeEntity({ ...record });
  }

  async deleteRecord(namespace: string, key: string): Promise<boolean> {
    this.ensureInitialized();

    const recordKey = this.getRecordKey(namespace, key);
    if (!this.data!.customRecords[recordKey]) {
      return false;
    }

    delete this.data!.customRecords[recordKey];
    this.markDirty();

    this.log("debug", `Deleted record ${namespace}:${key}`);
    return true;
  }

  async listRecords(
    namespace: string,
    options?: StorageQueryOptions,
  ): Promise<PaginatedResult<StorageCustomRecord>> {
    this.ensureInitialized();

    const now = new Date();
    let records = Object.values(this.data!.customRecords)
      .filter((r) => r.namespace === namespace)
      .map((r) => this.deserializeEntity(r))
      .filter((r) => {
        if (!r.ttl) {
          return true;
        }
        const expiresAt = new Date(r.updatedAt.getTime() + r.ttl * 1000);
        return now <= expiresAt;
      });

    records = this.applyFilters(records, options?.filters);
    records = this.applySorting(records, options?.sort);

    return this.paginate(records, options);
  }

  async hasRecord(namespace: string, key: string): Promise<boolean> {
    const record = await this.getRecord(namespace, key);
    return record !== null;
  }

  async deleteNamespace(namespace: string): Promise<number> {
    this.ensureInitialized();

    let count = 0;
    for (const [recordKey, record] of Object.entries(
      this.data!.customRecords,
    )) {
      if (record.namespace === namespace) {
        delete this.data!.customRecords[recordKey];
        count++;
      }
    }

    if (count > 0) {
      this.markDirty();
    }

    this.log("debug", `Deleted ${count} records from namespace ${namespace}`);
    return count;
  }

  // =========================================================================
  // Utility Methods
  // =========================================================================

  async getStats(): Promise<StorageStats> {
    this.ensureInitialized();

    return {
      threadCount: Object.keys(this.data!.threads).length,
      messageCount: Object.keys(this.data!.messages).length,
      workflowRunCount: Object.keys(this.data!.workflowRuns).length,
      customRecordCount: Object.keys(this.data!.customRecords).length,
    };
  }

  async clearAll(): Promise<void> {
    this.ensureInitialized();

    this.data!.threads = {};
    this.data!.messages = {};
    this.data!.workflowRuns = {};
    this.data!.customRecords = {};
    this.markDirty();

    this.log("warn", "All data cleared");
  }

  // =========================================================================
  // Private Helper Methods
  // =========================================================================

  protected ensureInitialized(): void {
    if (!this.initialized || !this.data) {
      throw FileErrors.create(
        "NOT_INITIALIZED",
        "Storage not initialized. Call init() first.",
      );
    }
  }

  private getFilePath(): string {
    const namespace = this.config.namespace || "default";
    return join(this.config.baseDir, `${namespace}${this.config.extension}`);
  }

  private getRecordKey(namespace: string, key: string): string {
    return `${namespace}:${key}`;
  }

  private async loadData(): Promise<void> {
    const filePath = this.getFilePath();

    try {
      const content = await fs.readFile(
        filePath,
        this.config.encoding || "utf-8",
      );
      const parsed = JSON.parse(content as string);
      this.data = this.migrateData(parsed);
      this.log("debug", `Loaded data from ${filePath}`);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") {
        // File doesn't exist, create new data
        this.data = this.createEmptyData();
        await this.saveData();
        this.log("debug", `Created new data file at ${filePath}`);
      } else {
        throw error;
      }
    }
  }

  private createEmptyData(): StorageFileData {
    const now = new Date().toISOString();
    return {
      threads: {},
      messages: {},
      workflowRuns: {},
      customRecords: {},
      metadata: {
        version: 1,
        createdAt: now,
        updatedAt: now,
      },
    };
  }

  private migrateData(data: unknown): StorageFileData {
    // Handle migration from older versions if needed
    const parsed = data as StorageFileData;

    if (!parsed.metadata) {
      const now = new Date().toISOString();
      parsed.metadata = {
        version: 1,
        createdAt: now,
        updatedAt: now,
      };
    }

    return parsed;
  }

  private markDirty(): void {
    this.dirty = true;

    // Debounce saves
    if (this.saveTimeout) {
      clearTimeout(this.saveTimeout);
    }

    this.saveTimeout = setTimeout(() => {
      this.saveData().catch((error) => {
        this.log("error", "Failed to save data", { error });
      });
    }, 100);
  }

  private async saveData(): Promise<void> {
    if (!this.data) {
      return;
    }

    this.data.metadata.updatedAt = new Date().toISOString();
    const filePath = this.getFilePath();
    const content = JSON.stringify(this.data, null, 2);

    try {
      // Ensure directory exists
      await fs.mkdir(dirname(filePath), { recursive: true });

      if (this.config.atomicWrites) {
        // Atomic write using temp file
        const tempPath = `${filePath}.tmp`;
        await fs.writeFile(tempPath, content, this.config.encoding);
        await fs.rename(tempPath, filePath);
      } else {
        await fs.writeFile(filePath, content, this.config.encoding);
      }

      this.dirty = false;
      this.log("debug", `Saved data to ${filePath}`);
    } catch (error) {
      throw FileErrors.create(
        "IO_ERROR",
        `Failed to save data: ${error instanceof Error ? error.message : String(error)}`,
        { cause: error instanceof Error ? error : undefined },
      );
    }
  }

  private deserializeEntity<
    T extends { createdAt: Date | string; updatedAt: Date | string },
  >(entity: T): T {
    return {
      ...entity,
      createdAt:
        entity.createdAt instanceof Date
          ? entity.createdAt
          : new Date(entity.createdAt),
      updatedAt:
        entity.updatedAt instanceof Date
          ? entity.updatedAt
          : new Date(entity.updatedAt),
    };
  }

  private applyFilters<T extends Record<string, unknown>>(
    items: T[],
    filters?: QueryFilters,
  ): T[] {
    if (!filters?.conditions || filters.conditions.length === 0) {
      return items;
    }

    const logic = filters.logic || "and";

    return items.filter((item) => {
      const results = filters.conditions!.map((condition) => {
        const value = this.getNestedValue(item, condition.field);
        return this.evaluateCondition(
          value,
          condition.operator,
          condition.value,
        );
      });

      return logic === "and" ? results.every(Boolean) : results.some(Boolean);
    });
  }

  private getNestedValue(obj: Record<string, unknown>, path: string): unknown {
    const parts = path.split(".");
    let current: unknown = obj;

    for (const part of parts) {
      if (current === null || current === undefined) {
        return undefined;
      }
      current = (current as Record<string, unknown>)[part];
    }

    return current;
  }

  private evaluateCondition(
    value: unknown,
    operator: FilterOperator,
    target: JsonValue,
  ): boolean {
    switch (operator) {
      case "eq":
        return value === target;
      case "ne":
        return value !== target;
      case "gt":
        return (value as number) > (target as number);
      case "gte":
        return (value as number) >= (target as number);
      case "lt":
        return (value as number) < (target as number);
      case "lte":
        return (value as number) <= (target as number);
      case "in":
        return Array.isArray(target) && target.includes(value as never);
      case "nin":
        return Array.isArray(target) && !target.includes(value as never);
      case "contains":
        return (
          typeof value === "string" &&
          typeof target === "string" &&
          value.includes(target)
        );
      case "startsWith":
        return (
          typeof value === "string" &&
          typeof target === "string" &&
          value.startsWith(target)
        );
      case "endsWith":
        return (
          typeof value === "string" &&
          typeof target === "string" &&
          value.endsWith(target)
        );
      default:
        return false;
    }
  }

  private applySorting<T extends Record<string, unknown>>(
    items: T[],
    sort?: SortOptions[],
  ): T[] {
    if (!sort || sort.length === 0) {
      return items;
    }

    return [...items].sort((a, b) => {
      for (const { field, direction } of sort) {
        const aValue = this.getNestedValue(a, field);
        const bValue = this.getNestedValue(b, field);

        if (aValue === bValue) {
          continue;
        }

        const comparison =
          aValue === null || aValue === undefined
            ? 1
            : bValue === null || bValue === undefined
              ? -1
              : aValue instanceof Date && bValue instanceof Date
                ? aValue.getTime() - bValue.getTime()
                : typeof aValue === "string" && typeof bValue === "string"
                  ? aValue.localeCompare(bValue)
                  : typeof aValue === "number" && typeof bValue === "number"
                    ? aValue - bValue
                    : String(aValue).localeCompare(String(bValue));

        if (comparison !== 0) {
          return direction === "desc" ? -comparison : comparison;
        }
      }
      return 0;
    });
  }

  protected paginate<T>(
    items: T[],
    options?: PaginationOptions,
  ): PaginatedResult<T> {
    const limit = options?.limit || 50;
    const offset = options?.offset || 0;

    const total = items.length;
    const paginatedItems = items.slice(offset, offset + limit);
    const hasMore = offset + limit < total;

    return {
      data: paginatedItems,
      total,
      hasMore,
      nextCursor: hasMore ? String(offset + limit) : undefined,
    };
  }
}
