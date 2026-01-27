/**
 * Pinecone Vector Store Implementation
 * Market leader in managed vector databases with excellent DX
 * @see https://docs.pinecone.io/
 */

import type { UnknownRecord } from "../../types/common.js";
import type { MetadataFilter } from "../../types/vectorFilterTypes.js";
import type {
  SimilarityMetric,
  VectorDeleteOptions,
  VectorDeleteResult,
  VectorIndexConfig,
  VectorQueryOptions,
  VectorQueryResult,
  VectorRecord,
  VectorStoreName,
  VectorStoreStats,
  VectorUpsertOptions,
} from "../../types/vectorTypes.js";
import { BaseVectorStore, type VectorStoreConfig } from "../baseVectorStore.js";
import { translateToPinecone } from "../filterTranslator.js";

// Constants for edge case handling
const MAX_BATCH_SIZE = 100; // Pinecone hard limit
const MAX_VECTOR_DIMENSION = 20000; // Pinecone maximum dimension
const MIN_VECTOR_DIMENSION = 1;
const MAX_METADATA_SIZE_BYTES = 40 * 1024; // Pinecone 40KB metadata limit per vector
const MAX_ID_LENGTH = 512; // Pinecone ID length limit
const MAX_TOPK = 10000; // Pinecone maximum topK
const DEFAULT_INDEX_READY_TIMEOUT_MS = 120000; // 2 minutes for index creation

// We'll use dynamic import for the Pinecone client to make it optional
type PineconeClient = {
  listIndexes: () => Promise<{ indexes?: Array<{ name: string }> }>;
  createIndex: (params: {
    name: string;
    dimension: number;
    metric: string;
    spec: Record<string, unknown>;
  }) => Promise<void>;
  deleteIndex: (name: string) => Promise<void>;
  Index: (name: string) => PineconeIndex;
};

type PineconeIndex = {
  namespace: (ns: string) => PineconeNamespace;
  upsert: (vectors: Array<PineconeVector>) => Promise<void>;
  query: (params: PineconeQueryParams) => Promise<PineconeQueryResponse>;
  deleteMany: (
    params: string[] | { filter: Record<string, unknown> },
  ) => Promise<void>;
  deleteAll: () => Promise<void>;
  describeIndexStats: () => Promise<PineconeIndexStats>;
};

type PineconeNamespace = {
  upsert: (vectors: Array<PineconeVector>) => Promise<void>;
  query: (params: PineconeQueryParams) => Promise<PineconeQueryResponse>;
  deleteMany: (
    params: string[] | { filter: Record<string, unknown> },
  ) => Promise<void>;
  deleteAll: () => Promise<void>;
};

type PineconeVector = {
  id: string;
  values: number[];
  metadata?: Record<string, unknown>;
};

type PineconeQueryParams = {
  vector: number[];
  topK: number;
  includeMetadata?: boolean;
  includeValues?: boolean;
  filter?: Record<string, unknown>;
};

type PineconeQueryResponse = {
  matches?: Array<{
    id: string;
    score?: number;
    values?: number[];
    metadata?: Record<string, unknown>;
  }>;
};

type PineconeIndexStats = {
  totalRecordCount?: number;
  dimension?: number;
  namespaces?: Record<string, { recordCount: number }>;
};

/**
 * Pinecone-specific configuration
 */
export type PineconeConfig = VectorStoreConfig & {
  /** Pinecone API key (required) */
  apiKey: string;
  /** Optional controller host URL for dedicated deployments */
  controllerHostUrl?: string;
  /** Serverless configuration for index creation */
  serverless?: {
    cloud: "aws" | "gcp" | "azure";
    region: string;
  };
};

/**
 * Pinecone Vector Store implementation
 */
export class PineconeStore extends BaseVectorStore<PineconeConfig> {
  private client: PineconeClient | null = null;
  private indexes: Map<string, PineconeIndex> = new Map();
  private indexDimensions: Map<string, number> = new Map();

  constructor(config: PineconeConfig) {
    super(config, "pinecone" as VectorStoreName);
  }

  /**
   * Validate index name for Pinecone constraints
   */
  private validateIndexName(name: string): void {
    if (!name || name.trim().length === 0) {
      throw new Error("Index name cannot be empty");
    }
    // Pinecone index names must be lowercase alphanumeric with hyphens
    if (!/^[a-z0-9-]+$/.test(name)) {
      throw new Error(
        `Invalid index name "${name}". Pinecone index names must be lowercase alphanumeric with hyphens only.`,
      );
    }
    if (name.length > 45) {
      throw new Error(
        `Index name "${name}" exceeds Pinecone's 45 character limit.`,
      );
    }
  }

  /**
   * Validate vector dimension
   */
  private validateVectorDimension(dimension: number, context: string): void {
    if (!Number.isInteger(dimension)) {
      throw new Error(
        `${context}: dimension must be an integer, got ${dimension}`,
      );
    }
    if (dimension < MIN_VECTOR_DIMENSION) {
      throw new Error(
        `${context}: dimension must be at least ${MIN_VECTOR_DIMENSION}, got ${dimension}`,
      );
    }
    if (dimension > MAX_VECTOR_DIMENSION) {
      throw new Error(
        `${context}: dimension exceeds Pinecone maximum of ${MAX_VECTOR_DIMENSION}, got ${dimension}`,
      );
    }
  }

  /**
   * Validate a single vector
   */
  private validateVector(
    vector: number[],
    expectedDimension?: number,
    context: string = "Vector",
  ): void {
    if (!Array.isArray(vector)) {
      throw new Error(`${context}: must be an array`);
    }
    if (vector.length === 0) {
      throw new Error(`${context}: cannot be empty`);
    }
    this.validateVectorDimension(vector.length, context);

    // Check for invalid values
    for (let i = 0; i < vector.length; i++) {
      if (typeof vector[i] !== "number" || !Number.isFinite(vector[i])) {
        throw new Error(
          `${context}: contains invalid value at index ${i}: ${vector[i]}`,
        );
      }
    }

    if (
      expectedDimension !== undefined &&
      vector.length !== expectedDimension
    ) {
      throw new Error(
        `${context}: dimension mismatch - expected ${expectedDimension}, got ${vector.length}`,
      );
    }
  }

  /**
   * Validate record ID
   */
  private validateRecordId(id: string, context: string = "Record"): void {
    if (!id || id.trim().length === 0) {
      throw new Error(`${context}: ID cannot be empty`);
    }
    if (id.length > MAX_ID_LENGTH) {
      throw new Error(
        `${context}: ID exceeds Pinecone's ${MAX_ID_LENGTH} character limit`,
      );
    }
  }

  /**
   * Validate metadata size
   */
  private validateMetadataSize(metadata: unknown, id: string): void {
    if (!metadata) {return;}
    const size = JSON.stringify(metadata).length;
    if (size > MAX_METADATA_SIZE_BYTES) {
      throw new Error(
        `Metadata for record "${id}" exceeds Pinecone's ${MAX_METADATA_SIZE_BYTES} byte limit (got ${size} bytes)`,
      );
    }
  }

  /**
   * Get the expected dimension for an index (cached)
   */
  private async getIndexDimension(
    indexName: string,
  ): Promise<number | undefined> {
    const cached = this.indexDimensions.get(indexName);
    if (cached !== undefined) {
      return cached;
    }

    try {
      const index = this.getIndex(indexName);
      const stats = await index.describeIndexStats();
      if (stats.dimension) {
        this.indexDimensions.set(indexName, stats.dimension);
        return stats.dimension;
      }
    } catch {
      // Index might not exist yet
    }
    return undefined;
  }

  /**
   * Execute an operation with exponential backoff retry for rate limits
   */
  private async withRetry<T>(
    operation: () => Promise<T>,
    maxRetries: number = 3,
    baseDelay: number = 1000,
  ): Promise<T> {
    let lastError: Error | undefined;
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error as Error;
        if (this.isRateLimitError(error)) {
          const delay = baseDelay * 2 ** attempt;
          this.logDebug(
            `Rate limited, retrying in ${delay}ms (attempt ${attempt + 1}/${maxRetries})`,
          );
          await new Promise((resolve) => setTimeout(resolve, delay));
        } else {
          throw error;
        }
      }
    }
    throw lastError;
  }

  /**
   * Check if an error is a rate limit error
   */
  private isRateLimitError(error: unknown): boolean {
    const message = (error as Error)?.message?.toLowerCase() || "";
    const statusCode = (error as { status?: number })?.status;
    return (
      message.includes("rate limit") ||
      message.includes("429") ||
      message.includes("too many requests") ||
      statusCode === 429
    );
  }

  /**
   * Initialize connection to Pinecone
   */
  async connect(): Promise<void> {
    if (this.initialized) {
      return;
    }

    // Validate configuration
    if (!this.config.apiKey || this.config.apiKey.trim().length === 0) {
      throw new Error("Pinecone: API key is required");
    }

    try {
      // Dynamically import Pinecone client
      const { Pinecone } = await import("@pinecone-database/pinecone");

      this.client = new Pinecone({
        apiKey: this.config.apiKey,
      }) as unknown as PineconeClient;

      // Verify connection by listing indexes
      await this.client.listIndexes();

      this.initialized = true;
      this.logInfo("Connected successfully");
    } catch (error) {
      this.logError("Failed to connect", error);

      const errorMessage =
        error instanceof Error ? error.message : String(error);

      // Provide helpful error messages
      if (
        errorMessage.includes("401") ||
        errorMessage.includes("Unauthorized")
      ) {
        throw new Error(
          "Pinecone: Invalid API key. Verify your API key is correct.",
        );
      }
      if (
        errorMessage.includes("timeout") ||
        errorMessage.includes("ETIMEDOUT")
      ) {
        throw new Error(
          "Pinecone: Connection timed out. Check your network connectivity.",
        );
      }
      if (errorMessage.includes("ENOTFOUND")) {
        throw new Error(
          "Pinecone: Could not resolve Pinecone API endpoint. Check your network connectivity.",
        );
      }

      throw new Error(`Pinecone: Failed to connect - ${errorMessage}`);
    }
  }

  /**
   * Disconnect from Pinecone
   */
  async disconnect(): Promise<void> {
    this.indexes.clear();
    this.client = null;
    this.initialized = false;
    this.logInfo("Disconnected");
  }

  /**
   * Create a new index
   */
  async createIndex(config: VectorIndexConfig): Promise<void> {
    this.ensureInitialized();

    // Validate inputs
    this.validateIndexName(config.name);
    this.validateVectorDimension(config.dimension, "createIndex");

    const metric = this.mapMetric(config.metric || "cosine");
    const serverlessConfig = this.config.serverless || {
      cloud: "aws" as const,
      region: "us-east-1",
    };

    try {
      await this.client!.createIndex({
        name: config.name,
        dimension: config.dimension,
        metric,
        spec: {
          serverless: serverlessConfig,
          ...(config.config || {}),
        },
      });

      // Cache the dimension
      this.indexDimensions.set(config.name, config.dimension);

      this.logInfo(`Index created: ${config.name}`, {
        dimension: config.dimension,
        metric,
      });

      // Wait for index to be ready
      await this.waitForIndexReady(config.name);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);

      if (errorMessage.includes("already exists")) {
        throw new Error(
          `Pinecone: Index "${config.name}" already exists. Delete it first or use a different name.`,
        );
      }
      if (errorMessage.includes("quota") || errorMessage.includes("limit")) {
        throw new Error(
          `Pinecone: Index creation quota exceeded. Check your Pinecone plan limits.`,
        );
      }
      throw new Error(`Pinecone: Failed to create index - ${errorMessage}`);
    }
  }

  /**
   * Delete an index
   */
  async deleteIndex(indexName: string): Promise<void> {
    this.ensureInitialized();

    if (!indexName || indexName.trim().length === 0) {
      throw new Error("Index name cannot be empty");
    }

    try {
      await this.client!.deleteIndex(indexName);
      this.indexes.delete(indexName);
      this.indexDimensions.delete(indexName);
      this.logInfo(`Index deleted: ${indexName}`);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);

      if (errorMessage.includes("not found") || errorMessage.includes("404")) {
        throw new Error(`Pinecone: Index "${indexName}" does not exist.`);
      }
      throw new Error(`Pinecone: Failed to delete index - ${errorMessage}`);
    }
  }

  /**
   * List all indexes
   */
  async listIndexes(): Promise<string[]> {
    this.ensureInitialized();

    const response = await this.client!.listIndexes();
    return response.indexes?.map((i) => i.name) || [];
  }

  /**
   * Check if an index exists
   */
  async indexExists(indexName: string): Promise<boolean> {
    const indexes = await this.listIndexes();
    return indexes.includes(indexName);
  }

  /**
   * Upsert vectors
   */
  async upsert<TMetadata extends UnknownRecord = UnknownRecord>(
    indexName: string,
    records: VectorRecord<TMetadata>[],
    options?: VectorUpsertOptions,
  ): Promise<{ upsertedCount: number }> {
    this.ensureInitialized();

    // Handle empty records array
    if (!records || records.length === 0) {
      this.logDebug("Upsert called with empty records array, skipping");
      return { upsertedCount: 0 };
    }

    const index = this.getIndex(indexName);
    const namespace = options?.namespace;

    // Validate and enforce batch size limits
    const requestedBatchSize = options?.batchSize || MAX_BATCH_SIZE;
    const batchSize = Math.min(requestedBatchSize, MAX_BATCH_SIZE);
    if (requestedBatchSize > MAX_BATCH_SIZE) {
      this.logDebug(
        `Batch size ${requestedBatchSize} exceeds Pinecone limit of ${MAX_BATCH_SIZE}, using ${batchSize}`,
      );
    }

    // Get expected dimension for validation
    const expectedDimension = await this.getIndexDimension(indexName);

    // Validate all records upfront
    const firstVectorDim = records[0].vector.length;
    for (let i = 0; i < records.length; i++) {
      const record = records[i];

      // Validate ID
      this.validateRecordId(record.id, `Record at index ${i}`);

      // Validate vector
      this.validateVector(
        record.vector,
        expectedDimension || firstVectorDim,
        `Record "${record.id}"`,
      );

      // Validate metadata size
      this.validateMetadataSize(record.metadata, record.id);
    }

    const vectors: PineconeVector[] = records.map((record) => ({
      id: record.id,
      values: record.vector,
      metadata: record.metadata as Record<string, unknown>,
    }));

    const target = namespace ? index.namespace(namespace) : index;

    // Batch upsert in chunks of batchSize (Pinecone limit is 100)
    let totalUpserted = 0;
    for (let i = 0; i < vectors.length; i += batchSize) {
      const batch = vectors.slice(i, i + batchSize);
      try {
        await this.withRetry(() => target.upsert(batch));
        totalUpserted += batch.length;
        this.logDebug(`Upserted batch: ${totalUpserted}/${vectors.length}`);
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : String(error);

        if (errorMessage.includes("dimension")) {
          throw new Error(
            `Pinecone: Vector dimension mismatch. Index "${indexName}" expects ${expectedDimension || "a specific"} dimension.`,
          );
        }
        if (
          errorMessage.includes("not found") ||
          errorMessage.includes("404")
        ) {
          throw new Error(
            `Pinecone: Index "${indexName}" does not exist. Create it first with createIndex().`,
          );
        }
        throw new Error(
          `Pinecone: Failed to upsert batch starting at index ${i} - ${errorMessage}`,
        );
      }
    }

    return { upsertedCount: totalUpserted };
  }

  /**
   * Query vectors
   */
  async query<TMetadata extends UnknownRecord = UnknownRecord>(
    indexName: string,
    options: VectorQueryOptions<TMetadata>,
  ): Promise<VectorQueryResult<TMetadata>[]> {
    this.ensureInitialized();

    // Validate query vector
    if (!options.vector || options.vector.length === 0) {
      throw new Error("Query vector cannot be empty");
    }

    // Validate topK
    if (!options.topK || options.topK < 1) {
      throw new Error("topK must be a positive integer");
    }
    if (!Number.isInteger(options.topK)) {
      throw new Error("topK must be an integer");
    }
    if (options.topK > MAX_TOPK) {
      throw new Error(
        `topK exceeds Pinecone maximum of ${MAX_TOPK}, got ${options.topK}`,
      );
    }

    // Get expected dimension and validate
    const expectedDimension = await this.getIndexDimension(indexName);
    this.validateVector(options.vector, expectedDimension, "Query vector");

    const index = this.getIndex(indexName);
    const target = options.namespace
      ? index.namespace(options.namespace)
      : index;

    const queryParams: PineconeQueryParams = {
      vector: options.vector,
      topK: options.topK,
      includeMetadata: options.includeMetadata ?? true,
      includeValues: options.includeVectors ?? false,
    };

    if (options.filter) {
      queryParams.filter = translateToPinecone(options.filter);
    }

    try {
      const response = await this.withRetry(() => target.query(queryParams));

      return (response.matches || [])
        .filter(
          (match) =>
            !options.minScore || (match.score ?? 0) >= options.minScore,
        )
        .map((match) => ({
          id: match.id,
          score: match.score ?? 0,
          vector: match.values,
          metadata: match.metadata as TMetadata,
        }));
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);

      if (errorMessage.includes("dimension")) {
        throw new Error(
          `Pinecone: Query vector dimension mismatch. Index "${indexName}" expects ${expectedDimension || "a different"} dimension.`,
        );
      }
      if (errorMessage.includes("not found") || errorMessage.includes("404")) {
        throw new Error(
          `Pinecone: Index "${indexName}" does not exist. Create it first with createIndex().`,
        );
      }
      throw new Error(`Pinecone: Query failed - ${errorMessage}`);
    }
  }

  /**
   * Delete vectors
   */
  async delete(
    indexName: string,
    options: VectorDeleteOptions,
  ): Promise<VectorDeleteResult> {
    this.ensureInitialized();

    if (!indexName || indexName.trim().length === 0) {
      throw new Error("Index name cannot be empty");
    }

    const index = this.getIndex(indexName);
    const target = options.namespace
      ? index.namespace(options.namespace)
      : index;

    try {
      if (options.deleteAll) {
        await this.withRetry(() => target.deleteAll());
        return { deletedCount: undefined, acknowledged: true }; // Pinecone doesn't return count
      }

      if (options.ids && options.ids.length > 0) {
        // Validate IDs
        for (const id of options.ids) {
          if (!id || (typeof id === "string" && id.trim().length === 0)) {
            throw new Error("Delete IDs cannot contain empty values");
          }
        }

        await this.withRetry(() => target.deleteMany(options.ids!));
        return { deletedCount: options.ids.length, acknowledged: true };
      }

      if (options.filter) {
        await this.withRetry(() =>
          target.deleteMany({
            filter: translateToPinecone(options.filter!),
          }),
        );
        return { deletedCount: undefined, acknowledged: true }; // Pinecone doesn't return count for filter deletes
      }

      return { deletedCount: 0, acknowledged: true };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);

      if (errorMessage.includes("not found") || errorMessage.includes("404")) {
        throw new Error(`Pinecone: Index "${indexName}" does not exist.`);
      }
      throw new Error(`Pinecone: Delete failed - ${errorMessage}`);
    }
  }

  /**
   * Update an individual vector's embedding and/or metadata
   */
  async updateVector<TMetadata extends UnknownRecord = UnknownRecord>(
    indexName: string,
    id: string,
    update: { vector?: number[]; metadata?: TMetadata },
  ): Promise<void> {
    this.ensureInitialized();

    // Validate ID
    if (!id || id.trim().length === 0) {
      throw new Error("Vector ID cannot be empty");
    }

    if (!update.vector && !update.metadata) {
      this.logDebug("updateVector called with no updates, skipping");
      return; // Nothing to update
    }

    // Validate vector if provided
    if (update.vector) {
      const expectedDimension = await this.getIndexDimension(indexName);
      this.validateVector(
        update.vector,
        expectedDimension,
        `Update vector for "${id}"`,
      );
    }

    // Validate metadata if provided
    if (update.metadata) {
      this.validateMetadataSize(update.metadata, id);
    }

    const index = this.getIndex(indexName);

    // Pinecone uses upsert for updates - we need to provide the full vector
    const upsertData: PineconeVector = { id, values: update.vector || [] };

    if (update.metadata) {
      upsertData.metadata = update.metadata as Record<string, unknown>;
    }

    // If only metadata is provided, we need to fetch the existing vector first
    if (!update.vector) {
      // Get expected dimension for the dummy vector
      const dimension = await this.getIndexDimension(indexName);
      if (!dimension) {
        throw new Error(
          `Pinecone: Cannot determine dimension for index "${indexName}". Ensure the index exists and has data.`,
        );
      }

      // Query for the existing vector
      const queryResult = await this.withRetry(() =>
        index.query({
          vector: new Array(dimension).fill(0), // Dummy vector for ID lookup
          topK: 1,
          includeValues: true,
          filter: { id: { $eq: id } },
        }),
      );

      if (queryResult.matches && queryResult.matches.length > 0) {
        upsertData.values = queryResult.matches[0].values || [];
      } else {
        throw new Error(
          `Vector with id '${id}' not found in index '${indexName}'`,
        );
      }
    }

    try {
      await this.withRetry(() => index.upsert([upsertData]));
      this.logDebug(`Updated vector: ${id}`);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);

      if (errorMessage.includes("not found")) {
        throw error; // Re-throw our own error
      }
      throw new Error(
        `Pinecone: Failed to update vector "${id}" - ${errorMessage}`,
      );
    }
  }

  /**
   * Get index statistics
   */
  async getStats(indexName: string): Promise<VectorStoreStats> {
    this.ensureInitialized();

    const index = this.getIndex(indexName);
    const stats = await index.describeIndexStats();

    return {
      vectorCount: stats.totalRecordCount || 0,
      dimension: stats.dimension,
      namespaceCount: stats.namespaces
        ? Object.keys(stats.namespaces).length
        : 0,
      metrics: stats as UnknownRecord,
    };
  }

  /**
   * Translate filter to Pinecone format
   */
  protected translateFilter<TMetadata extends UnknownRecord>(
    filter: MetadataFilter<TMetadata>,
  ): unknown {
    return translateToPinecone(filter);
  }

  /**
   * Get or create index reference
   */
  private getIndex(indexName: string): PineconeIndex {
    if (!this.indexes.has(indexName)) {
      this.indexes.set(indexName, this.client!.Index(indexName));
    }
    return this.indexes.get(indexName)!;
  }

  /**
   * Map similarity metric to Pinecone format
   */
  private mapMetric(metric: SimilarityMetric): string {
    switch (metric) {
      case "cosine":
        return "cosine";
      case "euclidean":
        return "euclidean";
      case "dotProduct":
        return "dotproduct";
      default:
        return "cosine";
    }
  }

  /**
   * Wait for index to be ready
   */
  private async waitForIndexReady(
    indexName: string,
    maxWaitMs: number = DEFAULT_INDEX_READY_TIMEOUT_MS,
  ): Promise<void> {
    const startTime = Date.now();
    const pollInterval = 2000;

    while (Date.now() - startTime < maxWaitMs) {
      try {
        const indexes = await this.listIndexes();
        if (indexes.includes(indexName)) {
          this.logDebug(`Index ${indexName} is ready`);
          return;
        }
      } catch {
        // Index not ready yet
      }
      await new Promise((resolve) => setTimeout(resolve, pollInterval));
    }

    throw new Error(
      `Pinecone: Index "${indexName}" did not become ready within ${maxWaitMs}ms. This can happen with large indexes or during high load. Try again later or check the Pinecone console.`,
    );
  }
}
