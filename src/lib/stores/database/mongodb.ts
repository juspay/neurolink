/**
 * MongoDB Vector Search Store Implementation
 * Uses MongoDB Atlas Vector Search for similarity queries
 * @see https://www.mongodb.com/docs/atlas/atlas-vector-search/
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
import { translateToMongoDB } from "../filterTranslator.js";

// Types for MongoDB client (using dynamic import)
type MongoClient = {
  connect: () => Promise<void>;
  close: () => Promise<void>;
  db: (name?: string) => MongoDatabase;
};

type MongoDatabase = {
  collection: <T = Document>(name: string) => MongoCollection<T>;
  listCollections: (filter?: Record<string, unknown>) => {
    toArray: () => Promise<Array<{ name: string }>>;
  };
  createCollection: (name: string) => Promise<void>;
  command: (command: Record<string, unknown>) => Promise<unknown>;
};

type MongoCollection<T = Document> = {
  createIndex: (
    keys: Record<string, unknown>,
    options?: Record<string, unknown>,
  ) => Promise<string>;
  createSearchIndex: (
    definition: MongoSearchIndexDefinition,
  ) => Promise<string>;
  dropSearchIndex: (name: string) => Promise<void>;
  listSearchIndexes: (name?: string) => {
    toArray: () => Promise<MongoSearchIndex[]>;
  };
  insertMany: (
    docs: T[],
    options?: Record<string, unknown>,
  ) => Promise<{ insertedCount: number }>;
  updateOne: (
    filter: Record<string, unknown>,
    update: Record<string, unknown>,
    options?: Record<string, unknown>,
  ) => Promise<{ modifiedCount: number; matchedCount: number }>;
  bulkWrite: (
    operations: Array<{
      updateOne: {
        filter: Record<string, unknown>;
        update: Record<string, unknown>;
        upsert: boolean;
      };
    }>,
    options?: Record<string, unknown>,
  ) => Promise<{ upsertedCount: number; modifiedCount: number }>;
  deleteMany: (
    filter: Record<string, unknown>,
  ) => Promise<{ deletedCount: number }>;
  aggregate: <R = unknown>(
    pipeline: Record<string, unknown>[],
  ) => { toArray: () => Promise<R[]> };
  countDocuments: (filter?: Record<string, unknown>) => Promise<number>;
  drop: () => Promise<void>;
  findOne: (filter: Record<string, unknown>) => Promise<T | null>;
};

type Document = Record<string, unknown>;

type MongoSearchIndexDefinition = {
  name: string;
  type: "vectorSearch";
  definition: {
    fields: Array<{
      type: "vector";
      path: string;
      numDimensions: number;
      similarity: "cosine" | "euclidean" | "dotProduct";
    }>;
  };
};

type MongoSearchIndex = {
  name: string;
  type: string;
  status: string;
  queryable: boolean;
};

/**
 * MongoDB-specific configuration
 */
export type MongoDBConfig = VectorStoreConfig & {
  /** MongoDB connection string (required) */
  connectionString: string;
  /** Database name (required) */
  database: string;
  /** Collection name prefix (optional, default: "vectors_") */
  collectionPrefix?: string;
  /** Wait for index to be ready after creation (default: true) */
  waitForIndex?: boolean;
  /** Index wait timeout in ms (default: 60000) */
  indexWaitTimeout?: number;
};

/**
 * MongoDB Vector Search Store implementation
 */
export class MongoDBStore extends BaseVectorStore<MongoDBConfig> {
  private client: MongoClient | null = null;
  private db: MongoDatabase | null = null;
  private collectionPrefix: string;

  constructor(config: MongoDBConfig) {
    super(config, "mongodb" as VectorStoreName);
    this.collectionPrefix = config.collectionPrefix || "vectors_";
  }

  /**
   * Initialize connection to MongoDB
   */
  async connect(): Promise<void> {
    if (this.initialized) {
      return;
    }

    try {
      // Dynamically import MongoDB client
      const { MongoClient: MongoClientClass } = await import("mongodb");

      this.client = new MongoClientClass(
        this.config.connectionString,
      ) as unknown as MongoClient;

      await this.client.connect();
      this.db = this.client.db(this.config.database);

      // Verify connection
      await this.db.command({ ping: 1 });

      this.initialized = true;
      this.logInfo("Connected successfully", {
        database: this.config.database,
      });
    } catch (error) {
      this.logError("Failed to connect", error);
      throw new Error(
        `Failed to connect to MongoDB: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Disconnect from MongoDB
   */
  async disconnect(): Promise<void> {
    if (this.client) {
      await this.client.close();
      this.client = null;
      this.db = null;
    }
    this.initialized = false;
    this.logInfo("Disconnected");
  }

  /**
   * Create a new collection with vector search index
   */
  async createIndex(config: VectorIndexConfig): Promise<void> {
    this.ensureInitialized();

    const collectionName = this.getCollectionName(config.name);
    const metric = config.metric || "cosine";
    const searchIndexName = `${config.name}_vector_index`;

    // Create collection if it doesn't exist
    try {
      await this.db!.createCollection(collectionName);
      this.logInfo(`Collection created: ${collectionName}`);
    } catch (error) {
      // Collection might already exist
      if (
        !(error instanceof Error) ||
        !error.message.includes("already exists")
      ) {
        throw error;
      }
    }

    const collection = this.db!.collection(collectionName);

    // Create a compound index on _id for efficient lookups
    await collection.createIndex({ _id: 1 });

    // Create vector search index
    // Note: This requires MongoDB Atlas with Vector Search enabled
    const indexDefinition: MongoSearchIndexDefinition = {
      name: searchIndexName,
      type: "vectorSearch",
      definition: {
        fields: [
          {
            type: "vector",
            path: "embedding",
            numDimensions: config.dimension,
            similarity: this.mapMetric(metric),
          },
        ],
      },
    };

    try {
      await collection.createSearchIndex(indexDefinition);
      this.logInfo(`Vector search index created: ${searchIndexName}`, {
        dimension: config.dimension,
        metric,
      });

      // Wait for index to be queryable
      if (this.config.waitForIndex !== false) {
        await this.waitForIndexReady(
          collectionName,
          searchIndexName,
          this.config.indexWaitTimeout || 60000,
        );
      }
    } catch (error) {
      // Index might already exist
      if (
        !(error instanceof Error) ||
        !error.message.includes("already exists")
      ) {
        throw error;
      }
      this.logInfo(`Vector search index already exists: ${searchIndexName}`);
    }
  }

  /**
   * Wait for vector search index to be ready
   */
  private async waitForIndexReady(
    collectionName: string,
    indexName: string,
    timeoutMs: number,
  ): Promise<void> {
    const startTime = Date.now();
    const pollInterval = 1000;

    while (Date.now() - startTime < timeoutMs) {
      try {
        const collection = this.db!.collection(collectionName);
        const indexes = await collection.listSearchIndexes(indexName).toArray();

        const index = indexes.find((idx) => idx.name === indexName);
        if (index && index.queryable) {
          this.logDebug(`Vector search index ${indexName} is ready`);
          return;
        }

        this.logDebug(
          `Waiting for index ${indexName} to be ready (status: ${index?.status || "not found"})`,
        );
      } catch {
        // Index might not be accessible yet
      }

      await new Promise((resolve) => setTimeout(resolve, pollInterval));
    }

    this.logInfo(
      `Index readiness check timed out after ${timeoutMs}ms, proceeding anyway`,
    );
  }

  /**
   * Delete a collection and its indexes
   */
  async deleteIndex(indexName: string): Promise<void> {
    this.ensureInitialized();

    const collectionName = this.getCollectionName(indexName);
    const collection = this.db!.collection(collectionName);

    // Drop the vector search index first
    try {
      await collection.dropSearchIndex(`${indexName}_vector_index`);
    } catch {
      // Index might not exist
    }

    // Drop the collection
    await collection.drop();
    this.logInfo(`Collection deleted: ${collectionName}`);
  }

  /**
   * List all vector collections
   */
  async listIndexes(): Promise<string[]> {
    this.ensureInitialized();

    const collections = await this.db!.listCollections().toArray();

    return collections
      .filter((c) => c.name.startsWith(this.collectionPrefix))
      .map((c) => c.name.replace(this.collectionPrefix, ""));
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

    const collectionName = this.getCollectionName(indexName);
    const collection = this.db!.collection(collectionName);
    const batchSize = options?.batchSize || 1000;
    let totalUpserted = 0;

    // Process in batches
    for (let i = 0; i < records.length; i += batchSize) {
      const batch = records.slice(i, i + batchSize);

      const operations = batch.map((record) => ({
        updateOne: {
          filter: { _id: record.id },
          update: {
            $set: {
              _id: record.id,
              embedding: record.vector,
              content: record.content || null,
              metadata: record.metadata || {},
              updatedAt: new Date(),
            },
            $setOnInsert: {
              createdAt: new Date(),
            },
          },
          upsert: true,
        },
      }));

      const result = await collection.bulkWrite(operations, { ordered: false });
      totalUpserted += result.upsertedCount + result.modifiedCount;

      this.logDebug(`Upserted batch: ${totalUpserted}/${records.length}`);
    }

    return { upsertedCount: totalUpserted };
  }

  /**
   * Query vectors using MongoDB Atlas Vector Search
   */
  async query<TMetadata extends UnknownRecord = UnknownRecord>(
    indexName: string,
    options: VectorQueryOptions<TMetadata>,
  ): Promise<VectorQueryResult<TMetadata>[]> {
    this.ensureInitialized();

    const collectionName = this.getCollectionName(indexName);
    const collection = this.db!.collection(collectionName);
    const searchIndexName = `${indexName}_vector_index`;

    // Build the $vectorSearch stage
    const vectorSearchStage: Record<string, unknown> = {
      index: searchIndexName,
      path: "embedding",
      queryVector: options.vector,
      numCandidates: options.topK * 10, // Increase candidates for better recall
      limit: options.topK,
    };

    // Add filter if provided
    if (options.filter) {
      vectorSearchStage.filter = translateToMongoDB(options.filter);
    }

    const pipeline: Record<string, unknown>[] = [
      { $vectorSearch: vectorSearchStage },
      {
        $addFields: {
          score: { $meta: "vectorSearchScore" },
        },
      },
    ];

    // Add score filter if minScore is specified
    if (options.minScore) {
      pipeline.push({
        $match: { score: { $gte: options.minScore } },
      });
    }

    // Project the fields we need
    const projection: Record<string, number> = {
      _id: 1,
      score: 1,
      content: 1,
      metadata: 1,
    };

    if (options.includeVectors) {
      projection.embedding = 1;
    }

    pipeline.push({ $project: projection });

    // Define result type for the aggregation query
    type AggregationResult = {
      _id: string;
      score: number;
      embedding?: number[];
      metadata?: Record<string, unknown>;
      content?: string;
    };

    const results = await collection
      .aggregate<AggregationResult>(pipeline)
      .toArray();

    return results.map((doc: AggregationResult) => ({
      id: String(doc._id),
      score: doc.score,
      vector: options.includeVectors ? doc.embedding : undefined,
      metadata: (doc.metadata || {}) as TMetadata,
      content: doc.content,
    }));
  }

  /**
   * Delete vectors
   */
  async delete(
    indexName: string,
    options: VectorDeleteOptions,
  ): Promise<VectorDeleteResult> {
    this.ensureInitialized();

    const collectionName = this.getCollectionName(indexName);
    const collection = this.db!.collection(collectionName);

    if (options.deleteAll) {
      const result = await collection.deleteMany({});
      return { deletedCount: result.deletedCount, acknowledged: true };
    }

    if (options.ids && options.ids.length > 0) {
      const result = await collection.deleteMany({
        _id: { $in: options.ids },
      });
      return { deletedCount: result.deletedCount, acknowledged: true };
    }

    if (options.filter) {
      const mongoFilter = translateToMongoDB(options.filter);
      const result = await collection.deleteMany(mongoFilter);
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

    const collectionName = this.getCollectionName(indexName);
    const collection = this.db!.collection(collectionName);

    const updateDoc: Record<string, unknown> = {
      updatedAt: new Date(),
    };

    if (update.vector) {
      updateDoc.embedding = update.vector;
    }

    if (update.metadata) {
      updateDoc.metadata = update.metadata;
    }

    const result = await collection.updateOne({ _id: id }, { $set: updateDoc });

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

    const collectionName = this.getCollectionName(indexName);
    const collection = this.db!.collection(collectionName);

    const count = await collection.countDocuments();

    // Try to get dimension from a sample document
    let dimension: number | undefined;
    const sample = await collection.findOne({});
    if (sample && Array.isArray(sample.embedding)) {
      dimension = sample.embedding.length;
    }

    return {
      vectorCount: count,
      dimension,
    };
  }

  /**
   * Translate filter to MongoDB format
   */
  protected translateFilter<TMetadata extends UnknownRecord>(
    filter: MetadataFilter<TMetadata>,
  ): unknown {
    return translateToMongoDB(filter);
  }

  /**
   * Get full collection name with prefix
   */
  private getCollectionName(indexName: string): string {
    return `${this.collectionPrefix}${indexName}`;
  }

  /**
   * Map similarity metric to MongoDB format
   */
  private mapMetric(
    metric: SimilarityMetric,
  ): "cosine" | "euclidean" | "dotProduct" {
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
}
