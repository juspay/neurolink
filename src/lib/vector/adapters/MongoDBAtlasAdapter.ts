/**
 * MongoDB Atlas Vector Search Adapter
 * Implements vector similarity search using MongoDB Atlas with $vectorSearch aggregation
 *
 * MongoDB Atlas Vector Search provides native vector similarity search capabilities
 * through the aggregation pipeline with support for pre-filtering and post-filtering.
 *
 * @see https://www.mongodb.com/docs/atlas/atlas-vector-search/
 */

import type { UnknownRecord } from "../../types/common.js";
import { logger } from "../../utils/logger.js";
import { BaseVectorStore } from "../BaseVectorStore.js";
import type {
  VectorStoreConfig,
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
  SimilarityMetric,
} from "../types.js";

/**
 * MongoDB Atlas specific configuration
 */
export type MongoDBAtlasConfig = VectorStoreConfig & {
  /** MongoDB connection URI (required) */
  connectionUri: string;
  /** Database name (required) */
  databaseName: string;
  /** Default collection name (optional, can be overridden per index) */
  defaultCollection?: string;
  /** Atlas Search index name prefix (default: "vector_index") */
  indexPrefix?: string;
  /** Connection timeout in ms (default: 30000) */
  connectionTimeout?: number;
  /** Socket timeout in ms (default: 30000) */
  socketTimeout?: number;
  /** Maximum number of connections in the pool (default: 10) */
  maxPoolSize?: number;
  /** Minimum number of connections in the pool (default: 1) */
  minPoolSize?: number;
  /** Write concern (default: "majority") */
  writeConcern?: string;
  /** Read preference (default: "primaryPreferred") */
  readPreference?: string;
  /** Retry writes (default: true) */
  retryWrites?: boolean;
};

/**
 * MongoDB document interface for vector storage
 */
interface VectorDocument {
  _id: string;
  vector: number[];
  metadata?: UnknownRecord;
  content?: string;
  namespace?: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Internal MongoDB client interface
 * Compatible with mongodb driver
 */
interface MongoClient {
  connect(): Promise<void>;
  close(): Promise<void>;
  db(name?: string): MongoDatabase;
}

interface MongoDatabase {
  collection<T = VectorDocument>(name: string): MongoCollection<T>;
  listCollections(filter?: { name?: string }): {
    toArray(): Promise<Array<{ name: string }>>;
  };
  createCollection(name: string): Promise<MongoCollection<VectorDocument>>;
  dropCollection(name: string): Promise<boolean>;
  admin(): MongoAdmin;
}

interface MongoCollection<T = VectorDocument> {
  insertMany(docs: T[]): Promise<{ insertedCount: number }>;
  bulkWrite(
    operations: Array<{
      updateOne?: {
        filter: { _id: string };
        update: { $set: Partial<T> };
        upsert: boolean;
      };
    }>,
  ): Promise<{ upsertedCount: number; modifiedCount: number }>;
  find(filter: unknown, options?: { projection?: unknown }): {
    toArray(): Promise<T[]>;
  };
  deleteMany(filter: unknown): Promise<{ deletedCount: number }>;
  countDocuments(filter?: unknown): Promise<number>;
  aggregate<TResult = T>(pipeline: unknown[]): {
    toArray(): Promise<TResult[]>;
  };
  createSearchIndex?(definition: {
    name: string;
    definition: {
      mappings: {
        dynamic: boolean;
        fields: Record<string, unknown>;
      };
    };
  }): Promise<string>;
  dropSearchIndex?(name: string): Promise<void>;
  listSearchIndexes?(): { toArray(): Promise<Array<{ name: string }>> };
}

interface MongoAdmin {
  ping(): Promise<{ ok: number }>;
}

/**
 * Index metadata stored in a separate collection
 */
interface IndexMetadata {
  name: string;
  collectionName: string;
  dimension: number;
  metric: SimilarityMetric;
  searchIndexName: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * MongoDB Atlas Vector Search Adapter
 *
 * Features:
 * - Native $vectorSearch aggregation pipeline
 * - Pre-filtering and post-filtering with MQL
 * - Multiple similarity metrics (cosine, euclidean, dotProduct)
 * - Namespace support through metadata field
 * - Batch operations for performance
 * - Automatic index management
 *
 * Requirements:
 * - MongoDB Atlas M10+ cluster with Atlas Vector Search enabled
 * - mongodb driver: npm install mongodb
 * - Atlas Search indexes must be created for vector fields
 */
export class MongoDBAtlasAdapter extends BaseVectorStore<MongoDBAtlasConfig> {
  private client: MongoClient | null = null;
  private db: MongoDatabase | null = null;
  private indexMetadataCache: Map<string, IndexMetadata> = new Map();

  /** Collection name for storing index metadata */
  private readonly metadataCollectionName = "_vector_index_metadata";

  constructor(config: MongoDBAtlasConfig) {
    super(config, "mongodb" as VectorStoreName);
  }

  /**
   * Initialize connection to MongoDB Atlas
   */
  async connect(): Promise<void> {
    if (this.initialized) {
      logger.debug("MongoDB Atlas already connected");
      return;
    }

    try {
      // Dynamically import mongodb driver
      const { MongoClient: MongoClientClass } = await this.loadMongoDriver();

      // Build connection options
      const options = {
        maxPoolSize: this.config.maxPoolSize || 10,
        minPoolSize: this.config.minPoolSize || 1,
        connectTimeoutMS: this.config.connectionTimeout || 30000,
        socketTimeoutMS: this.config.socketTimeout || 30000,
        retryWrites: this.config.retryWrites !== false,
        w: this.config.writeConcern || "majority",
        readPreference: this.config.readPreference || "primaryPreferred",
      };

      // Create client and connect
      this.client = new MongoClientClass(
        this.config.connectionUri,
        options,
      ) as unknown as MongoClient;
      await this.client.connect();

      // Get database reference
      this.db = this.client.db(this.config.databaseName);

      // Verify connection with a ping
      await this.db.admin().ping();

      // Load existing index metadata
      await this.loadIndexMetadata();

      this.initialized = true;
      logger.debug("MongoDB Atlas connected successfully", {
        database: this.config.databaseName,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to connect to MongoDB Atlas: ${message}`);
    }
  }

  /**
   * Close the MongoDB connection
   */
  async disconnect(): Promise<void> {
    if (this.client) {
      try {
        await this.client.close();
        this.client = null;
        this.db = null;
        this.initialized = false;
        this.indexMetadataCache.clear();
        logger.debug("MongoDB Atlas disconnected");
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        throw new Error(`Failed to disconnect from MongoDB Atlas: ${message}`);
      }
    }
  }

  /**
   * Create a new vector index (collection + Atlas Search index)
   *
   * Note: Atlas Search indexes are created asynchronously and may take
   * a few minutes to become available for queries.
   */
  async createIndex(config: VectorIndexConfig): Promise<void> {
    this.ensureInitialized();

    const { name, dimension, metric = "cosine" } = config;
    const collectionName = this.getCollectionName(name);
    const searchIndexName = this.getSearchIndexName(name);

    try {
      // Check if collection exists
      const collections = await this.db!.listCollections({
        name: collectionName,
      }).toArray();

      if (collections.length === 0) {
        // Create collection
        await this.db!.createCollection(collectionName);
        logger.debug(`Created collection ${collectionName}`);
      }

      // Get collection reference
      const collection = this.db!.collection<VectorDocument>(collectionName);

      // Create Atlas Search index for vector field
      // Note: This requires Atlas M10+ with Search enabled
      if (collection.createSearchIndex) {
        try {
          await collection.createSearchIndex({
            name: searchIndexName,
            definition: {
              mappings: {
                dynamic: true,
                fields: {
                  vector: {
                    type: "knnVector",
                    dimensions: dimension,
                    similarity: this.mapMetricToAtlas(metric),
                  },
                },
              },
            },
          });
          logger.debug(`Created search index ${searchIndexName}`);
        } catch (indexError) {
          // Index may already exist or Atlas Search not available
          logger.warn(
            `Could not create search index ${searchIndexName}: ${indexError instanceof Error ? indexError.message : String(indexError)}`,
          );
        }
      }

      // Store index metadata
      const metadata: IndexMetadata = {
        name,
        collectionName,
        dimension,
        metric,
        searchIndexName,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const metadataCollection =
        this.db!.collection<IndexMetadata>(this.metadataCollectionName);
      await metadataCollection.bulkWrite([
        {
          updateOne: {
            filter: { _id: name } as unknown as { _id: string },
            update: { $set: metadata },
            upsert: true,
          },
        },
      ]);

      this.indexMetadataCache.set(name, metadata);

      logger.debug(`Created index ${name}`, { dimension, metric });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to create index ${name}: ${message}`);
    }
  }

  /**
   * Delete an index (collection + Atlas Search index)
   */
  async deleteIndex(indexName: string): Promise<void> {
    this.ensureInitialized();

    const metadata = this.indexMetadataCache.get(indexName);
    if (!metadata) {
      // Try to load from database
      const metadataCollection =
        this.db!.collection<IndexMetadata>(this.metadataCollectionName);
      const dbMetadata = (
        await metadataCollection
          .find({ _id: indexName } as unknown)
          .toArray()
      )[0];

      if (!dbMetadata) {
        throw new Error(`Index ${indexName} not found`);
      }
    }

    const collectionName = metadata?.collectionName || this.getCollectionName(indexName);
    const searchIndexName = metadata?.searchIndexName || this.getSearchIndexName(indexName);

    try {
      // Drop the search index first
      const collection = this.db!.collection<VectorDocument>(collectionName);
      if (collection.dropSearchIndex) {
        try {
          await collection.dropSearchIndex(searchIndexName);
          logger.debug(`Dropped search index ${searchIndexName}`);
        } catch {
          // Ignore if search index doesn't exist
        }
      }

      // Drop the collection
      await this.db!.dropCollection(collectionName);

      // Remove from metadata
      const metadataCollection =
        this.db!.collection<IndexMetadata>(this.metadataCollectionName);
      await metadataCollection.deleteMany({
        _id: indexName,
      } as unknown);

      this.indexMetadataCache.delete(indexName);

      logger.debug(`Deleted index ${indexName}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to delete index ${indexName}: ${message}`);
    }
  }

  /**
   * List all indexes
   */
  async listIndexes(): Promise<string[]> {
    this.ensureInitialized();

    try {
      const metadataCollection =
        this.db!.collection<IndexMetadata>(this.metadataCollectionName);
      const indexes = await metadataCollection.find({}).toArray();
      return indexes.map((idx) => idx.name);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to list indexes: ${message}`);
    }
  }

  /**
   * Check if an index exists
   */
  async indexExists(indexName: string): Promise<boolean> {
    this.ensureInitialized();

    try {
      if (this.indexMetadataCache.has(indexName)) {
        return true;
      }

      const metadataCollection =
        this.db!.collection<IndexMetadata>(this.metadataCollectionName);
      const count = await metadataCollection.countDocuments({
        _id: indexName,
      } as unknown);
      return count > 0;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to check index existence: ${message}`);
    }
  }

  /**
   * Upsert vectors into the index
   */
  async upsert<TMetadata extends UnknownRecord = UnknownRecord>(
    indexName: string,
    records: VectorRecord<TMetadata>[],
    options?: VectorUpsertOptions,
  ): Promise<{ upsertedCount: number }> {
    this.ensureInitialized();

    if (records.length === 0) {
      return { upsertedCount: 0 };
    }

    const metadata = await this.getIndexMetadata(indexName);
    const collectionName = metadata?.collectionName || this.getCollectionName(indexName);
    const namespace = options?.namespace;

    // Validate dimensions
    this.validateDimensions(
      records.map((r) => r.vector),
      metadata?.dimension,
    );

    try {
      const collection = this.db!.collection<VectorDocument>(collectionName);
      const now = new Date();

      // Use bulkWrite for upsert semantics
      const operations = records.map((record) => ({
        updateOne: {
          filter: { _id: record.id },
          update: {
            $set: {
              _id: record.id,
              vector: record.vector,
              metadata: record.metadata,
              content: record.content,
              namespace: record.namespace || namespace,
              updatedAt: now,
            } as Partial<VectorDocument>,
            $setOnInsert: {
              createdAt: now,
            },
          } as unknown as { $set: Partial<VectorDocument> },
          upsert: true,
        },
      }));

      const result = await collection.bulkWrite(operations);
      const upsertedCount = result.upsertedCount + result.modifiedCount;

      logger.debug(`Upserted ${upsertedCount} records to ${indexName}`);
      return { upsertedCount };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to upsert records: ${message}`);
    }
  }

  /**
   * Query vectors by similarity using $vectorSearch
   */
  async query<TMetadata extends UnknownRecord = UnknownRecord>(
    indexName: string,
    options: VectorQueryOptions<TMetadata>,
  ): Promise<VectorQueryResult<TMetadata>[]> {
    this.ensureInitialized();

    const metadata = await this.getIndexMetadata(indexName);
    const collectionName = metadata?.collectionName || this.getCollectionName(indexName);
    const searchIndexName = metadata?.searchIndexName || this.getSearchIndexName(indexName);

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
      const collection = this.db!.collection<VectorDocument>(collectionName);

      // Build the aggregation pipeline
      const pipeline: unknown[] = [];

      // Build pre-filter for $vectorSearch
      const preFilter = this.buildPreFilter(filter, namespace);

      // $vectorSearch stage (must be first in pipeline)
      const vectorSearchStage: Record<string, unknown> = {
        $vectorSearch: {
          index: searchIndexName,
          path: "vector",
          queryVector: vector,
          numCandidates: Math.max(topK * 10, 100), // Oversample for better recall
          limit: topK,
        },
      };

      // Add pre-filter if present
      if (preFilter && Object.keys(preFilter).length > 0) {
        (vectorSearchStage.$vectorSearch as Record<string, unknown>).filter =
          preFilter;
      }

      pipeline.push(vectorSearchStage);

      // Add score to results
      pipeline.push({
        $addFields: {
          score: { $meta: "vectorSearchScore" },
        },
      });

      // Apply minimum score filter if specified
      if (minScore !== undefined) {
        pipeline.push({
          $match: {
            score: { $gte: minScore },
          },
        });
      }

      // Project fields based on options
      const projection: Record<string, number | boolean> = {
        _id: 1,
        score: 1,
        content: 1,
      };

      if (includeVectors) {
        projection.vector = 1;
      }

      if (includeMetadata) {
        projection.metadata = 1;
      }

      pipeline.push({ $project: projection });

      // Execute the aggregation
      const results = await collection
        .aggregate<
          VectorDocument & { score: number }
        >(pipeline)
        .toArray();

      // Transform to VectorQueryResult format
      return results.map((doc) => ({
        id: doc._id,
        score: doc.score,
        vector: includeVectors ? doc.vector : undefined,
        metadata: includeMetadata
          ? (doc.metadata as TMetadata | undefined)
          : undefined,
        content: doc.content,
      }));
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);

      // Check if error is due to missing search index
      if (message.includes("$vectorSearch") || message.includes("search index")) {
        throw new Error(
          `Failed to query vectors: Atlas Search index "${searchIndexName}" may not be ready or configured. ` +
            `Ensure Atlas Vector Search is enabled and the index is built. Original error: ${message}`,
        );
      }

      throw new Error(`Failed to query vectors: ${message}`);
    }
  }

  /**
   * Delete vectors from the index
   */
  async delete(
    indexName: string,
    options: VectorDeleteOptions,
  ): Promise<{ deletedCount: number }> {
    this.ensureInitialized();

    const metadata = await this.getIndexMetadata(indexName);
    const collectionName = metadata?.collectionName || this.getCollectionName(indexName);
    const { ids, filter, namespace, deleteAll } = options;

    try {
      const collection = this.db!.collection<VectorDocument>(collectionName);
      let deleteFilter: Record<string, unknown> = {};

      if (deleteAll) {
        // Delete all, optionally filtered by namespace
        if (namespace) {
          deleteFilter = { namespace };
        }
        // Empty filter deletes all
      } else if (ids && ids.length > 0) {
        // Delete by IDs
        deleteFilter = { _id: { $in: ids } };
      } else if (filter) {
        // Delete by metadata filter
        deleteFilter = this.translateFilter(filter);
      }

      const result = await collection.deleteMany(deleteFilter);

      logger.debug(`Deleted ${result.deletedCount} records from ${indexName}`);
      return { deletedCount: result.deletedCount };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to delete records: ${message}`);
    }
  }

  /**
   * Get index statistics
   */
  async getStats(indexName: string): Promise<VectorStoreStats> {
    this.ensureInitialized();

    const metadata = await this.getIndexMetadata(indexName);
    const collectionName = metadata?.collectionName || this.getCollectionName(indexName);

    try {
      const collection = this.db!.collection<VectorDocument>(collectionName);

      // Get vector count
      const vectorCount = await collection.countDocuments();

      // Get unique namespace count
      const namespaceResults = await collection
        .aggregate<{ count: number }>([
          { $match: { namespace: { $ne: null } } },
          { $group: { _id: "$namespace" } },
          { $count: "count" },
        ])
        .toArray();
      const namespaceCount = namespaceResults[0]?.count || 0;

      return {
        vectorCount,
        dimension: metadata?.dimension,
        namespaceCount,
        metrics: {
          metric: metadata?.metric || "cosine",
          collectionName,
        },
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to get stats for ${indexName}: ${message}`);
    }
  }

  /**
   * Translate abstract filter to MongoDB Query Language (MQL)
   */
  protected translateFilter<TMetadata extends UnknownRecord>(
    filter: MetadataFilter<TMetadata>,
  ): Record<string, unknown> {
    const conditions: Record<string, unknown>[] = [];

    for (const [key, value] of Object.entries(filter)) {
      if (key === "$and" && Array.isArray(value)) {
        const subConditions = value.map((f) =>
          this.translateFilter(f as MetadataFilter),
        );
        conditions.push({ $and: subConditions });
      } else if (key === "$or" && Array.isArray(value)) {
        const subConditions = value.map((f) =>
          this.translateFilter(f as MetadataFilter),
        );
        conditions.push({ $or: subConditions });
      } else if (key === "$not" && typeof value === "object" && value !== null) {
        const subFilter = this.translateFilter(value as MetadataFilter);
        // MongoDB uses $nor for negation of compound conditions
        conditions.push({ $nor: [subFilter] });
      } else if (this.isFieldFilter(value)) {
        const fieldCondition = this.translateFieldFilter(
          `metadata.${key}`,
          value as FieldFilter,
        );
        conditions.push(fieldCondition);
      } else {
        // Simple equality
        conditions.push({ [`metadata.${key}`]: value });
      }
    }

    if (conditions.length === 0) {
      return {};
    }

    if (conditions.length === 1) {
      return conditions[0];
    }

    return { $and: conditions };
  }

  // ===================
  // PRIVATE HELPER METHODS
  // ===================

  /**
   * Load MongoDB driver dynamically
   */
  private async loadMongoDriver(): Promise<{
    MongoClient: new (
      uri: string,
      options?: unknown,
    ) => MongoClient;
  }> {
    try {
      const modulePath = "mongodb";
      const module = await import(/* @vite-ignore */ modulePath);
      return { MongoClient: module.MongoClient };
    } catch {
      throw new Error(
        "MongoDB driver not found. Install mongodb: npm install mongodb",
      );
    }
  }

  /**
   * Load existing index metadata from database
   */
  private async loadIndexMetadata(): Promise<void> {
    try {
      const metadataCollection =
        this.db!.collection<IndexMetadata>(this.metadataCollectionName);
      const indexes = await metadataCollection.find({}).toArray();

      for (const index of indexes) {
        this.indexMetadataCache.set(index.name, index);
      }

      logger.debug(`Loaded ${indexes.length} index metadata entries`);
    } catch {
      // Collection may not exist yet
      logger.debug("No existing index metadata found");
    }
  }

  /**
   * Get index metadata (from cache or database)
   */
  private async getIndexMetadata(
    indexName: string,
  ): Promise<IndexMetadata | undefined> {
    if (this.indexMetadataCache.has(indexName)) {
      return this.indexMetadataCache.get(indexName);
    }

    try {
      const metadataCollection =
        this.db!.collection<IndexMetadata>(this.metadataCollectionName);
      const metadata = (
        await metadataCollection
          .find({ _id: indexName } as unknown)
          .toArray()
      )[0];

      if (metadata) {
        this.indexMetadataCache.set(indexName, metadata);
      }

      return metadata;
    } catch {
      return undefined;
    }
  }

  /**
   * Get collection name for an index
   */
  private getCollectionName(indexName: string): string {
    // Sanitize and prefix the collection name
    const sanitized = indexName.replace(/[^a-zA-Z0-9_]/g, "_");
    return `vectors_${sanitized}`;
  }

  /**
   * Get Atlas Search index name for an index
   */
  private getSearchIndexName(indexName: string): string {
    const prefix = this.config.indexPrefix || "vector_index";
    const sanitized = indexName.replace(/[^a-zA-Z0-9_]/g, "_");
    return `${prefix}_${sanitized}`;
  }

  /**
   * Map similarity metric to Atlas Vector Search format
   */
  private mapMetricToAtlas(metric: SimilarityMetric): string {
    switch (metric) {
      case "cosine":
        return "cosine";
      case "euclidean":
        return "euclidean";
      case "dotProduct":
        return "dotProduct";
      default:
        return "cosine";
    }
  }

  /**
   * Build pre-filter for $vectorSearch
   * Pre-filtering is more efficient than post-filtering
   */
  private buildPreFilter<TMetadata extends UnknownRecord>(
    filter?: MetadataFilter<TMetadata>,
    namespace?: string,
  ): Record<string, unknown> | undefined {
    const conditions: Record<string, unknown>[] = [];

    if (namespace) {
      conditions.push({ namespace });
    }

    if (filter) {
      const translatedFilter = this.translateFilter(filter);
      if (Object.keys(translatedFilter).length > 0) {
        conditions.push(translatedFilter);
      }
    }

    if (conditions.length === 0) {
      return undefined;
    }

    if (conditions.length === 1) {
      return conditions[0];
    }

    return { $and: conditions };
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
   * Translate a field filter to MongoDB query
   */
  private translateFieldFilter(
    path: string,
    filter: FieldFilter,
  ): Record<string, unknown> {
    const conditions: Record<string, unknown> = {};

    for (const [op, val] of Object.entries(filter)) {
      switch (op) {
        case "$eq":
          conditions[path] = val;
          break;
        case "$ne":
          conditions[path] = { $ne: val };
          break;
        case "$gt":
          conditions[path] = { ...(conditions[path] as Record<string, unknown> || {}), $gt: val };
          break;
        case "$gte":
          conditions[path] = { ...(conditions[path] as Record<string, unknown> || {}), $gte: val };
          break;
        case "$lt":
          conditions[path] = { ...(conditions[path] as Record<string, unknown> || {}), $lt: val };
          break;
        case "$lte":
          conditions[path] = { ...(conditions[path] as Record<string, unknown> || {}), $lte: val };
          break;
        case "$in":
          conditions[path] = { $in: val };
          break;
        case "$nin":
          conditions[path] = { $nin: val };
          break;
        case "$exists":
          conditions[path] = { $exists: val };
          break;
        case "$contains":
          // MongoDB uses $regex for string contains
          conditions[path] = { $regex: val, $options: "i" };
          break;
        case "$startsWith":
          conditions[path] = { $regex: `^${this.escapeRegex(String(val))}`, $options: "i" };
          break;
        case "$endsWith":
          conditions[path] = { $regex: `${this.escapeRegex(String(val))}$`, $options: "i" };
          break;
        default:
          // Unknown operator, treat as equality
          conditions[path] = val;
      }
    }

    // Combine multiple conditions for the same path
    if (Object.keys(conditions).length === 1) {
      return conditions;
    }

    // If we have multiple operators on the same path, merge them
    const pathConditions = conditions[path];
    if (pathConditions && typeof pathConditions === "object") {
      return { [path]: pathConditions };
    }

    return conditions;
  }

  /**
   * Escape special regex characters
   */
  private escapeRegex(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }
}
