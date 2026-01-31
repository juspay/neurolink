/**
 * S3StorageAdapter - AWS S3 Storage Implementation
 *
 * Provides object storage using AWS S3 or S3-compatible services.
 * Suitable for blob storage, document storage, and distributed access.
 *
 * Note: For structured data, consider using PostgreSQL or MongoDB.
 * S3 is optimized for object/blob storage patterns.
 *
 * @module S3StorageAdapter
 * @since 9.0.0
 */

import { randomUUID } from "crypto";
import { createErrorFactory } from "../../core/infrastructure/baseError.js";
import { BaseStorageProvider } from "../storageProvider.js";
import type {
  StorageThread,
  StorageMessage,
  StorageWorkflowRun,
  StorageCustomRecord,
  StorageStats,
  StorageHealthResult,
  StorageInitOptions,
  ThreadQueryOptions,
  MessageQueryOptions,
  WorkflowRunQueryOptions,
  StorageQueryOptions,
  PaginatedResult,
  WorkflowRunStatus,
  StepRunResult,
} from "../../types/index.js";
import type {
  S3StorageConfig,
  MastraStorageConfig as StorageProviderConfig,
} from "../../types/index.js";
import type { JsonValue, JsonObject } from "../../types/index.js";
import type { StorageS3Client } from "../../types/index.js";

// =============================================================================
// Error Factory
// =============================================================================

const S3Errors = createErrorFactory("S3Storage", {
  NOT_INITIALIZED: "S3_NOT_INITIALIZED",
  CONNECTION_FAILED: "S3_CONNECTION_FAILED",
  OPERATION_FAILED: "S3_OPERATION_FAILED",
  VALIDATION_ERROR: "S3_VALIDATION_ERROR",
});

// =============================================================================
// S3StorageAdapter Class
// =============================================================================

/**
 * S3 storage implementation using object keys as paths.
 *
 * Data is stored as JSON objects with the following key structure:
 * - threads/{id}.json
 * - messages/{threadId}/{id}.json
 * - workflows/{id}.json
 * - records/{namespace}/{key}.json
 */
export class S3StorageAdapter extends BaseStorageProvider {
  readonly type = "s3" as const;

  private config: S3StorageConfig;
  private client: StorageS3Client | null = null;
  private keyPrefix: string;

  // In-memory index for efficient lookups (loaded on init)
  private threadIndex = new Map<string, StorageThread>();
  private messageIndex = new Map<string, StorageMessage[]>();
  private workflowIndex = new Map<string, StorageWorkflowRun>();
  private recordIndex = new Map<string, StorageCustomRecord>();

  constructor(config: StorageProviderConfig) {
    super();
    if (config.type !== "s3") {
      throw S3Errors.create(
        "VALIDATION_ERROR",
        `Invalid config type: expected 's3', got '${config.type}'`,
      );
    }
    this.config = config;
    this.keyPrefix = config.keyPrefix || "neurolink/";
  }

  async init(_options?: StorageInitOptions): Promise<void> {
    if (this.initialized) {
      return;
    }

    this.log("debug", "Initializing");

    try {
      let s3Module;
      try {
        s3Module = await import("@aws-sdk/client-s3");
      } catch {
        throw new Error(
          `AWS S3 SDK not installed. Run: pnpm add @aws-sdk/client-s3\n` +
            `The '@aws-sdk/client-s3' package is a peer dependency required for S3 storage.`,
        );
      }
      const { S3Client: S3, ListObjectsV2Command } = s3Module;

      const clientConfig: Record<string, unknown> = {
        region: this.config.region || "us-east-1",
      };

      if (this.config.endpoint) {
        clientConfig.endpoint = this.config.endpoint;
        clientConfig.forcePathStyle = true;
      }

      if (this.config.accessKeyId && this.config.secretAccessKey) {
        clientConfig.credentials = {
          accessKeyId: this.config.accessKeyId,
          secretAccessKey: this.config.secretAccessKey,
        };
      }

      this.client = new S3(clientConfig) as unknown as StorageS3Client;

      // Verify bucket access
      await this.client.send(
        new ListObjectsV2Command({
          Bucket: this.config.bucket,
          MaxKeys: 1,
        }),
      );

      // Load indexes (for small datasets; for large datasets, use external indexing)
      await this.loadIndexes();

      this.initialized = true;
      this.log("info", "Initialized successfully");
    } catch (error) {
      throw S3Errors.create(
        "CONNECTION_FAILED",
        `Failed to connect to S3: ${error instanceof Error ? error.message : String(error)}`,
        { cause: error instanceof Error ? error : undefined },
      );
    }
  }

  async close(): Promise<void> {
    this.client = null;
    this.threadIndex.clear();
    this.messageIndex.clear();
    this.workflowIndex.clear();
    this.recordIndex.clear();
    this.initialized = false;
    this.log("info", "Closed");
  }

  async healthCheck(): Promise<StorageHealthResult> {
    if (!this.initialized || !this.client) {
      return {
        healthy: false,
        backend: "s3",
        error: "Storage not initialized",
      };
    }
    const start = Date.now();
    try {
      const { HeadBucketCommand } = await import("@aws-sdk/client-s3");
      await this.client.send(
        new HeadBucketCommand({ Bucket: this.config.bucket }),
      );
      return { healthy: true, backend: "s3", latencyMs: Date.now() - start };
    } catch (error) {
      return {
        healthy: false,
        backend: "s3",
        latencyMs: Date.now() - start,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  // =========================================================================
  // Thread Operations
  // =========================================================================

  async createThread(
    thread: Omit<StorageThread, "id" | "createdAt" | "updatedAt">,
  ): Promise<StorageThread> {
    this.ensureInitialized();
    const now = new Date();
    const newThread: StorageThread = {
      ...thread,
      id: randomUUID(),
      createdAt: now,
      updatedAt: now,
      status: thread.status || "active",
    };

    await this.putObject(`threads/${newThread.id}.json`, newThread);
    this.threadIndex.set(newThread.id, newThread);

    return { ...newThread };
  }

  async getThread(threadId: string): Promise<StorageThread | null> {
    this.ensureInitialized();
    return this.threadIndex.get(threadId) || null;
  }

  async updateThread(
    threadId: string,
    updates: Partial<Omit<StorageThread, "id" | "createdAt">>,
  ): Promise<StorageThread | null> {
    this.ensureInitialized();
    const existing = this.threadIndex.get(threadId);
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

    await this.putObject(`threads/${threadId}.json`, updated);
    this.threadIndex.set(threadId, updated);

    return { ...updated };
  }

  async deleteThread(threadId: string): Promise<boolean> {
    this.ensureInitialized();
    if (!this.threadIndex.has(threadId)) {
      return false;
    }

    await this.deleteMessagesByThreadId(threadId);
    await this.deleteObject(`threads/${threadId}.json`);
    this.threadIndex.delete(threadId);

    return true;
  }

  async listThreads(
    options?: ThreadQueryOptions,
  ): Promise<PaginatedResult<StorageThread>> {
    this.ensureInitialized();
    let threads = Array.from(this.threadIndex.values());

    if (options?.resourceId) {
      threads = threads.filter((t) => t.resourceId === options.resourceId);
    }
    if (options?.status) {
      threads = threads.filter((t) => t.status === options.status);
    }

    threads.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    const limit = options?.limit || 50;
    const offset = options?.offset || 0;
    const total = threads.length;

    return {
      data: threads.slice(offset, offset + limit),
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

  async createMessage(
    message: Omit<StorageMessage, "id" | "createdAt" | "updatedAt">,
  ): Promise<StorageMessage> {
    this.ensureInitialized();
    const now = new Date();
    const newMessage: StorageMessage = {
      ...message,
      id: randomUUID(),
      createdAt: now,
      updatedAt: now,
    };

    await this.putObject(
      `messages/${message.threadId}/${newMessage.id}.json`,
      newMessage,
    );

    const threadMessages = this.messageIndex.get(message.threadId) || [];
    threadMessages.push(newMessage);
    this.messageIndex.set(message.threadId, threadMessages);

    return { ...newMessage };
  }

  async createMessages(
    messages: Omit<StorageMessage, "id" | "createdAt" | "updatedAt">[],
  ): Promise<StorageMessage[]> {
    return Promise.all(messages.map((m) => this.createMessage(m)));
  }

  async getMessage(messageId: string): Promise<StorageMessage | null> {
    this.ensureInitialized();
    for (const messages of this.messageIndex.values()) {
      const message = messages.find((m) => m.id === messageId);
      if (message) {
        return message;
      }
    }
    return null;
  }

  async updateMessage(
    messageId: string,
    updates: Partial<Omit<StorageMessage, "id" | "threadId" | "createdAt">>,
  ): Promise<StorageMessage | null> {
    this.ensureInitialized();
    const existing = await this.getMessage(messageId);
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

    await this.putObject(
      `messages/${existing.threadId}/${messageId}.json`,
      updated,
    );

    const threadMessages = this.messageIndex.get(existing.threadId) || [];
    const index = threadMessages.findIndex((m) => m.id === messageId);
    if (index !== -1) {
      threadMessages[index] = updated;
    }

    return { ...updated };
  }

  async deleteMessage(messageId: string): Promise<boolean> {
    this.ensureInitialized();
    const existing = await this.getMessage(messageId);
    if (!existing) {
      return false;
    }

    await this.deleteObject(`messages/${existing.threadId}/${messageId}.json`);

    const threadMessages = this.messageIndex.get(existing.threadId) || [];
    const filtered = threadMessages.filter((m) => m.id !== messageId);
    this.messageIndex.set(existing.threadId, filtered);

    return true;
  }

  async listMessages(
    options: MessageQueryOptions,
  ): Promise<PaginatedResult<StorageMessage>> {
    this.ensureInitialized();
    let messages = this.messageIndex.get(options.threadId) || [];

    if (options.role) {
      messages = messages.filter((m) => m.role === options.role);
    }
    if (options.type) {
      messages = messages.filter((m) => m.type === options.type);
    }

    messages.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());

    const limit = options.limit || 50;
    const offset = options.offset || 0;
    const total = messages.length;

    return {
      data: messages.slice(offset, offset + limit),
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
    const messages = this.messageIndex.get(threadId) || [];

    for (const message of messages) {
      await this.deleteObject(`messages/${threadId}/${message.id}.json`);
    }

    this.messageIndex.delete(threadId);
    return messages.length;
  }

  // =========================================================================
  // Workflow Run Operations
  // =========================================================================

  async saveWorkflowRun(
    run: Omit<StorageWorkflowRun, "createdAt" | "updatedAt"> & { id?: string },
  ): Promise<StorageWorkflowRun> {
    this.ensureInitialized();
    const now = new Date();
    const id = run.id || randomUUID();
    const existing = this.workflowIndex.get(id);

    const workflowRun: StorageWorkflowRun = {
      ...run,
      id,
      createdAt: existing?.createdAt || now,
      updatedAt: now,
    };

    await this.putObject(`workflows/${id}.json`, workflowRun);
    this.workflowIndex.set(id, workflowRun);

    return { ...workflowRun };
  }

  async getWorkflowRun(runId: string): Promise<StorageWorkflowRun | null> {
    this.ensureInitialized();
    return this.workflowIndex.get(runId) || null;
  }

  async listWorkflowRuns(
    options?: WorkflowRunQueryOptions,
  ): Promise<PaginatedResult<StorageWorkflowRun>> {
    this.ensureInitialized();
    let runs = Array.from(this.workflowIndex.values());

    if (options?.workflowId) {
      runs = runs.filter((r) => r.workflowId === options.workflowId);
    }
    if (options?.status) {
      runs = runs.filter((r) => r.status === options.status);
    }

    runs.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    const limit = options?.limit || 50;
    const offset = options?.offset || 0;
    const total = runs.length;

    return {
      data: runs.slice(offset, offset + limit),
      total,
      hasMore: offset + limit < total,
    };
  }

  async updateWorkflowRunStatus(
    runId: string,
    status: WorkflowRunStatus,
    output?: JsonValue,
    error?: StorageWorkflowRun["error"],
  ): Promise<StorageWorkflowRun | null> {
    this.ensureInitialized();
    const existing = this.workflowIndex.get(runId);
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

    await this.putObject(`workflows/${runId}.json`, updated);
    this.workflowIndex.set(runId, updated);

    return { ...updated };
  }

  async updateStepResult(
    runId: string,
    stepId: string,
    result: StepRunResult,
  ): Promise<boolean> {
    this.ensureInitialized();
    const existing = this.workflowIndex.get(runId);
    if (!existing) {
      return false;
    }

    const updated: StorageWorkflowRun = {
      ...existing,
      stepResults: { ...existing.stepResults, [stepId]: result },
      updatedAt: new Date(),
    };

    await this.putObject(`workflows/${runId}.json`, updated);
    this.workflowIndex.set(runId, updated);

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
    const now = new Date();
    const recordKey = `${namespace}:${key}`;
    const existing = this.recordIndex.get(recordKey);

    const record: StorageCustomRecord = {
      namespace,
      key,
      value,
      ttl: options?.ttl,
      metadata: options?.metadata,
      createdAt: existing?.createdAt || now,
      updatedAt: now,
    };

    await this.putObject(`records/${namespace}/${key}.json`, record);
    this.recordIndex.set(recordKey, record);

    return { ...record };
  }

  async getRecord(
    namespace: string,
    key: string,
  ): Promise<StorageCustomRecord | null> {
    this.ensureInitialized();
    const record = this.recordIndex.get(`${namespace}:${key}`);
    if (!record) {
      return null;
    }

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
    if (!this.recordIndex.has(`${namespace}:${key}`)) {
      return false;
    }

    await this.deleteObject(`records/${namespace}/${key}.json`);
    this.recordIndex.delete(`${namespace}:${key}`);

    return true;
  }

  async listRecords(
    namespace: string,
    options?: StorageQueryOptions,
  ): Promise<PaginatedResult<StorageCustomRecord>> {
    this.ensureInitialized();
    const records = Array.from(this.recordIndex.values()).filter(
      (r) => r.namespace === namespace,
    );

    const limit = options?.limit || 50;
    const offset = options?.offset || 0;
    const total = records.length;

    return {
      data: records.slice(offset, offset + limit),
      total,
      hasMore: offset + limit < total,
    };
  }

  async hasRecord(namespace: string, key: string): Promise<boolean> {
    return (await this.getRecord(namespace, key)) !== null;
  }

  async deleteNamespace(namespace: string): Promise<number> {
    this.ensureInitialized();
    const records = Array.from(this.recordIndex.values()).filter(
      (r) => r.namespace === namespace,
    );

    for (const record of records) {
      await this.deleteObject(`records/${namespace}/${record.key}.json`);
      this.recordIndex.delete(`${namespace}:${record.key}`);
    }

    return records.length;
  }

  // =========================================================================
  // Utility Methods
  // =========================================================================

  async getStats(): Promise<StorageStats> {
    this.ensureInitialized();
    return {
      threadCount: this.threadIndex.size,
      messageCount: Array.from(this.messageIndex.values()).reduce(
        (acc, m) => acc + m.length,
        0,
      ),
      workflowRunCount: this.workflowIndex.size,
      customRecordCount: this.recordIndex.size,
    };
  }

  async clearAll(): Promise<void> {
    this.ensureInitialized();

    // Delete all objects with prefix
    const { ListObjectsV2Command, DeleteObjectsCommand } =
      await import("@aws-sdk/client-s3");

    let continuationToken: string | undefined;

    do {
      const listResult = (await this.client!.send(
        new ListObjectsV2Command({
          Bucket: this.config.bucket,
          Prefix: this.keyPrefix,
          ContinuationToken: continuationToken,
        }),
      )) as {
        Contents?: Array<{ Key: string }>;
        NextContinuationToken?: string;
      };

      if (listResult.Contents && listResult.Contents.length > 0) {
        await this.client!.send(
          new DeleteObjectsCommand({
            Bucket: this.config.bucket,
            Delete: {
              Objects: listResult.Contents.map((obj) => ({ Key: obj.Key })),
            },
          }),
        );
      }

      continuationToken = listResult.NextContinuationToken;
    } while (continuationToken);

    this.threadIndex.clear();
    this.messageIndex.clear();
    this.workflowIndex.clear();
    this.recordIndex.clear();

    this.log("warn", "All data cleared");
  }

  // =========================================================================
  // Private Helpers
  // =========================================================================

  protected ensureInitialized(): void {
    if (!this.initialized || !this.client) {
      throw S3Errors.create("NOT_INITIALIZED", "Storage not initialized");
    }
  }

  private async putObject(key: string, data: unknown): Promise<void> {
    const { PutObjectCommand } = await import("@aws-sdk/client-s3");
    await this.client!.send(
      new PutObjectCommand({
        Bucket: this.config.bucket,
        Key: this.keyPrefix + key,
        Body: JSON.stringify(data),
        ContentType: "application/json",
        ServerSideEncryption: this.config.serverSideEncryption,
        SSEKMSKeyId: this.config.kmsKeyId,
      }),
    );
  }

  private async deleteObject(key: string): Promise<void> {
    const { DeleteObjectCommand } = await import("@aws-sdk/client-s3");
    await this.client!.send(
      new DeleteObjectCommand({
        Bucket: this.config.bucket,
        Key: this.keyPrefix + key,
      }),
    );
  }

  private async loadIndexes(): Promise<void> {
    this.log("debug", "Loading indexes");

    const { ListObjectsV2Command, GetObjectCommand } =
      await import("@aws-sdk/client-s3");

    // Load all objects and build indexes
    const listResult = (await this.client!.send(
      new ListObjectsV2Command({
        Bucket: this.config.bucket,
        Prefix: this.keyPrefix,
      }),
    )) as { Contents?: Array<{ Key: string }> };

    if (!listResult.Contents) {
      return;
    }

    for (const obj of listResult.Contents) {
      const key = obj.Key.replace(this.keyPrefix, "");

      try {
        const getResult = (await this.client!.send(
          new GetObjectCommand({
            Bucket: this.config.bucket,
            Key: obj.Key,
          }),
        )) as { Body?: { transformToString(): Promise<string> } };

        if (getResult.Body) {
          const content = await getResult.Body.transformToString();
          const data = JSON.parse(content);

          // Parse dates
          if (data.createdAt) {
            data.createdAt = new Date(data.createdAt);
          }
          if (data.updatedAt) {
            data.updatedAt = new Date(data.updatedAt);
          }

          if (key.startsWith("threads/")) {
            this.threadIndex.set(data.id, data);
          } else if (key.startsWith("messages/")) {
            const threadId = data.threadId;
            const messages = this.messageIndex.get(threadId) || [];
            messages.push(data);
            this.messageIndex.set(threadId, messages);
          } else if (key.startsWith("workflows/")) {
            this.workflowIndex.set(data.id, data);
          } else if (key.startsWith("records/")) {
            this.recordIndex.set(`${data.namespace}:${data.key}`, data);
          }
        }
      } catch {
        this.log("warn", `Failed to load object ${key}`);
      }
    }

    this.log(
      "debug",
      `Loaded ${this.threadIndex.size} threads, ${this.workflowIndex.size} workflows`,
    );
  }
}
