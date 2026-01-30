/**
 * DataStax Astra DB Vector Store Adapter
 * Implements vector similarity search using Astra DB's serverless Cassandra with vector search
 *
 * Astra DB provides a serverless vector database with JSON API for documents
 * and supports $vector field for embeddings with cosine, euclidean, and dot product metrics.
 *
 * @see https://github.com/datastax/astra-db-ts
 * @see https://docs.datastax.com/en/astra-db-serverless
 */

import type { UnknownRecord } from "../../types/common.js";
import { logger } from "../../utils/logger.js";
import { BaseVectorStore } from "../BaseVectorStore.js";
import type {
  VectorStoreName,
  VectorRecord,
  VectorQueryResult,
  VectorIndexConfig,
  VectorQueryOptions,
  VectorUpsertOptions,
  VectorDeleteOptions,
  VectorStoreStats,
  MetadataFilter,
  FieldFilter,
  VectorStoreConfig,
  SimilarityMetric,
} from "../types.js";

/**
 * Astra DB specific configuration
 */
export type AstraDBConfig = VectorStoreConfig & {
  /** Astra DB application token (required) */
  token: string;
  /** Astra DB API endpoint URL (required) */
  endpoint: string;
  /** Default keyspace/namespace to use */
  keyspace?: string;
  /** Connection timeout in ms (default: 30000) */
  connectionTimeout?: number;
  /** Enable detailed logging */
  logging?: boolean | "all" | "error" | "warning";
};

/**
 * Internal type for Astra DB client interface
 * Compatible with @datastax/astra-db-ts API
 */
interface AstraDataAPIClient {
  db(
    endpoint: string,
    options?: { token?: string; keyspace?: string },
  ): AstraDb;
  close(): Promise<void>;
}

interface AstraDb {
  createCollection<T = AstraDocument>(
    name: string,
    options?: CreateCollectionOptions,
  ): Promise<AstraCollection<T>>;
  dropCollection(name: string): Promise<void>;
  listCollections(): Promise<CollectionInfo[]>;
  collection<T = AstraDocument>(name: string): AstraCollection<T>;
}

interface CreateCollectionOptions {
  vector?: {
    dimension: number;
    metric?: "cosine" | "euclidean" | "dot_product";
  };
  defaultId?: { type: string };
}

interface CollectionInfo {
  name: string;
  options?: {
    vector?: {
      dimension: number;
      metric?: string;
    };
  };
}

interface AstraCollection<T = AstraDocument> {
  insertOne(document: T, options?: unknown): Promise<{ insertedId: unknown }>;
  insertMany(
    documents: T[],
    options?: unknown,
  ): Promise<{ insertedIds: unknown[] }>;
  find(filter: unknown, options?: FindOptions): AstraFindCursor<T>;
  findOne(
    filter: unknown,
    options?: FindOneOptions,
  ): Promise<(T & { $similarity?: number }) | null>;
  updateOne(
    filter: unknown,
    update: unknown,
    options?: unknown,
  ): Promise<{ modifiedCount: number; matchedCount: number }>;
  deleteOne(filter: unknown, options?: unknown): Promise<{ deletedCount: number }>;
  deleteMany(filter: unknown, options?: unknown): Promise<{ deletedCount: number }>;
  countDocuments(
    filter: unknown,
    upperBound: number,
    options?: unknown,
  ): Promise<number>;
  options(): Promise<{ vector?: { dimension: number; metric?: string } }>;
}

interface FindOptions {
  sort?: unknown;
  limit?: number;
  projection?: unknown;
  includeSimilarity?: boolean;
}

interface FindOneOptions {
  sort?: unknown;
  projection?: unknown;
  includeSimilarity?: boolean;
}

interface AstraFindCursor<T> {
  sort(sort: unknown): AstraFindCursor<T>;
  limit(limit: number): AstraFindCursor<T>;
  includeSimilarity(include: boolean): AstraFindCursor<T>;
  projection(projection: unknown): AstraFindCursor<T>;
  toArray(): Promise<Array<T & { $similarity?: number }>>;
}

/**
 * Document structure for Astra DB
 */
interface AstraDocument {
  _id: string;
  $vector?: number[];
  content?: string;
  namespace?: string;
  metadata?: UnknownRecord;
  [key: string]: unknown;
}

/**
 * Index metadata stored in memory for tracking
 */
interface IndexMetadata {
  name: string;
  dimension: number;
  metric: SimilarityMetric;
  created_at: string;
}

/**
 * DataStax Astra DB Vector Store Adapter
 *
 * Features:
 * - Serverless Cassandra with built-in vector search
 * - JSON API for document operations
 * - $vector field for embeddings
 * - Metadata filtering with MongoDB-style operators
 * - Namespace support through document field
 * - Batch operations for performance
 * - Cosine, euclidean, and dot product similarity metrics
 *
 * Note: Requires the @datastax/astra-db-ts SDK to be installed:
 *   npm install @datastax/astra-db-ts
 */
export class AstraDBAdapter extends BaseVectorStore<AstraDBConfig> {
  private client: AstraDataAPIClient | null = null;
  private db: AstraDb | null = null;
  private indexMetadataCache: Map<string, IndexMetadata> = new Map();

  constructor(config: AstraDBConfig) {
    super(config, "astra" as VectorStoreName);
  }

  /**
   * Initialize connection to Astra DB
   */
  async connect(): Promise<void> {
    if (this.initialized) {
      logger.debug("Astra DB already connected");
      return;
    }

    try {
      // Dynamically import the Astra DB client
      const { DataAPIClient } = await this.loadAstraDBDriver();

      // Create client with optional logging
      const clientOptions: { logging?: boolean | "all" | "error" | "warning" } = {};
      if (this.config.logging) {
        clientOptions.logging = this.config.logging;
      }

      this.client = new DataAPIClient(this.config.token, clientOptions);

      // Connect to the database
      this.db = this.client.db(this.config.endpoint, {
        keyspace: this.config.keyspace,
      });

      // Verify connection by listing collections
      await this.db.listCollections();

      this.initialized = true;
      logger.debug("Astra DB connected successfully", {
        endpoint: this.config.endpoint,
        keyspace: this.config.keyspace,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to connect to Astra DB: ${message}`);
    }
  }

  /**
   * Close the Astra DB connection
   */
  async disconnect(): Promise<void> {
    if (this.client) {
      try {
        await this.client.close();
        this.client = null;
        this.db = null;
        this.initialized = false;
        this.indexMetadataCache.clear();
        logger.debug("Astra DB disconnected");
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        throw new Error(`Failed to disconnect from Astra DB: ${message}`);
      }
    }
  }

  /**
   * Create a new vector collection (index)
   */
  async createIndex(config: VectorIndexConfig): Promise<void> {
    this.ensureInitialized();

    const { name, dimension, metric = "cosine" } = config;

    try {
      // Convert metric to Astra DB format
      const astraMetric = this.toAstraMetric(metric);

      await this.db!.createCollection(name, {
        vector: {
          dimension,
          metric: astraMetric,
        },
        defaultId: { type: "uuid" },
      });

      // Store metadata in cache
      this.indexMetadataCache.set(name, {
        name,
        dimension,
        metric,
        created_at: new Date().toISOString(),
      });

      logger.debug(`Created collection ${name}`, { dimension, metric });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to create collection ${name}: ${message}`);
    }
  }

  /**
   * Delete a collection (index)
   */
  async deleteIndex(indexName: string): Promise<void> {
    this.ensureInitialized();

    try {
      await this.db!.dropCollection(indexName);
      this.indexMetadataCache.delete(indexName);
      logger.debug(`Deleted collection ${indexName}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to delete collection ${indexName}: ${message}`);
    }
  }

  /**
   * List all collections
   */
  async listIndexes(): Promise<string[]> {
    this.ensureInitialized();

    try {
      const collections = await this.db!.listCollections();
      return collections.map((col) => col.name);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to list collections: ${message}`);
    }
  }

  /**
   * Check if a collection exists
   */
  async indexExists(indexName: string): Promise<boolean> {
    this.ensureInitialized();

    try {
      const collections = await this.db!.listCollections();
      return collections.some((col) => col.name === indexName);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to check collection existence: ${message}`);
    }
  }

  /**
   * Upsert vectors into the collection
   */
  async upsert<TMetadata extends UnknownRecord = UnknownRecord>(
    indexName: string,
    records: VectorRecord<TMetadata>[],
    options?: VectorUpsertOptions,
  ): Promise<{ upsertedCount: number }> {
    this.ensureInitialized();

    const namespace = options?.namespace || null;

    // Validate dimensions
    if (records.length > 0) {
      this.validateDimensions(records.map((r) => r.vector));
    }

    try {
      const collection = this.db!.collection<AstraDocument>(indexName);
      let upsertedCount = 0;

      // Astra DB doesn't have a native upsert, so we use updateOne with upsert option
      // or delete + insert pattern for each record
      for (const record of records) {
        const document: AstraDocument = {
          _id: record.id,
          $vector: record.vector,
          content: record.content || undefined,
          namespace: record.namespace || namespace || undefined,
          metadata: record.metadata as UnknownRecord | undefined,
        };

        // Try to update, if not found, insert
        const updateResult = await collection.updateOne(
          { _id: record.id },
          {
            $set: {
              $vector: document.$vector,
              content: document.content,
              namespace: document.namespace,
              metadata: document.metadata,
            },
          },
          { upsert: true } as unknown,
        );

        if (updateResult.matchedCount > 0 || updateResult.modifiedCount >= 0) {
          upsertedCount++;
        }
      }

      logger.debug(`Upserted ${upsertedCount} records to ${indexName}`);
      return { upsertedCount };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to upsert records: ${message}`);
    }
  }

  /**
   * Query vectors by similarity
   */
  async query<TMetadata extends UnknownRecord = UnknownRecord>(
    indexName: string,
    options: VectorQueryOptions<TMetadata>,
  ): Promise<VectorQueryResult<TMetadata>[]> {
    this.ensureInitialized();

    const {
      vector,
      topK,
      minScore,
      filter,
      includeVectors = false,
      includeMetadata = true,
      namespace,
    } = options;

    try {
      const collection = this.db!.collection<AstraDocument>(indexName);

      // Build filter with optional namespace
      const queryFilter: UnknownRecord = {};
      if (namespace) {
        queryFilter.namespace = namespace;
      }
      if (filter) {
        const translatedFilter = this.translateFilter(filter);
        Object.assign(queryFilter, translatedFilter);
      }

      // Build projection
      const projection: UnknownRecord = {
        _id: 1,
        content: 1,
      };
      if (includeMetadata) {
        projection.metadata = 1;
      }
      if (includeVectors) {
        projection.$vector = 1;
      }

      // Perform vector similarity search
      const cursor = collection
        .find(queryFilter, {
          sort: { $vector: vector },
          limit: topK,
          projection,
          includeSimilarity: true,
        })
        .includeSimilarity(true)
        .limit(topK);

      const documents = await cursor.toArray();

      // Transform results
      const results: VectorQueryResult<TMetadata>[] = [];
      for (const doc of documents) {
        const score = doc.$similarity ?? 0;

        // Apply minimum score filter
        if (minScore !== undefined && score < minScore) {
          continue;
        }

        const result: VectorQueryResult<TMetadata> = {
          id: doc._id,
          score,
          content: doc.content,
        };

        if (includeVectors && doc.$vector) {
          result.vector = doc.$vector;
        }

        if (includeMetadata && doc.metadata) {
          result.metadata = doc.metadata as TMetadata;
        }

        results.push(result);
      }

      return results;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to query vectors: ${message}`);
    }
  }

  /**
   * Delete vectors from the collection
   */
  async delete(
    indexName: string,
    options: VectorDeleteOptions,
  ): Promise<{ deletedCount: number }> {
    this.ensureInitialized();

    const { ids, filter, namespace, deleteAll } = options;

    try {
      const collection = this.db!.collection<AstraDocument>(indexName);
      let deletedCount = 0;

      if (deleteAll) {
        // Delete all records, optionally filtered by namespace
        const deleteFilter: UnknownRecord = namespace ? { namespace } : {};
        const result = await collection.deleteMany(deleteFilter);
        deletedCount = result.deletedCount;
      } else if (ids && ids.length > 0) {
        // Delete by IDs
        for (const id of ids) {
          const result = await collection.deleteOne({ _id: id });
          deletedCount += result.deletedCount;
        }
      } else if (filter) {
        // Delete by filter
        const translatedFilter = this.translateFilter(filter);
        const deleteFilter: UnknownRecord = { ...translatedFilter };
        if (namespace) {
          deleteFilter.namespace = namespace;
        }
        const result = await collection.deleteMany(deleteFilter);
        deletedCount = result.deletedCount;
      }

      logger.debug(`Deleted ${deletedCount} records from ${indexName}`);
      return { deletedCount };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to delete records: ${message}`);
    }
  }

  /**
   * Get collection statistics
   */
  async getStats(indexName: string): Promise<VectorStoreStats> {
    this.ensureInitialized();

    try {
      const collection = this.db!.collection<AstraDocument>(indexName);

      // Get count (Astra DB requires an upper bound)
      const vectorCount = await collection.countDocuments({}, 100000);

      // Get namespace count
      // Note: Astra DB doesn't have a direct distinct count, so we estimate
      const namespaceCount = await this.estimateNamespaceCount(collection);

      // Get collection options for dimension and metric
      const collectionOptions = await collection.options();
      const dimension = collectionOptions.vector?.dimension;
      const metric = collectionOptions.vector?.metric || "cosine";

      return {
        vectorCount,
        dimension,
        namespaceCount,
        metrics: {
          metric: this.fromAstraMetric(metric),
        },
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to get stats for ${indexName}: ${message}`);
    }
  }

  /**
   * Translate abstract filter to Astra DB filter format
   */
  protected translateFilter<TMetadata extends UnknownRecord>(
    filter: MetadataFilter<TMetadata>,
  ): UnknownRecord {
    const result: UnknownRecord = {};

    for (const [key, value] of Object.entries(filter)) {
      if (key === "$and" && Array.isArray(value)) {
        result.$and = value.map((f) =>
          this.translateFilter(f as MetadataFilter),
        );
      } else if (key === "$or" && Array.isArray(value)) {
        result.$or = value.map((f) =>
          this.translateFilter(f as MetadataFilter),
        );
      } else if (key === "$not" && typeof value === "object" && value !== null) {
        // Astra DB uses $not differently, wrap in $not operator
        const notFilter = this.translateFilter(value as MetadataFilter);
        // For each key in notFilter, apply $not
        for (const [notKey, notValue] of Object.entries(notFilter)) {
          result[notKey] = { $not: notValue };
        }
      } else if (this.isFieldFilter(value)) {
        // Field-level operators
        const fieldPath = key.startsWith("metadata.") ? key : `metadata.${key}`;
        result[fieldPath] = this.translateFieldFilter(value as FieldFilter);
      } else {
        // Simple equality - wrap in metadata path
        const fieldPath = key.startsWith("metadata.") ? key : `metadata.${key}`;
        result[fieldPath] = value;
      }
    }

    return result;
  }

  // ===================
  // PRIVATE HELPER METHODS
  // ===================

  /**
   * Load Astra DB driver dynamically
   */
  private async loadAstraDBDriver(): Promise<{
    DataAPIClient: new (
      token: string,
      options?: { logging?: boolean | "all" | "error" | "warning" },
    ) => AstraDataAPIClient;
  }> {
    try {
      // Dynamic import to avoid bundling issues
      const modulePath = "@datastax/astra-db-ts";
      const module = await import(/* @vite-ignore */ modulePath);
      return {
        DataAPIClient: module.DataAPIClient,
      };
    } catch {
      throw new Error(
        "Astra DB driver not found. Install @datastax/astra-db-ts: npm install @datastax/astra-db-ts",
      );
    }
  }

  /**
   * Convert NeuroLink metric to Astra DB metric
   */
  private toAstraMetric(metric: SimilarityMetric): "cosine" | "euclidean" | "dot_product" {
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

  /**
   * Convert Astra DB metric to NeuroLink metric
   */
  private fromAstraMetric(metric: string): SimilarityMetric {
    switch (metric) {
      case "cosine":
        return "cosine";
      case "euclidean":
        return "euclidean";
      case "dot_product":
        return "dotProduct";
      default:
        return "cosine";
    }
  }

  /**
   * Estimate namespace count by sampling
   */
  private async estimateNamespaceCount(
    collection: AstraCollection<AstraDocument>,
  ): Promise<number> {
    try {
      // Sample documents to get unique namespaces
      const cursor = collection.find({}).limit(1000).projection({ namespace: 1 });
      const docs = await cursor.toArray();
      const namespaces = new Set(docs.map((d) => d.namespace).filter(Boolean));
      return namespaces.size;
    } catch {
      return 0;
    }
  }

  /**
   * Check if value is a field filter
   */
  private isFieldFilter(value: unknown): boolean {
    if (typeof value !== "object" || value === null) return false;
    const keys = Object.keys(value);
    return keys.some((k) => k.startsWith("$"));
  }

  /**
   * Translate a field filter to Astra DB format
   */
  private translateFieldFilter(filter: FieldFilter): UnknownRecord {
    const result: UnknownRecord = {};

    for (const [op, val] of Object.entries(filter)) {
      switch (op) {
        case "$eq":
          result.$eq = val;
          break;
        case "$ne":
          result.$ne = val;
          break;
        case "$gt":
          result.$gt = val;
          break;
        case "$gte":
          result.$gte = val;
          break;
        case "$lt":
          result.$lt = val;
          break;
        case "$lte":
          result.$lte = val;
          break;
        case "$in":
          result.$in = val;
          break;
        case "$nin":
          result.$nin = val;
          break;
        case "$exists":
          result.$exists = val;
          break;
        case "$contains":
          // Astra DB uses regex for contains
          result.$regex = `.*${val}.*`;
          break;
        case "$startsWith":
          result.$regex = `^${val}`;
          break;
        case "$endsWith":
          result.$regex = `${val}$`;
          break;
        default:
          // Pass through unknown operators
          result[op] = val;
      }
    }

    return result;
  }
}
