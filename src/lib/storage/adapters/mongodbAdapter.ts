/**
 * MongoDB Storage Adapter
 *
 * MongoDB storage implementation for document-based storage.
 * Ideal for flexible schemas and horizontal scaling.
 *
 * Features:
 * - Native document storage with BSON
 * - TTL indexes for automatic expiration
 * - Connection pooling
 * - Flexible query capabilities
 * - Atomic operations
 */

import type {
  MongoClient,
  Db,
  Collection,
  Document,
  Filter,
  UpdateFilter,
} from "mongodb";
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
  MongoDBStorageConfig,
} from "../../types/index.js";

/**
 * MongoDB document type for threads
 */
type ThreadDocument = {
  _id: string;
  resourceId: string;
  title?: string;
  metadata?: JsonObject;
  status?: string;
  createdAt: Date;
  updatedAt: Date;
};

/**
 * MongoDB document type for messages
 */
type MessageDocument = {
  _id: string;
  threadId: string;
  role: string;
  content: string;
  type?: string;
  toolInfo?: JsonObject;
  metadata?: JsonObject;
  createdAt: Date;
  updatedAt: Date;
};

/**
 * MongoDB document type for workflow runs
 */
type WorkflowRunDocument = {
  _id: string;
  workflowId: string;
  status: string;
  triggerData?: JsonObject;
  output?: JsonValue;
  error?: JsonObject;
  stepResults?: Record<string, unknown>;
  suspensionData?: JsonObject;
  resourceId?: string;
  threadId?: string;
  createdAt: Date;
  updatedAt: Date;
};

/**
 * MongoDB document type for custom records
 */
type CustomRecordDocument = {
  _id: string; // Format: "namespace:key"
  namespace: string;
  key: string;
  value: JsonValue;
  metadata?: JsonObject;
  ttl?: number;
  expiresAt?: Date;
  createdAt: Date;
  updatedAt: Date;
};

/**
 * MongoDB storage implementation
 *
 * Uses MongoDB for flexible document-based storage with native BSON support.
 */
export class MongoDBAdapter extends BaseStorageProvider {
  readonly type: StorageBackendType = "mongodb";

  /** MongoDB client */
  private client: MongoClient | null = null;

  /** Database instance */
  private db: Db | null = null;

  /** Configuration */
  private config: MongoDBStorageConfig;

  /** Collection prefix */
  private collectionPrefix: string;

  constructor(config?: MongoDBStorageConfig) {
    super();
    this.config = config || { uri: "mongodb://localhost:27017" };
    this.collectionPrefix = config?.collectionPrefix || "";
  }

  /**
   * Get collection name with prefix
   */
  private collectionName(name: string): string {
    return `${this.collectionPrefix}${name}`;
  }

  /**
   * Get typed collection
   */
  private collection<T extends Document>(name: string): Collection<T> {
    if (!this.db) {
      throw new Error("Database not initialized");
    }
    return this.db.collection<T>(this.collectionName(name));
  }

  // ============================================================================
  // Lifecycle Methods
  // ============================================================================

  async init(options?: StorageInitOptions): Promise<void> {
    if (this.initialized) {
      this.log("debug", "Already initialized");
      return;
    }

    this.log("info", "Initializing MongoDB storage");

    // Dynamic import of mongodb module
    const { MongoClient } = await import("mongodb");

    // Build client options
    const clientOptions: Record<string, unknown> = {};
    if (this.config.maxPoolSize) {
      clientOptions.maxPoolSize = this.config.maxPoolSize;
    }
    if (this.config.minPoolSize) {
      clientOptions.minPoolSize = this.config.minPoolSize;
    }
    if (this.config.connectTimeoutMs) {
      clientOptions.connectTimeoutMS = this.config.connectTimeoutMs;
    }
    if (this.config.socketTimeoutMs) {
      clientOptions.socketTimeoutMS = this.config.socketTimeoutMs;
    }

    this.client = new MongoClient(this.config.uri, clientOptions);
    await this.client.connect();

    const dbName = this.config.database || "neurolink";
    this.db = this.client.db(dbName);

    // Create indexes if migrations requested
    if (options?.runMigrations !== false) {
      await this.createIndexes();
    }

    this.initialized = true;
    this.log("info", "MongoDB storage initialized", { database: dbName });
  }

  /**
   * Create indexes for all collections
   */
  private async createIndexes(): Promise<void> {
    this.log("info", "Creating indexes");

    // Thread indexes
    const threads = this.collection<ThreadDocument>("threads");
    await threads.createIndexes([
      { key: { resourceId: 1 }, name: "idx_resourceId" },
      { key: { status: 1 }, name: "idx_status" },
      { key: { updatedAt: -1 }, name: "idx_updatedAt" },
    ]);

    // Message indexes
    const messages = this.collection<MessageDocument>("messages");
    await messages.createIndexes([
      { key: { threadId: 1 }, name: "idx_threadId" },
      { key: { threadId: 1, createdAt: 1 }, name: "idx_threadId_createdAt" },
    ]);

    // Workflow run indexes
    const workflowRuns = this.collection<WorkflowRunDocument>("workflow_runs");
    await workflowRuns.createIndexes([
      { key: { workflowId: 1 }, name: "idx_workflowId" },
      { key: { status: 1 }, name: "idx_status" },
      { key: { createdAt: -1 }, name: "idx_createdAt" },
    ]);

    // Custom record indexes (including TTL index)
    const customRecords =
      this.collection<CustomRecordDocument>("custom_records");
    await customRecords.createIndexes([
      { key: { namespace: 1 }, name: "idx_namespace" },
      {
        key: { namespace: 1, key: 1 },
        name: "idx_namespace_key",
        unique: true,
      },
      { key: { expiresAt: 1 }, name: "idx_ttl", expireAfterSeconds: 0 },
    ]);

    this.log("info", "Indexes created");
  }

  async close(): Promise<void> {
    if (this.client) {
      await this.client.close();
      this.client = null;
      this.db = null;
    }
    this.initialized = false;
    this.log("info", "Connection closed");
  }

  async healthCheck(): Promise<StorageHealthResult> {
    if (!this.db) {
      return this.createHealthError("Database not initialized");
    }

    try {
      const { result, latencyMs } = await this.measureLatency(async () => {
        const admin = this.db!.admin();
        const status = await admin.ping();
        return status.ok === 1;
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
    const doc: ThreadDocument = {
      _id: this.generateId(),
      resourceId: input.resourceId,
      title: input.title,
      metadata: input.metadata,
      status: input.status || "active",
      createdAt: now,
      updatedAt: now,
    };

    await this.collection<ThreadDocument>("threads").insertOne(doc);
    return this.mapThreadDocument(doc);
  }

  async getThread(threadId: string): Promise<StorageThread | null> {
    this.ensureInitialized();

    const doc = await this.collection<ThreadDocument>("threads").findOne({
      _id: threadId,
    });

    return doc ? this.mapThreadDocument(doc) : null;
  }

  async updateThread(
    threadId: string,
    updates: UpdateThreadInput,
  ): Promise<StorageThread | null> {
    this.ensureInitialized();

    const updateDoc: UpdateFilter<ThreadDocument> = {
      $set: {
        ...updates,
        updatedAt: this.now(),
      },
    };

    const result = await this.collection<ThreadDocument>(
      "threads",
    ).findOneAndUpdate({ _id: threadId }, updateDoc, {
      returnDocument: "after",
    });

    return result ? this.mapThreadDocument(result) : null;
  }

  async deleteThread(threadId: string): Promise<boolean> {
    this.ensureInitialized();

    // Delete all messages first
    await this.deleteMessagesByThreadId(threadId);

    const result = await this.collection<ThreadDocument>("threads").deleteOne({
      _id: threadId,
    });

    return result.deletedCount > 0;
  }

  async listThreads(
    options?: ThreadQueryOptions,
  ): Promise<PaginatedResult<StorageThread>> {
    this.ensureInitialized();

    const filter: Filter<ThreadDocument> = {};
    if (options?.resourceId) {
      filter.resourceId = options.resourceId;
    }
    if (options?.status) {
      filter.status = options.status;
    }

    const limit = options?.limit || 50;
    const offset = options?.offset || 0;

    const [docs, total] = await Promise.all([
      this.collection<ThreadDocument>("threads")
        .find(filter)
        .sort({ updatedAt: -1 })
        .skip(offset)
        .limit(limit)
        .toArray(),
      this.collection<ThreadDocument>("threads").countDocuments(filter),
    ]);

    return {
      data: docs.map((doc) => this.mapThreadDocument(doc)),
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

  private mapThreadDocument(doc: ThreadDocument): StorageThread {
    return {
      id: doc._id,
      resourceId: doc.resourceId,
      title: doc.title,
      metadata: doc.metadata,
      status: doc.status as StorageThread["status"],
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
    };
  }

  // ============================================================================
  // Message Operations
  // ============================================================================

  async createMessage(input: CreateMessageInput): Promise<StorageMessage> {
    this.ensureInitialized();

    const now = this.now();
    const doc: MessageDocument = {
      _id: this.generateId(),
      threadId: input.threadId,
      role: input.role,
      content: input.content,
      type: input.type || "text",
      toolInfo: input.toolInfo as JsonObject | undefined,
      metadata: input.metadata,
      createdAt: now,
      updatedAt: now,
    };

    await this.collection<MessageDocument>("messages").insertOne(doc);
    return this.mapMessageDocument(doc);
  }

  async createMessages(
    inputs: CreateMessageInput[],
  ): Promise<StorageMessage[]> {
    this.ensureInitialized();
    if (inputs.length === 0) {
      return [];
    }

    const now = this.now();
    const docs: MessageDocument[] = inputs.map((input) => ({
      _id: this.generateId(),
      threadId: input.threadId,
      role: input.role,
      content: input.content,
      type: input.type || "text",
      toolInfo: input.toolInfo as JsonObject | undefined,
      metadata: input.metadata,
      createdAt: now,
      updatedAt: now,
    }));

    await this.collection<MessageDocument>("messages").insertMany(docs);
    return docs.map((doc) => this.mapMessageDocument(doc));
  }

  async getMessage(messageId: string): Promise<StorageMessage | null> {
    this.ensureInitialized();

    const doc = await this.collection<MessageDocument>("messages").findOne({
      _id: messageId,
    });

    return doc ? this.mapMessageDocument(doc) : null;
  }

  async updateMessage(
    messageId: string,
    updates: UpdateMessageInput,
  ): Promise<StorageMessage | null> {
    this.ensureInitialized();

    const updateDoc: UpdateFilter<MessageDocument> = {
      $set: {
        ...updates,
        updatedAt: this.now(),
      },
    };

    const result = await this.collection<MessageDocument>(
      "messages",
    ).findOneAndUpdate({ _id: messageId }, updateDoc, {
      returnDocument: "after",
    });

    return result ? this.mapMessageDocument(result) : null;
  }

  async deleteMessage(messageId: string): Promise<boolean> {
    this.ensureInitialized();

    const result = await this.collection<MessageDocument>("messages").deleteOne(
      {
        _id: messageId,
      },
    );

    return result.deletedCount > 0;
  }

  async listMessages(
    options: MessageQueryOptions,
  ): Promise<PaginatedResult<StorageMessage>> {
    this.ensureInitialized();

    const filter: Filter<MessageDocument> = { threadId: options.threadId };
    if (options.role) {
      filter.role = options.role;
    }
    if (options.type) {
      filter.type = options.type;
    }
    if (options.dateRange?.from || options.dateRange?.to) {
      filter.createdAt = {};
      if (options.dateRange.from) {
        filter.createdAt.$gte = options.dateRange.from;
      }
      if (options.dateRange.to) {
        filter.createdAt.$lte = options.dateRange.to;
      }
    }

    const limit = options.limit || 100;
    const offset = options.offset || 0;

    const [docs, total] = await Promise.all([
      this.collection<MessageDocument>("messages")
        .find(filter)
        .sort({ createdAt: 1 })
        .skip(offset)
        .limit(limit)
        .toArray(),
      this.collection<MessageDocument>("messages").countDocuments(filter),
    ]);

    return {
      data: docs.map((doc) => this.mapMessageDocument(doc)),
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

    const result = await this.collection<MessageDocument>(
      "messages",
    ).deleteMany({
      threadId,
    });

    return result.deletedCount;
  }

  private mapMessageDocument(doc: MessageDocument): StorageMessage {
    return {
      id: doc._id,
      threadId: doc.threadId,
      role: doc.role as StorageMessage["role"],
      content: doc.content,
      type: doc.type as StorageMessage["type"],
      toolInfo: doc.toolInfo as StorageMessage["toolInfo"],
      metadata: doc.metadata,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
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

    const doc: WorkflowRunDocument = {
      _id: id,
      workflowId: input.workflowId,
      status: input.status,
      triggerData: input.triggerData,
      output: input.output,
      error: input.error as JsonObject | undefined,
      stepResults: input.stepResults,
      suspensionData: input.suspensionData as JsonObject | undefined,
      resourceId: input.resourceId,
      threadId: input.threadId,
      createdAt: now,
      updatedAt: now,
    };

    await this.collection<WorkflowRunDocument>("workflow_runs").updateOne(
      { _id: id },
      {
        $set: { ...doc, updatedAt: now },
        $setOnInsert: { createdAt: now },
      },
      { upsert: true },
    );

    // Fetch the actual document to get correct timestamps
    const savedDoc = await this.collection<WorkflowRunDocument>(
      "workflow_runs",
    ).findOne({
      _id: id,
    });

    return this.mapWorkflowRunDocument(savedDoc!);
  }

  async getWorkflowRun(runId: string): Promise<StorageWorkflowRun | null> {
    this.ensureInitialized();

    const doc = await this.collection<WorkflowRunDocument>(
      "workflow_runs",
    ).findOne({
      _id: runId,
    });

    return doc ? this.mapWorkflowRunDocument(doc) : null;
  }

  async listWorkflowRuns(
    options?: WorkflowRunQueryOptions,
  ): Promise<PaginatedResult<StorageWorkflowRun>> {
    this.ensureInitialized();

    const filter: Filter<WorkflowRunDocument> = {};
    if (options?.workflowId) {
      filter.workflowId = options.workflowId;
    }
    if (options?.status) {
      filter.status = options.status;
    }
    if (options?.resourceId) {
      filter.resourceId = options.resourceId;
    }
    if (options?.threadId) {
      filter.threadId = options.threadId;
    }

    const limit = options?.limit || 50;
    const offset = options?.offset || 0;

    const [docs, total] = await Promise.all([
      this.collection<WorkflowRunDocument>("workflow_runs")
        .find(filter)
        .sort({ createdAt: -1 })
        .skip(offset)
        .limit(limit)
        .toArray(),
      this.collection<WorkflowRunDocument>("workflow_runs").countDocuments(
        filter,
      ),
    ]);

    return {
      data: docs.map((doc) => this.mapWorkflowRunDocument(doc)),
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

    const updateDoc: UpdateFilter<WorkflowRunDocument> = {
      $set: {
        status,
        updatedAt: this.now(),
        ...(output !== undefined && { output }),
        ...(error && { error: error as JsonObject }),
      },
    };

    const result = await this.collection<WorkflowRunDocument>(
      "workflow_runs",
    ).findOneAndUpdate({ _id: runId }, updateDoc, { returnDocument: "after" });

    return result ? this.mapWorkflowRunDocument(result) : null;
  }

  async updateStepResult(
    runId: string,
    stepId: string,
    result: StepRunResult,
  ): Promise<boolean> {
    this.ensureInitialized();

    const updateResult = await this.collection<WorkflowRunDocument>(
      "workflow_runs",
    ).updateOne(
      { _id: runId },
      {
        $set: {
          [`stepResults.${stepId}`]: result,
          updatedAt: this.now(),
        },
      },
    );

    return updateResult.modifiedCount > 0;
  }

  async getWorkflowRunsByWorkflowId(
    workflowId: string,
    options?: StorageQueryOptions,
  ): Promise<PaginatedResult<StorageWorkflowRun>> {
    return this.listWorkflowRuns({ ...options, workflowId });
  }

  private mapWorkflowRunDocument(doc: WorkflowRunDocument): StorageWorkflowRun {
    return {
      id: doc._id,
      workflowId: doc.workflowId,
      status: doc.status as WorkflowRunStatus,
      triggerData: doc.triggerData,
      output: doc.output,
      error: doc.error as StorageWorkflowError | undefined,
      stepResults: doc.stepResults as Record<string, StepRunResult>,
      suspensionData:
        doc.suspensionData as StorageWorkflowRun["suspensionData"],
      resourceId: doc.resourceId,
      threadId: doc.threadId,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
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
    const id = `${namespace}:${key}`;
    const expiresAt = options?.ttl
      ? new Date(now.getTime() + options.ttl * 1000)
      : undefined;

    const doc: CustomRecordDocument = {
      _id: id,
      namespace,
      key,
      value,
      metadata: options?.metadata,
      ttl: options?.ttl,
      expiresAt,
      createdAt: now,
      updatedAt: now,
    };

    await this.collection<CustomRecordDocument>("custom_records").updateOne(
      { _id: id },
      {
        $set: { ...doc, updatedAt: now },
        $setOnInsert: { createdAt: now },
      },
      { upsert: true },
    );

    return this.mapCustomRecordDocument(doc);
  }

  async getRecord(
    namespace: string,
    key: string,
  ): Promise<StorageCustomRecord | null> {
    this.ensureInitialized();

    const id = `${namespace}:${key}`;
    const doc = await this.collection<CustomRecordDocument>(
      "custom_records",
    ).findOne({
      _id: id,
      $or: [
        { expiresAt: { $exists: false } },
        { expiresAt: { $gt: new Date() } },
      ],
    });

    return doc ? this.mapCustomRecordDocument(doc) : null;
  }

  async deleteRecord(namespace: string, key: string): Promise<boolean> {
    this.ensureInitialized();

    const id = `${namespace}:${key}`;
    const result = await this.collection<CustomRecordDocument>(
      "custom_records",
    ).deleteOne({
      _id: id,
    });

    return result.deletedCount > 0;
  }

  async listRecords(
    namespace: string,
    options?: StorageQueryOptions,
  ): Promise<PaginatedResult<StorageCustomRecord>> {
    this.ensureInitialized();

    const filter: Filter<CustomRecordDocument> = {
      namespace,
      $or: [
        { expiresAt: { $exists: false } },
        { expiresAt: { $gt: new Date() } },
      ],
    };

    const limit = options?.limit || 100;
    const offset = options?.offset || 0;

    const [docs, total] = await Promise.all([
      this.collection<CustomRecordDocument>("custom_records")
        .find(filter)
        .sort({ updatedAt: -1 })
        .skip(offset)
        .limit(limit)
        .toArray(),
      this.collection<CustomRecordDocument>("custom_records").countDocuments(
        filter,
      ),
    ]);

    return {
      data: docs.map((doc) => this.mapCustomRecordDocument(doc)),
      total,
      hasMore: offset + limit < total,
    };
  }

  async hasRecord(namespace: string, key: string): Promise<boolean> {
    this.ensureInitialized();

    const id = `${namespace}:${key}`;
    const count = await this.collection<CustomRecordDocument>(
      "custom_records",
    ).countDocuments({
      _id: id,
      $or: [
        { expiresAt: { $exists: false } },
        { expiresAt: { $gt: new Date() } },
      ],
    });

    return count > 0;
  }

  async deleteNamespace(namespace: string): Promise<number> {
    this.ensureInitialized();

    const result = await this.collection<CustomRecordDocument>(
      "custom_records",
    ).deleteMany({
      namespace,
    });

    return result.deletedCount;
  }

  private mapCustomRecordDocument(
    doc: CustomRecordDocument,
  ): StorageCustomRecord {
    return {
      namespace: doc.namespace,
      key: doc.key,
      value: doc.value,
      metadata: doc.metadata,
      ttl: doc.ttl,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
    };
  }

  // ============================================================================
  // Utility Methods
  // ============================================================================

  async getStats(): Promise<StorageStats> {
    this.ensureInitialized();

    const now = new Date();
    const [threadCount, messageCount, workflowRunCount, customRecordCount] =
      await Promise.all([
        this.collection<ThreadDocument>("threads").countDocuments(),
        this.collection<MessageDocument>("messages").countDocuments(),
        this.collection<WorkflowRunDocument>("workflow_runs").countDocuments(),
        this.collection<CustomRecordDocument>("custom_records").countDocuments({
          $or: [{ expiresAt: { $exists: false } }, { expiresAt: { $gt: now } }],
        }),
      ]);

    // Get database stats for storage size
    let storageSize: number | undefined;
    try {
      const stats = await this.db!.stats();
      storageSize = stats.dataSize;
    } catch {
      // Ignore if stats not available
    }

    return {
      threadCount,
      messageCount,
      workflowRunCount,
      customRecordCount,
      storageSize,
    };
  }

  async clearAll(): Promise<void> {
    this.ensureInitialized();

    await Promise.all([
      this.collection<ThreadDocument>("threads").deleteMany({}),
      this.collection<MessageDocument>("messages").deleteMany({}),
      this.collection<WorkflowRunDocument>("workflow_runs").deleteMany({}),
      this.collection<CustomRecordDocument>("custom_records").deleteMany({}),
    ]);

    this.log("warn", "All data cleared");
  }
}
