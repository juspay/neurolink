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
import type {
  StorageMongoThreadDocument,
  StorageMongoMessageDocument,
  StorageMongoWorkflowRunDocument,
  StorageMongoCustomRecordDocument,
} from "../../types/index.js";

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
    let mongodbModule;
    try {
      mongodbModule = await import("mongodb");
    } catch {
      throw new Error(
        `MongoDB driver not installed. Run: pnpm add mongodb\n` +
          `The 'mongodb' package is a peer dependency required for MongoDB storage.`,
      );
    }
    const { MongoClient } = mongodbModule;

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
    const threads = this.collection<StorageMongoThreadDocument>("threads");
    await threads.createIndexes([
      { key: { resourceId: 1 }, name: "idx_resourceId" },
      { key: { status: 1 }, name: "idx_status" },
      { key: { updatedAt: -1 }, name: "idx_updatedAt" },
    ]);

    // Message indexes
    const messages = this.collection<StorageMongoMessageDocument>("messages");
    await messages.createIndexes([
      { key: { threadId: 1 }, name: "idx_threadId" },
      { key: { threadId: 1, createdAt: 1 }, name: "idx_threadId_createdAt" },
    ]);

    // Workflow run indexes
    const workflowRuns =
      this.collection<StorageMongoWorkflowRunDocument>("workflow_runs");
    await workflowRuns.createIndexes([
      { key: { workflowId: 1 }, name: "idx_workflowId" },
      { key: { status: 1 }, name: "idx_status" },
      { key: { createdAt: -1 }, name: "idx_createdAt" },
    ]);

    // Custom record indexes (including TTL index)
    const customRecords =
      this.collection<StorageMongoCustomRecordDocument>("custom_records");
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
    const doc: StorageMongoThreadDocument = {
      _id: this.generateId(),
      resourceId: input.resourceId,
      title: input.title,
      metadata: input.metadata,
      status: input.status || "active",
      createdAt: now,
      updatedAt: now,
    };

    await this.collection<StorageMongoThreadDocument>("threads").insertOne(doc);
    return this.mapStorageMongoThreadDocument(doc);
  }

  async getThread(threadId: string): Promise<StorageThread | null> {
    this.ensureInitialized();

    const doc = await this.collection<StorageMongoThreadDocument>(
      "threads",
    ).findOne({
      _id: threadId,
    });

    return doc ? this.mapStorageMongoThreadDocument(doc) : null;
  }

  async updateThread(
    threadId: string,
    updates: UpdateThreadInput,
  ): Promise<StorageThread | null> {
    this.ensureInitialized();

    const updateDoc: UpdateFilter<StorageMongoThreadDocument> = {
      $set: {
        ...updates,
        updatedAt: this.now(),
      },
    };

    const result = await this.collection<StorageMongoThreadDocument>(
      "threads",
    ).findOneAndUpdate({ _id: threadId }, updateDoc, {
      returnDocument: "after",
    });

    return result ? this.mapStorageMongoThreadDocument(result) : null;
  }

  async deleteThread(threadId: string): Promise<boolean> {
    this.ensureInitialized();

    // Delete all messages first
    await this.deleteMessagesByThreadId(threadId);

    const result = await this.collection<StorageMongoThreadDocument>(
      "threads",
    ).deleteOne({
      _id: threadId,
    });

    return result.deletedCount > 0;
  }

  async listThreads(
    options?: ThreadQueryOptions,
  ): Promise<PaginatedResult<StorageThread>> {
    this.ensureInitialized();

    const filter: Filter<StorageMongoThreadDocument> = {};
    if (options?.resourceId) {
      filter.resourceId = options.resourceId;
    }
    if (options?.status) {
      filter.status = options.status;
    }

    const limit = options?.limit || 50;
    const offset = options?.offset || 0;

    const [docs, total] = await Promise.all([
      this.collection<StorageMongoThreadDocument>("threads")
        .find(filter)
        .sort({ updatedAt: -1 })
        .skip(offset)
        .limit(limit)
        .toArray(),
      this.collection<StorageMongoThreadDocument>("threads").countDocuments(
        filter,
      ),
    ]);

    return {
      data: docs.map((doc) => this.mapStorageMongoThreadDocument(doc)),
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

  private mapStorageMongoThreadDocument(
    doc: StorageMongoThreadDocument,
  ): StorageThread {
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
    const doc: StorageMongoMessageDocument = {
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

    await this.collection<StorageMongoMessageDocument>("messages").insertOne(
      doc,
    );
    return this.mapStorageMongoMessageDocument(doc);
  }

  async createMessages(
    inputs: CreateMessageInput[],
  ): Promise<StorageMessage[]> {
    this.ensureInitialized();
    if (inputs.length === 0) {
      return [];
    }

    const now = this.now();
    const docs: StorageMongoMessageDocument[] = inputs.map((input) => ({
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

    await this.collection<StorageMongoMessageDocument>("messages").insertMany(
      docs,
    );
    return docs.map((doc) => this.mapStorageMongoMessageDocument(doc));
  }

  async getMessage(messageId: string): Promise<StorageMessage | null> {
    this.ensureInitialized();

    const doc = await this.collection<StorageMongoMessageDocument>(
      "messages",
    ).findOne({
      _id: messageId,
    });

    return doc ? this.mapStorageMongoMessageDocument(doc) : null;
  }

  async updateMessage(
    messageId: string,
    updates: UpdateMessageInput,
  ): Promise<StorageMessage | null> {
    this.ensureInitialized();

    const updateDoc: UpdateFilter<StorageMongoMessageDocument> = {
      $set: {
        ...updates,
        updatedAt: this.now(),
      },
    };

    const result = await this.collection<StorageMongoMessageDocument>(
      "messages",
    ).findOneAndUpdate({ _id: messageId }, updateDoc, {
      returnDocument: "after",
    });

    return result ? this.mapStorageMongoMessageDocument(result) : null;
  }

  async deleteMessage(messageId: string): Promise<boolean> {
    this.ensureInitialized();

    const result = await this.collection<StorageMongoMessageDocument>(
      "messages",
    ).deleteOne({
      _id: messageId,
    });

    return result.deletedCount > 0;
  }

  async listMessages(
    options: MessageQueryOptions,
  ): Promise<PaginatedResult<StorageMessage>> {
    this.ensureInitialized();

    const filter: Filter<StorageMongoMessageDocument> = {
      threadId: options.threadId,
    };
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
      this.collection<StorageMongoMessageDocument>("messages")
        .find(filter)
        .sort({ createdAt: 1 })
        .skip(offset)
        .limit(limit)
        .toArray(),
      this.collection<StorageMongoMessageDocument>("messages").countDocuments(
        filter,
      ),
    ]);

    return {
      data: docs.map((doc) => this.mapStorageMongoMessageDocument(doc)),
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

    const result = await this.collection<StorageMongoMessageDocument>(
      "messages",
    ).deleteMany({
      threadId,
    });

    return result.deletedCount;
  }

  private mapStorageMongoMessageDocument(
    doc: StorageMongoMessageDocument,
  ): StorageMessage {
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

    const doc: StorageMongoWorkflowRunDocument = {
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

    await this.collection<StorageMongoWorkflowRunDocument>(
      "workflow_runs",
    ).updateOne(
      { _id: id },
      {
        $set: { ...doc, updatedAt: now },
        $setOnInsert: { createdAt: now },
      },
      { upsert: true },
    );

    // Fetch the actual document to get correct timestamps
    const savedDoc = await this.collection<StorageMongoWorkflowRunDocument>(
      "workflow_runs",
    ).findOne({
      _id: id,
    });

    return this.mapStorageMongoWorkflowRunDocument(savedDoc!);
  }

  async getWorkflowRun(runId: string): Promise<StorageWorkflowRun | null> {
    this.ensureInitialized();

    const doc = await this.collection<StorageMongoWorkflowRunDocument>(
      "workflow_runs",
    ).findOne({
      _id: runId,
    });

    return doc ? this.mapStorageMongoWorkflowRunDocument(doc) : null;
  }

  async listWorkflowRuns(
    options?: WorkflowRunQueryOptions,
  ): Promise<PaginatedResult<StorageWorkflowRun>> {
    this.ensureInitialized();

    const filter: Filter<StorageMongoWorkflowRunDocument> = {};
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
      this.collection<StorageMongoWorkflowRunDocument>("workflow_runs")
        .find(filter)
        .sort({ createdAt: -1 })
        .skip(offset)
        .limit(limit)
        .toArray(),
      this.collection<StorageMongoWorkflowRunDocument>(
        "workflow_runs",
      ).countDocuments(filter),
    ]);

    return {
      data: docs.map((doc) => this.mapStorageMongoWorkflowRunDocument(doc)),
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

    const updateDoc: UpdateFilter<StorageMongoWorkflowRunDocument> = {
      $set: {
        status,
        updatedAt: this.now(),
        ...(output !== undefined && { output }),
        ...(error && { error: error as JsonObject }),
      },
    };

    const result = await this.collection<StorageMongoWorkflowRunDocument>(
      "workflow_runs",
    ).findOneAndUpdate({ _id: runId }, updateDoc, { returnDocument: "after" });

    return result ? this.mapStorageMongoWorkflowRunDocument(result) : null;
  }

  async updateStepResult(
    runId: string,
    stepId: string,
    result: StepRunResult,
  ): Promise<boolean> {
    this.ensureInitialized();

    const updateResult = await this.collection<StorageMongoWorkflowRunDocument>(
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

  private mapStorageMongoWorkflowRunDocument(
    doc: StorageMongoWorkflowRunDocument,
  ): StorageWorkflowRun {
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

    const doc: StorageMongoCustomRecordDocument = {
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

    await this.collection<StorageMongoCustomRecordDocument>(
      "custom_records",
    ).updateOne(
      { _id: id },
      {
        $set: { ...doc, updatedAt: now },
        $setOnInsert: { createdAt: now },
      },
      { upsert: true },
    );

    return this.mapStorageMongoCustomRecordDocument(doc);
  }

  async getRecord(
    namespace: string,
    key: string,
  ): Promise<StorageCustomRecord | null> {
    this.ensureInitialized();

    const id = `${namespace}:${key}`;
    const doc = await this.collection<StorageMongoCustomRecordDocument>(
      "custom_records",
    ).findOne({
      _id: id,
      $or: [
        { expiresAt: { $exists: false } },
        { expiresAt: { $gt: new Date() } },
      ],
    });

    return doc ? this.mapStorageMongoCustomRecordDocument(doc) : null;
  }

  async deleteRecord(namespace: string, key: string): Promise<boolean> {
    this.ensureInitialized();

    const id = `${namespace}:${key}`;
    const result = await this.collection<StorageMongoCustomRecordDocument>(
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

    const filter: Filter<StorageMongoCustomRecordDocument> = {
      namespace,
      $or: [
        { expiresAt: { $exists: false } },
        { expiresAt: { $gt: new Date() } },
      ],
    };

    const limit = options?.limit || 100;
    const offset = options?.offset || 0;

    const [docs, total] = await Promise.all([
      this.collection<StorageMongoCustomRecordDocument>("custom_records")
        .find(filter)
        .sort({ updatedAt: -1 })
        .skip(offset)
        .limit(limit)
        .toArray(),
      this.collection<StorageMongoCustomRecordDocument>(
        "custom_records",
      ).countDocuments(filter),
    ]);

    return {
      data: docs.map((doc) => this.mapStorageMongoCustomRecordDocument(doc)),
      total,
      hasMore: offset + limit < total,
    };
  }

  async hasRecord(namespace: string, key: string): Promise<boolean> {
    this.ensureInitialized();

    const id = `${namespace}:${key}`;
    const count = await this.collection<StorageMongoCustomRecordDocument>(
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

    const result = await this.collection<StorageMongoCustomRecordDocument>(
      "custom_records",
    ).deleteMany({
      namespace,
    });

    return result.deletedCount;
  }

  private mapStorageMongoCustomRecordDocument(
    doc: StorageMongoCustomRecordDocument,
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
        this.collection<StorageMongoThreadDocument>("threads").countDocuments(),
        this.collection<StorageMongoMessageDocument>(
          "messages",
        ).countDocuments(),
        this.collection<StorageMongoWorkflowRunDocument>(
          "workflow_runs",
        ).countDocuments(),
        this.collection<StorageMongoCustomRecordDocument>(
          "custom_records",
        ).countDocuments({
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
      this.collection<StorageMongoThreadDocument>("threads").deleteMany({}),
      this.collection<StorageMongoMessageDocument>("messages").deleteMany({}),
      this.collection<StorageMongoWorkflowRunDocument>(
        "workflow_runs",
      ).deleteMany({}),
      this.collection<StorageMongoCustomRecordDocument>(
        "custom_records",
      ).deleteMany({}),
    ]);

    this.log("warn", "All data cleared");
  }
}
