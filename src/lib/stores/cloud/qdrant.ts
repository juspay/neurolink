/**
 * Qdrant Vector Store Implementation
 * High-performance open-source vector database with Rust-based SIMD optimizations
 * @see https://qdrant.tech/documentation/
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
import { translateToQdrant } from "../filterTranslator.js";

// Constants for edge case handling
const MAX_BATCH_SIZE = 1000; // Qdrant recommended batch size
const MAX_VECTOR_DIMENSION = 65535; // Qdrant maximum dimension
const MIN_VECTOR_DIMENSION = 1;
const MAX_PAYLOAD_SIZE_BYTES = 1024 * 1024; // Qdrant 1MB payload limit per point
const MAX_COLLECTION_NAME_LENGTH = 255;
const DEFAULT_COLLECTION_READY_TIMEOUT_MS = 30000;

// Types for Qdrant client (using dynamic import)
type QdrantClient = {
  getCollections: () => Promise<{ collections: Array<{ name: string }> }>;
  createCollection: (
    name: string,
    params: {
      vectors: { size: number; distance: string };
      quantization_config?: Record<string, unknown>;
      optimizers_config?: Record<string, unknown>;
    },
  ) => Promise<void>;
  deleteCollection: (name: string) => Promise<void>;
  getCollection: (name: string) => Promise<QdrantCollectionInfo>;
  upsert: (
    collectionName: string,
    params: {
      wait: boolean;
      points: Array<QdrantPoint>;
    },
  ) => Promise<void>;
  search: (
    collectionName: string,
    params: QdrantSearchParams,
  ) => Promise<Array<QdrantSearchResult>>;
  delete: (
    collectionName: string,
    params: {
      wait: boolean;
      points?: (string | number)[];
      filter?: Record<string, unknown>;
    },
  ) => Promise<void>;
  setPayload: (
    collectionName: string,
    params: {
      wait: boolean;
      points: (string | number)[];
      payload: Record<string, unknown>;
    },
  ) => Promise<void>;
  retrieve: (
    collectionName: string,
    params: {
      ids: (string | number)[];
      with_vector?: boolean;
      with_payload?: boolean;
    },
  ) => Promise<Array<QdrantSearchResult>>;
};

type QdrantPoint = {
  id: string | number;
  vector: number[];
  payload?: Record<string, unknown>;
};

type QdrantSearchParams = {
  vector: number[];
  limit: number;
  with_payload?: boolean;
  with_vector?: boolean;
  filter?: Record<string, unknown>;
  score_threshold?: number;
};

type QdrantSearchResult = {
  id: string | number;
  score: number;
  vector?: number[];
  payload?: Record<string, unknown>;
};

type QdrantCollectionInfo = {
  points_count?: number;
  status?: "green" | "yellow" | "red";
  optimizer_status?: "ok" | "indexing";
  config: {
    params: {
      vectors?: { size?: number };
    };
  };
};

/**
 * Qdrant-specific configuration
 */
export type QdrantConfig = VectorStoreConfig & {
  /** Qdrant URL (required) */
  url: string;
  /** API key for Qdrant Cloud (optional for self-hosted) */
  apiKey?: string;
  /** Use HTTPS (default: auto-detected from URL) */
  https?: boolean;
  /** gRPC port for faster operations (optional) */
  grpcPort?: number;
  /** Prefer gRPC over REST (optional) */
  preferGrpc?: boolean;
};

/**
 * Qdrant Vector Store implementation
 */
export class QdrantStore extends BaseVectorStore<QdrantConfig> {
  private client: QdrantClient | null = null;
  private collectionDimensions: Map<string, number> = new Map();

  constructor(config: QdrantConfig) {
    super(config, "qdrant" as VectorStoreName);
  }

  /**
   * Validate collection name for Qdrant constraints
   */
  private validateCollectionName(name: string): void {
    if (!name || name.trim().length === 0) {
      throw new Error("Collection name cannot be empty");
    }
    if (name.length > MAX_COLLECTION_NAME_LENGTH) {
      throw new Error(
        `Collection name exceeds maximum length of ${MAX_COLLECTION_NAME_LENGTH} characters`,
      );
    }
    // Qdrant collection names should not start with underscore (reserved)
    if (name.startsWith("_")) {
      throw new Error(
        `Collection name cannot start with underscore (reserved for internal use)`,
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
        `${context}: dimension exceeds Qdrant maximum of ${MAX_VECTOR_DIMENSION}, got ${dimension}`,
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
   * Validate payload (metadata) size
   */
  private validatePayloadSize(payload: unknown, id: string | number): void {
    if (!payload) {return;}
    const size = JSON.stringify(payload).length;
    if (size > MAX_PAYLOAD_SIZE_BYTES) {
      throw new Error(
        `Payload for point "${id}" exceeds Qdrant's ${MAX_PAYLOAD_SIZE_BYTES} byte limit (got ${size} bytes)`,
      );
    }
  }

  /**
   * Get the expected dimension for a collection (cached)
   */
  private async getCollectionDimension(
    collectionName: string,
  ): Promise<number | undefined> {
    const cached = this.collectionDimensions.get(collectionName);
    if (cached !== undefined) {
      return cached;
    }

    try {
      const info = await this.client!.getCollection(collectionName);
      const dimension = info.config.params.vectors?.size;
      if (dimension) {
        this.collectionDimensions.set(collectionName, dimension);
        return dimension;
      }
    } catch {
      // Collection might not exist yet
    }
    return undefined;
  }

  /**
   * Initialize connection to Qdrant
   */
  async connect(): Promise<void> {
    if (this.initialized) {
      return;
    }

    // Validate configuration
    if (!this.config.url || this.config.url.trim().length === 0) {
      throw new Error("Qdrant: URL is required");
    }

    // Validate URL format
    try {
      new URL(this.config.url);
    } catch {
      throw new Error(
        `Qdrant: Invalid URL format "${this.config.url}". Expected format: http(s)://host:port`,
      );
    }

    try {
      // Dynamically import Qdrant client
      const { QdrantClient: QdrantClientClass } = await import(
        "@qdrant/js-client-rest"
      );

      this.client = new QdrantClientClass({
        url: this.config.url,
        apiKey: this.config.apiKey,
      }) as unknown as QdrantClient;

      // Test connection
      await this.client.getCollections();

      this.initialized = true;
      this.logInfo("Connected successfully");
    } catch (error) {
      this.logError("Failed to connect", error);

      const errorMessage =
        error instanceof Error ? error.message : String(error);

      // Provide helpful error messages
      if (errorMessage.includes("ECONNREFUSED")) {
        throw new Error(
          `Qdrant: Connection refused. Ensure Qdrant is running at ${this.config.url}`,
        );
      }
      if (
        errorMessage.includes("timeout") ||
        errorMessage.includes("ETIMEDOUT")
      ) {
        throw new Error(
          "Qdrant: Connection timed out. Check your network connectivity and firewall settings.",
        );
      }
      if (errorMessage.includes("ENOTFOUND")) {
        throw new Error(
          `Qdrant: Could not resolve host. Check that the URL "${this.config.url}" is correct.`,
        );
      }
      if (
        errorMessage.includes("401") ||
        errorMessage.includes("Unauthorized")
      ) {
        throw new Error(
          "Qdrant: Authentication failed. Verify your API key is correct.",
        );
      }
      if (errorMessage.includes("certificate")) {
        throw new Error(
          "Qdrant: SSL certificate error. For self-signed certificates, you may need to configure the client appropriately.",
        );
      }

      throw new Error(`Qdrant: Failed to connect - ${errorMessage}`);
    }
  }

  /**
   * Disconnect from Qdrant
   */
  async disconnect(): Promise<void> {
    this.client = null;
    this.initialized = false;
    this.logInfo("Disconnected");
  }

  /**
   * Create a new collection
   */
  async createIndex(config: VectorIndexConfig): Promise<void> {
    this.ensureInitialized();

    // Validate inputs
    this.validateCollectionName(config.name);
    this.validateVectorDimension(config.dimension, "createIndex");

    const distance = this.mapMetric(config.metric || "cosine");

    try {
      await this.client!.createCollection(config.name, {
        vectors: {
          size: config.dimension,
          distance,
        },
        // Optional: Enable scalar quantization for memory efficiency
        quantization_config: {
          scalar: {
            type: "int8",
            quantile: 0.99,
            always_ram: true,
          },
        },
        // Optimizers for better performance
        optimizers_config: {
          indexing_threshold: 20000,
        },
        ...(config.config || {}),
      });

      // Cache the dimension
      this.collectionDimensions.set(config.name, config.dimension);

      this.logInfo(`Collection created: ${config.name}`, {
        dimension: config.dimension,
        distance,
      });

      // Wait for collection to be ready (optimization complete)
      await this.waitForCollectionReady(config.name);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);

      if (errorMessage.includes("already exists")) {
        throw new Error(
          `Qdrant: Collection "${config.name}" already exists. Delete it first or use a different name.`,
        );
      }
      throw new Error(`Qdrant: Failed to create collection - ${errorMessage}`);
    }
  }

  /**
   * Wait for collection to be ready after creation
   * Polls collection status until optimization is complete
   */
  private async waitForCollectionReady(
    collectionName: string,
    maxWaitMs: number = DEFAULT_COLLECTION_READY_TIMEOUT_MS,
  ): Promise<void> {
    const startTime = Date.now();
    const pollInterval = 500;

    while (Date.now() - startTime < maxWaitMs) {
      try {
        const info = await this.client!.getCollection(collectionName);

        // Check if collection is ready (status green and optimizer done)
        if (info.status === "green" && info.optimizer_status !== "indexing") {
          this.logDebug(`Collection ${collectionName} is ready`);
          return;
        }

        this.logDebug(
          `Waiting for collection ${collectionName} to be ready (status: ${info.status}, optimizer: ${info.optimizer_status})`,
        );
      } catch {
        // Collection might not be accessible yet
      }

      await new Promise((resolve) => setTimeout(resolve, pollInterval));
    }

    // Don't throw, just log a warning - collection may still work
    this.logInfo(
      `Collection ${collectionName} readiness check timed out after ${maxWaitMs}ms, proceeding anyway`,
    );
  }

  /**
   * Delete a collection
   */
  async deleteIndex(indexName: string): Promise<void> {
    this.ensureInitialized();

    if (!indexName || indexName.trim().length === 0) {
      throw new Error("Collection name cannot be empty");
    }

    try {
      await this.client!.deleteCollection(indexName);
      this.collectionDimensions.delete(indexName);
      this.logInfo(`Collection deleted: ${indexName}`);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);

      if (
        errorMessage.includes("not found") ||
        errorMessage.includes("doesn't exist")
      ) {
        throw new Error(`Qdrant: Collection "${indexName}" does not exist.`);
      }
      throw new Error(`Qdrant: Failed to delete collection - ${errorMessage}`);
    }
  }

  /**
   * List all collections
   */
  async listIndexes(): Promise<string[]> {
    this.ensureInitialized();

    const response = await this.client!.getCollections();
    return response.collections.map((c) => c.name);
  }

  /**
   * Check if a collection exists
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

    // Validate and enforce batch size limits
    const requestedBatchSize = options?.batchSize || 500;
    const batchSize = Math.min(requestedBatchSize, MAX_BATCH_SIZE);
    if (requestedBatchSize > MAX_BATCH_SIZE) {
      this.logDebug(
        `Batch size ${requestedBatchSize} exceeds recommended limit of ${MAX_BATCH_SIZE}, using ${batchSize}`,
      );
    }

    // Get expected dimension for validation
    const expectedDimension = await this.getCollectionDimension(indexName);

    // Validate all records upfront
    const firstVectorDim = records[0].vector.length;
    for (let i = 0; i < records.length; i++) {
      const record = records[i];

      // Validate ID (Qdrant accepts string or number)
      if (record.id === undefined || record.id === null || record.id === "") {
        throw new Error(`Record at index ${i} has empty or missing ID`);
      }

      // Validate vector
      this.validateVector(
        record.vector,
        expectedDimension || firstVectorDim,
        `Record "${record.id}"`,
      );

      // Validate payload size
      const payload = {
        ...record.metadata,
        _content: record.content,
      };
      this.validatePayloadSize(payload, record.id);
    }

    // Convert records to Qdrant format
    const points: QdrantPoint[] = records.map((record) => ({
      id: record.id,
      vector: record.vector,
      payload: {
        ...record.metadata,
        _content: record.content,
      } as Record<string, unknown>,
    }));

    let totalUpserted = 0;

    // Batch upsert
    for (let i = 0; i < points.length; i += batchSize) {
      const batch = points.slice(i, i + batchSize);
      try {
        await this.client!.upsert(indexName, {
          wait: true,
          points: batch,
        });
        totalUpserted += batch.length;
        this.logDebug(`Upserted batch: ${totalUpserted}/${points.length}`);
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : String(error);

        if (
          errorMessage.includes("dimension") ||
          errorMessage.includes("size")
        ) {
          throw new Error(
            `Qdrant: Vector dimension mismatch. Collection "${indexName}" expects ${expectedDimension || "a specific"} dimension.`,
          );
        }
        if (
          errorMessage.includes("not found") ||
          errorMessage.includes("doesn't exist")
        ) {
          throw new Error(
            `Qdrant: Collection "${indexName}" does not exist. Create it first with createIndex().`,
          );
        }
        throw new Error(
          `Qdrant: Failed to upsert batch starting at index ${i} - ${errorMessage}`,
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

    // Get expected dimension and validate
    const expectedDimension = await this.getCollectionDimension(indexName);
    this.validateVector(options.vector, expectedDimension, "Query vector");

    const searchParams: QdrantSearchParams = {
      vector: options.vector,
      limit: options.topK,
      with_payload: options.includeMetadata ?? true,
      with_vector: options.includeVectors ?? false,
    };

    if (options.filter) {
      searchParams.filter = translateToQdrant(options.filter) as Record<
        string,
        unknown
      >;
    }

    if (options.minScore) {
      searchParams.score_threshold = options.minScore;
    }

    try {
      const response = await this.client!.search(indexName, searchParams);

      return response.map((result) => ({
        id: String(result.id),
        score: result.score,
        vector: result.vector,
        metadata: result.payload as TMetadata,
        content: (result.payload as Record<string, unknown>)?._content as
          | string
          | undefined,
      }));
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);

      if (errorMessage.includes("dimension") || errorMessage.includes("size")) {
        throw new Error(
          `Qdrant: Query vector dimension mismatch. Collection "${indexName}" expects ${expectedDimension || "a different"} dimension.`,
        );
      }
      if (
        errorMessage.includes("not found") ||
        errorMessage.includes("doesn't exist")
      ) {
        throw new Error(
          `Qdrant: Collection "${indexName}" does not exist. Create it first with createIndex().`,
        );
      }
      throw new Error(`Qdrant: Query failed - ${errorMessage}`);
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
    if (id === undefined || id === null || id === "") {
      throw new Error("Vector ID cannot be empty");
    }

    if (!update.vector && !update.metadata) {
      this.logDebug("updateVector called with no updates, skipping");
      return; // Nothing to update
    }

    // Validate vector if provided
    if (update.vector) {
      const expectedDimension = await this.getCollectionDimension(indexName);
      this.validateVector(
        update.vector,
        expectedDimension,
        `Update vector for "${id}"`,
      );
    }

    // Validate payload if provided
    if (update.metadata) {
      this.validatePayloadSize(update.metadata, id);
    }

    try {
      // If only updating metadata, use setPayload for efficiency
      if (!update.vector && update.metadata) {
        await this.client!.setPayload(indexName, {
          wait: true,
          points: [id],
          payload: update.metadata as Record<string, unknown>,
        });
        this.logDebug(`Updated metadata for vector: ${id}`);
        return;
      }

      // If updating vector (with or without metadata), need to upsert
      // First retrieve existing payload if we're only updating the vector
      let payload: Record<string, unknown> | undefined;

      if (update.vector && !update.metadata) {
        const existing = await this.client!.retrieve(indexName, {
          ids: [id],
          with_payload: true,
          with_vector: false,
        });

        if (existing.length === 0) {
          throw new Error(
            `Vector with id '${id}' not found in collection '${indexName}'`,
          );
        }
        payload = existing[0].payload;
      } else {
        payload = update.metadata as Record<string, unknown>;
      }

      // Upsert with the new vector and payload
      await this.client!.upsert(indexName, {
        wait: true,
        points: [
          {
            id,
            vector: update.vector!,
            payload,
          },
        ],
      });
      this.logDebug(`Updated vector: ${id}`);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);

      if (errorMessage.includes("not found")) {
        throw error; // Re-throw our own error
      }
      if (errorMessage.includes("dimension") || errorMessage.includes("size")) {
        throw new Error(
          `Qdrant: Vector dimension mismatch when updating "${id}". Collection "${indexName}" expects a different dimension.`,
        );
      }
      throw new Error(
        `Qdrant: Failed to update vector "${id}" - ${errorMessage}`,
      );
    }
  }

  /**
   * Get collection statistics
   */
  async getStats(indexName: string): Promise<VectorStoreStats> {
    this.ensureInitialized();

    const info = await this.client!.getCollection(indexName);

    return {
      vectorCount: info.points_count || 0,
      dimension: info.config.params.vectors?.size,
      metrics: info as unknown as UnknownRecord,
    };
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
      throw new Error("Collection name cannot be empty");
    }

    try {
      // Handle deleteAll - use empty filter which matches all points in Qdrant
      if (options.deleteAll) {
        // Get count before deletion for the result
        const stats = await this.getStats(indexName);
        const countBefore = stats.vectorCount || 0;

        if (countBefore > 0) {
          // In Qdrant, an empty filter object matches all points
          await this.client!.delete(indexName, {
            wait: true,
            filter: {},
          });
        }

        return { deletedCount: countBefore, acknowledged: true };
      }

      if (options.ids && options.ids.length > 0) {
        // Validate IDs
        for (const id of options.ids) {
          if (id === undefined || id === null || id === "") {
            throw new Error("Delete IDs cannot contain empty values");
          }
        }

        await this.client!.delete(indexName, {
          wait: true,
          points: options.ids,
        });
        return { deletedCount: options.ids.length, acknowledged: true };
      }

      if (options.filter) {
        await this.client!.delete(indexName, {
          wait: true,
          filter: translateToQdrant(options.filter) as Record<string, unknown>,
        });
        return { deletedCount: undefined, acknowledged: true }; // Qdrant doesn't return count for filter deletes
      }

      return { deletedCount: 0, acknowledged: true };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);

      if (
        errorMessage.includes("not found") ||
        errorMessage.includes("doesn't exist")
      ) {
        throw new Error(`Qdrant: Collection "${indexName}" does not exist.`);
      }
      throw new Error(`Qdrant: Delete failed - ${errorMessage}`);
    }
  }

  /**
   * Translate filter to Qdrant format
   */
  protected translateFilter<TMetadata extends UnknownRecord>(
    filter: MetadataFilter<TMetadata>,
  ): unknown {
    return translateToQdrant(filter);
  }

  /**
   * Map similarity metric to Qdrant format
   */
  private mapMetric(metric: SimilarityMetric): string {
    switch (metric) {
      case "cosine":
        return "Cosine";
      case "euclidean":
        return "Euclid";
      case "dotProduct":
        return "Dot";
      default:
        return "Cosine";
    }
  }
}
