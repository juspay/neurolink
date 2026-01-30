/**
 * DataStax Astra DB Vector Store Implementation
 * Serverless Cassandra-based vector database with enterprise features
 * @see https://docs.datastax.com/en/astra-serverless/docs/
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
import { translateToAstra } from "../filterTranslator.js";

// Types for Astra DB client (using Data API)
type AstraCollection = {
  insertMany: (
    documents: AstraDocument[],
    options?: { ordered?: boolean },
  ) => Promise<AstraInsertManyResult>;
  find: (
    filter: Record<string, unknown>,
    options?: AstraFindOptions,
  ) => AstraCursor;
  findOne: (
    filter: Record<string, unknown>,
    options?: AstraFindOptions,
  ) => Promise<AstraDocument | null>;
  updateOne: (
    filter: Record<string, unknown>,
    update: Record<string, unknown>,
    options?: { upsert?: boolean },
  ) => Promise<AstraUpdateResult>;
  deleteMany: (filter: Record<string, unknown>) => Promise<AstraDeleteResult>;
  deleteOne: (filter: Record<string, unknown>) => Promise<AstraDeleteResult>;
  countDocuments: (filter?: Record<string, unknown>) => Promise<number>;
  drop: () => Promise<void>;
};

type AstraCursor = {
  toArray: () => Promise<AstraDocument[]>;
};

type AstraDocument = {
  _id: string;
  $vector?: number[];
  content?: string;
  [key: string]: unknown;
};

type AstraInsertManyResult = {
  insertedCount: number;
  insertedIds: string[];
};

type AstraUpdateResult = {
  matchedCount: number;
  modifiedCount: number;
  upsertedId?: string;
};

type AstraDeleteResult = {
  deletedCount: number;
};

type AstraFindOptions = {
  sort?: Record<string, unknown>;
  limit?: number;
  skip?: number;
  projection?: Record<string, number>;
  includeSimilarity?: boolean;
};

type AstraDb = {
  collection: (name: string) => AstraCollection;
  createCollection: (
    name: string,
    options?: AstraCollectionOptions,
  ) => Promise<AstraCollection>;
  dropCollection: (name: string) => Promise<void>;
  listCollections: () => Promise<Array<{ name: string }>>;
};

type AstraCollectionOptions = {
  vector?: {
    dimension: number;
    metric: "cosine" | "euclidean" | "dot_product";
  };
};

/**
 * DataStax Astra-specific configuration
 */
export type AstraConfig = VectorStoreConfig & {
  /** Astra DB token (required) */
  token: string;
  /** Astra DB endpoint URL (required) */
  endpoint: string;
  /** Default namespace/keyspace (optional) */
  namespace?: string;
  /** Default collection name (optional) */
  collectionName?: string;
};

/**
 * DataStax Astra DB Vector Store implementation
 */
export class AstraStore extends BaseVectorStore<AstraConfig> {
  private db: AstraDb | null = null;
  private collections: Map<string, AstraCollection> = new Map();

  constructor(config: AstraConfig) {
    super(config, "astra" as VectorStoreName);
  }

  /**
   * Execute an operation with retry logic
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
        if (this.isRetryableError(error)) {
          const delay = baseDelay * 2 ** attempt;
          this.logDebug(
            `Retrying operation in ${delay}ms (attempt ${attempt + 1}/${maxRetries})`,
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
   * Check if an error is retryable
   */
  private isRetryableError(error: unknown): boolean {
    const message = (error as Error)?.message?.toLowerCase() || "";
    return (
      message.includes("rate limit") ||
      message.includes("429") ||
      message.includes("503") ||
      message.includes("timeout") ||
      message.includes("unavailable")
    );
  }

  /**
   * Initialize connection to Astra DB
   */
  async connect(): Promise<void> {
    if (this.initialized) {
      return;
    }

    try {
      // Dynamically import Astra DB client
      const { DataAPIClient } = await import("@datastax/astra-db-ts");

      const client = new DataAPIClient(this.config.token);
      this.db = client.db(this.config.endpoint, {
        namespace: this.config.namespace,
      }) as unknown as AstraDb;

      // Test connection by listing collections
      await this.db.listCollections();

      this.initialized = true;
      this.logInfo("Connected successfully", {
        endpoint: this.config.endpoint,
        namespace: this.config.namespace,
      });
    } catch (error) {
      this.logError("Failed to connect", error);
      throw new Error(
        `Failed to connect to DataStax Astra: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Disconnect from Astra DB
   */
  async disconnect(): Promise<void> {
    this.db = null;
    this.collections.clear();
    this.initialized = false;
    this.logInfo("Disconnected");
  }

  /**
   * Create a new collection with vector support
   */
  async createIndex(config: VectorIndexConfig): Promise<void> {
    this.ensureInitialized();

    const metric = this.mapMetric(config.metric || "cosine");

    await this.withRetry(() =>
      this.db!.createCollection(config.name, {
        vector: {
          dimension: config.dimension,
          metric,
        },
      }),
    );

    this.logInfo(`Collection created: ${config.name}`, {
      dimension: config.dimension,
      metric,
    });
  }

  /**
   * Delete a collection
   */
  async deleteIndex(indexName: string): Promise<void> {
    this.ensureInitialized();

    await this.withRetry(() => this.db!.dropCollection(indexName));
    this.collections.delete(indexName);
    this.logInfo(`Collection deleted: ${indexName}`);
  }

  /**
   * List all collections
   */
  async listIndexes(): Promise<string[]> {
    this.ensureInitialized();

    const collections = await this.withRetry(() => this.db!.listCollections());
    return collections.map((c) => c.name);
  }

  /**
   * Check if a collection exists
   */
  async indexExists(indexName: string): Promise<boolean> {
    const indexes = await this.listIndexes();
    return indexes.includes(indexName);
  }

  /**
   * Get or create collection reference
   */
  private getCollection(name: string): AstraCollection {
    if (!this.collections.has(name)) {
      this.collections.set(name, this.db!.collection(name));
    }
    return this.collections.get(name)!;
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

    const collection = this.getCollection(indexName);
    const batchSize = options?.batchSize || 20; // Astra has smaller batch limits
    let totalUpserted = 0;

    // Convert records to Astra document format
    const documents: AstraDocument[] = records.map((record) => ({
      _id: record.id,
      $vector: record.vector,
      content: record.content,
      ...(record.metadata || {}),
    }));

    // Batch upsert using insertMany with ordered: false for better performance
    for (let i = 0; i < documents.length; i += batchSize) {
      const batch = documents.slice(i, i + batchSize);

      // Try insert first, if duplicates exist they'll be skipped
      // Then update existing ones
      try {
        const result = await this.withRetry(() =>
          collection.insertMany(batch, { ordered: false }),
        );
        totalUpserted += result.insertedCount;
      } catch (error) {
        // Handle duplicate key errors by doing individual upserts
        if (
          (error as Error)?.message?.includes("duplicate") ||
          (error as Error)?.message?.includes("already exists")
        ) {
          for (const doc of batch) {
            await this.withRetry(() =>
              collection.updateOne(
                { _id: doc._id },
                { $set: doc },
                { upsert: true },
              ),
            );
            totalUpserted++;
          }
        } else {
          throw error;
        }
      }

      this.logDebug(`Upserted batch: ${totalUpserted}/${documents.length}`);
    }

    return { upsertedCount: totalUpserted };
  }

  /**
   * Query vectors using vector similarity search
   */
  async query<TMetadata extends UnknownRecord = UnknownRecord>(
    indexName: string,
    options: VectorQueryOptions<TMetadata>,
  ): Promise<VectorQueryResult<TMetadata>[]> {
    this.ensureInitialized();

    const collection = this.getCollection(indexName);

    // Build filter
    let filter: Record<string, unknown> = {};
    if (options.filter) {
      filter = translateToAstra(options.filter);
    }

    // Astra uses $vector for similarity search in sort
    const findOptions: AstraFindOptions = {
      sort: { $vector: options.vector },
      limit: options.topK,
      includeSimilarity: true,
    };

    // Set projection based on options
    if (!options.includeVectors) {
      findOptions.projection = { $vector: 0 };
    }

    const cursor = collection.find(filter, findOptions);
    const results = await this.withRetry(() => cursor.toArray());

    return results
      .filter((doc) => {
        const similarity = (doc as Record<string, unknown>).$similarity as
          | number
          | undefined;
        return !options.minScore || (similarity ?? 0) >= options.minScore;
      })
      .map((doc) => {
        const { _id, $vector, content, $similarity, ...metadata } = doc as {
          _id: string;
          $vector?: number[];
          content?: string;
          $similarity?: number;
          [key: string]: unknown;
        };

        return {
          id: _id,
          score: $similarity ?? 0,
          vector: options.includeVectors ? $vector : undefined,
          metadata: metadata as TMetadata,
          content,
        };
      });
  }

  /**
   * Delete vectors
   */
  async delete(
    indexName: string,
    options: VectorDeleteOptions,
  ): Promise<VectorDeleteResult> {
    this.ensureInitialized();

    const collection = this.getCollection(indexName);

    if (options.deleteAll) {
      // Delete all documents in the collection
      const result = await this.withRetry(() => collection.deleteMany({}));
      return { deletedCount: result.deletedCount, acknowledged: true };
    }

    if (options.ids && options.ids.length > 0) {
      // Delete by IDs
      let totalDeleted = 0;
      for (const id of options.ids) {
        const result = await this.withRetry(() =>
          collection.deleteOne({ _id: id }),
        );
        totalDeleted += result.deletedCount;
      }
      return { deletedCount: totalDeleted, acknowledged: true };
    }

    if (options.filter) {
      const filter = translateToAstra(options.filter);
      const result = await this.withRetry(() => collection.deleteMany(filter));
      return { deletedCount: result.deletedCount, acknowledged: true };
    }

    return { deletedCount: 0, acknowledged: true };
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

    if (!update.vector && !update.metadata) {
      return; // Nothing to update
    }

    const collection = this.getCollection(indexName);
    const updateDoc: Record<string, unknown> = {};

    if (update.vector) {
      updateDoc.$vector = update.vector;
    }

    if (update.metadata) {
      Object.assign(updateDoc, update.metadata);
    }

    const result = await this.withRetry(() =>
      collection.updateOne({ _id: id }, { $set: updateDoc }),
    );

    if (result.matchedCount === 0) {
      throw new Error(
        `Vector with id '${id}' not found in collection '${indexName}'`,
      );
    }

    this.logDebug(`Updated vector: ${id}`);
  }

  /**
   * Get collection statistics
   */
  async getStats(indexName: string): Promise<VectorStoreStats> {
    this.ensureInitialized();

    const collection = this.getCollection(indexName);
    const count = await this.withRetry(() => collection.countDocuments());

    return {
      vectorCount: count,
      // Astra doesn't expose dimension info directly through the Data API
      // You would need to query a document to get the vector dimension
      metrics: {
        collectionName: indexName,
      },
    };
  }

  /**
   * Translate filter to Astra format
   */
  protected translateFilter<TMetadata extends UnknownRecord>(
    filter: MetadataFilter<TMetadata>,
  ): unknown {
    return translateToAstra(filter);
  }

  /**
   * Map similarity metric to Astra format
   */
  private mapMetric(
    metric: SimilarityMetric,
  ): "cosine" | "euclidean" | "dot_product" {
    switch (metric) {
      case "cosine":
        return "cosine";
      case "euclidean":
        return "euclidean";
      case "dotProduct":
        return "dot_product";
      default:
        return "cosine";
    }
  }
}
