/**
 * Couchbase Vector Store Implementation
 * Enterprise-grade NoSQL database with built-in vector search capabilities
 * @see https://docs.couchbase.com/server/current/vector-search/vector-search.html
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
import { translateToCouchbase } from "../filterTranslator.js";

// Types for Couchbase client (using dynamic import)
type CouchbaseCluster = {
  bucket: (name: string) => CouchbaseBucket;
  query: (
    statement: string,
    options?: { parameters?: unknown[] },
  ) => Promise<{ rows: unknown[] }>;
  searchQuery: (
    indexName: string,
    query: CouchbaseSearchQuery,
    options?: CouchbaseSearchOptions,
  ) => Promise<CouchbaseSearchResult>;
  close: () => Promise<void>;
};

type CouchbaseBucket = {
  scope: (name: string) => CouchbaseScope;
  defaultScope: () => CouchbaseScope;
  collections: () => CouchbaseCollectionManager;
};

type CouchbaseScope = {
  collection: (name: string) => CouchbaseCollection;
  searchIndexes: () => CouchbaseSearchIndexManager;
};

type CouchbaseCollection = {
  get: (id: string) => Promise<{ content: unknown }>;
  upsert: (id: string, content: unknown) => Promise<void>;
  remove: (id: string) => Promise<void>;
  exists: (id: string) => Promise<{ exists: boolean }>;
};

type CouchbaseCollectionManager = {
  getAllScopes: () => Promise<
    Array<{
      name: string;
      collections: Array<{ name: string }>;
    }>
  >;
  createCollection: (spec: {
    name: string;
    scopeName: string;
  }) => Promise<void>;
  dropCollection: (name: string, scopeName: string) => Promise<void>;
};

type CouchbaseSearchIndexManager = {
  getAllIndexes: () => Promise<Array<{ name: string }>>;
  upsertIndex: (index: CouchbaseSearchIndex) => Promise<void>;
  dropIndex: (name: string) => Promise<void>;
  getIndex: (name: string) => Promise<CouchbaseSearchIndex>;
};

type CouchbaseSearchIndex = {
  name: string;
  sourceName: string;
  type: string;
  params: {
    mapping: {
      types: Record<
        string,
        {
          properties: Record<string, CouchbaseFieldMapping>;
        }
      >;
    };
  };
};

type CouchbaseFieldMapping = {
  fields?: Array<{
    name: string;
    type: string;
    dims?: number;
    similarity?: string;
    index?: boolean;
    store?: boolean;
  }>;
};

type CouchbaseSearchQuery = {
  query?: Record<string, unknown>;
  knn?: Array<{
    field: string;
    vector: number[];
    k: number;
  }>;
};

type CouchbaseSearchOptions = {
  limit?: number;
  fields?: string[];
  includeLocations?: boolean;
};

type CouchbaseSearchResult = {
  rows: Array<{
    id: string;
    score: number;
    fields?: Record<string, unknown>;
  }>;
  meta: {
    metrics?: {
      totalRows?: number;
    };
  };
};

/**
 * Couchbase-specific configuration
 */
export type CouchbaseConfig = VectorStoreConfig & {
  /** Couchbase connection string (required) */
  connectionString: string;
  /** Username for authentication (required) */
  username: string;
  /** Password for authentication (required) */
  password: string;
  /** Bucket name (required) */
  bucketName: string;
  /** Scope name (default: "_default") */
  scopeName?: string;
  /** Collection name for vectors (default: "vectors") */
  collectionName?: string;
  /** Search index name prefix (default: "vector_idx") */
  indexPrefix?: string;
  /** Vector field name in documents (default: "embedding") */
  vectorFieldName?: string;
};

/**
 * Couchbase Vector Store implementation
 */
export class CouchbaseStore extends BaseVectorStore<CouchbaseConfig> {
  private cluster: CouchbaseCluster | null = null;
  private bucket: CouchbaseBucket | null = null;
  private scope: CouchbaseScope | null = null;
  private collection: CouchbaseCollection | null = null;
  private searchIndexManager: CouchbaseSearchIndexManager | null = null;
  private readonly scopeName: string;
  private readonly collectionName: string;
  private readonly indexPrefix: string;
  private readonly vectorFieldName: string;

  constructor(config: CouchbaseConfig) {
    super(config, "couchbase" as VectorStoreName);
    this.scopeName = config.scopeName || "_default";
    this.collectionName = config.collectionName || "vectors";
    this.indexPrefix = config.indexPrefix || "vector_idx";
    this.vectorFieldName = config.vectorFieldName || "embedding";
  }

  /**
   * Initialize connection to Couchbase
   */
  async connect(): Promise<void> {
    if (this.initialized) {
      return;
    }

    try {
      // Dynamically import Couchbase client
      const couchbase = await import("couchbase");

      this.cluster = (await couchbase.connect(this.config.connectionString, {
        username: this.config.username,
        password: this.config.password,
      })) as unknown as CouchbaseCluster;

      this.bucket = this.cluster.bucket(this.config.bucketName);
      this.scope = this.bucket.scope(this.scopeName);
      this.collection = this.scope.collection(this.collectionName);
      this.searchIndexManager = this.scope.searchIndexes();

      this.initialized = true;
      this.logInfo("Connected successfully", {
        bucket: this.config.bucketName,
        scope: this.scopeName,
      });
    } catch (error) {
      this.logError("Failed to connect", error);
      throw new Error(
        `Failed to connect to Couchbase: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Disconnect from Couchbase
   */
  async disconnect(): Promise<void> {
    if (this.cluster) {
      await this.cluster.close();
    }
    this.cluster = null;
    this.bucket = null;
    this.scope = null;
    this.collection = null;
    this.searchIndexManager = null;
    this.initialized = false;
    this.logInfo("Disconnected");
  }

  /**
   * Create a new vector search index
   */
  async createIndex(config: VectorIndexConfig): Promise<void> {
    this.ensureInitialized();

    const indexName = `${this.indexPrefix}_${config.name}`;
    const similarity = this.mapMetric(config.metric || "cosine");

    const searchIndex: CouchbaseSearchIndex = {
      name: indexName,
      sourceName: this.config.bucketName,
      type: "fulltext-index",
      params: {
        mapping: {
          types: {
            [`${this.scopeName}.${this.collectionName}`]: {
              properties: {
                [this.vectorFieldName]: {
                  fields: [
                    {
                      name: this.vectorFieldName,
                      type: "vector",
                      dims: config.dimension,
                      similarity,
                      index: true,
                      store: true,
                    },
                  ],
                },
                metadata: {
                  fields: [
                    {
                      name: "metadata",
                      type: "text",
                      index: true,
                      store: true,
                    },
                  ],
                },
                content: {
                  fields: [
                    {
                      name: "content",
                      type: "text",
                      index: true,
                      store: true,
                    },
                  ],
                },
                indexName: {
                  fields: [
                    {
                      name: "indexName",
                      type: "text",
                      index: true,
                      store: true,
                    },
                  ],
                },
              },
            },
          },
        },
      },
    };

    await this.searchIndexManager!.upsertIndex(searchIndex);

    this.logInfo(`Vector search index created: ${indexName}`, {
      dimension: config.dimension,
      similarity,
    });

    // Wait for index to be ready
    await this.waitForIndexReady(indexName);
  }

  /**
   * Delete a vector search index
   */
  async deleteIndex(indexName: string): Promise<void> {
    this.ensureInitialized();

    const fullIndexName = indexName.startsWith(this.indexPrefix)
      ? indexName
      : `${this.indexPrefix}_${indexName}`;

    await this.searchIndexManager!.dropIndex(fullIndexName);

    // Also delete all vectors associated with this index
    const deleteQuery = `
      DELETE FROM \`${this.config.bucketName}\`.\`${this.scopeName}\`.\`${this.collectionName}\`
      WHERE indexName = $1
    `;
    await this.cluster!.query(deleteQuery, { parameters: [indexName] });

    this.logInfo(`Vector search index deleted: ${fullIndexName}`);
  }

  /**
   * List all vector search indexes
   */
  async listIndexes(): Promise<string[]> {
    this.ensureInitialized();

    const indexes = await this.searchIndexManager!.getAllIndexes();
    return indexes
      .map((idx) => idx.name)
      .filter((name) => name.startsWith(this.indexPrefix))
      .map((name) => name.replace(`${this.indexPrefix}_`, ""));
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

    const batchSize = options?.batchSize || 100;
    let totalUpserted = 0;

    // Process in batches
    for (let i = 0; i < records.length; i += batchSize) {
      const batch = records.slice(i, i + batchSize);

      // Upsert each record
      const upsertPromises = batch.map((record) => {
        const document = {
          [this.vectorFieldName]: record.vector,
          metadata: record.metadata || {},
          content: record.content,
          indexName,
          namespace: options?.namespace,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        return this.collection!.upsert(record.id, document);
      });

      await Promise.all(upsertPromises);
      totalUpserted += batch.length;

      this.logDebug(`Upserted batch: ${totalUpserted}/${records.length}`);
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

    const fullIndexName = `${this.indexPrefix}_${indexName}`;

    // Build the search query with kNN
    const searchQuery: CouchbaseSearchQuery = {
      knn: [
        {
          field: this.vectorFieldName,
          vector: options.vector,
          k: options.topK,
        },
      ],
    };

    // Add filter if provided
    // Note: Couchbase FTS uses a different query format than N1QL
    // For vector search with filters, we use a match query on metadata
    if (options.filter) {
      // Build a conjunction query for FTS
      searchQuery.query = this.buildFtsFilter(options.filter);
    }

    const searchOptions: CouchbaseSearchOptions = {
      limit: options.topK,
      fields: options.includeMetadata !== false ? ["*"] : undefined,
    };

    const result = await this.cluster!.searchQuery(
      fullIndexName,
      searchQuery,
      searchOptions,
    );

    // Fetch full documents for results
    const queryResults: VectorQueryResult<TMetadata>[] = [];

    for (const row of result.rows) {
      // Apply minScore filter
      if (options.minScore && row.score < options.minScore) {
        continue;
      }

      try {
        const doc = await this.collection!.get(row.id);
        const content = doc.content as Record<string, unknown>;

        queryResults.push({
          id: row.id,
          score: row.score,
          vector: options.includeVectors
            ? (content[this.vectorFieldName] as number[])
            : undefined,
          metadata: content.metadata as TMetadata,
          content: content.content as string | undefined,
        });
      } catch {
        // Document might have been deleted
        this.logDebug(`Failed to fetch document: ${row.id}`);
      }
    }

    return queryResults;
  }

  /**
   * Delete vectors
   */
  async delete(
    indexName: string,
    options: VectorDeleteOptions,
  ): Promise<VectorDeleteResult> {
    this.ensureInitialized();

    if (options.deleteAll) {
      // Delete all vectors for this index
      const deleteQuery = `
        DELETE FROM \`${this.config.bucketName}\`.\`${this.scopeName}\`.\`${this.collectionName}\`
        WHERE indexName = $1
        ${options.namespace ? "AND namespace = $2" : ""}
      `;
      const params = options.namespace
        ? [indexName, options.namespace]
        : [indexName];
      await this.cluster!.query(deleteQuery, { parameters: params });
      return { deletedCount: undefined, acknowledged: true };
    }

    if (options.ids && options.ids.length > 0) {
      // Delete specific IDs
      const deletePromises = options.ids.map((id) =>
        this.collection!.remove(id).catch(() => {
          // Ignore not found errors
        }),
      );
      await Promise.all(deletePromises);
      return { deletedCount: options.ids.length, acknowledged: true };
    }

    if (options.filter) {
      // Delete by filter using N1QL with parameterized query
      const filterResult = translateToCouchbase(options.filter, 2);
      const deleteQuery = `
        DELETE FROM \`${this.config.bucketName}\`.\`${this.scopeName}\`.\`${this.collectionName}\`
        WHERE indexName = $1 AND ${filterResult.sql}
      `;
      await this.cluster!.query(deleteQuery, {
        parameters: [indexName, ...filterResult.params],
      });
      return { deletedCount: undefined, acknowledged: true };
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
      return;
    }

    // Get existing document
    const existingDoc = await this.collection!.get(id);
    const content = existingDoc.content as Record<string, unknown>;

    // Merge updates
    const updatedDocument = {
      ...content,
      ...(update.vector && { [this.vectorFieldName]: update.vector }),
      ...(update.metadata && {
        metadata: { ...(content.metadata as object), ...update.metadata },
      }),
      updatedAt: new Date().toISOString(),
    };

    await this.collection!.upsert(id, updatedDocument);
    this.logDebug(`Updated vector: ${id}`);
  }

  /**
   * Get index statistics
   */
  async getStats(indexName: string): Promise<VectorStoreStats> {
    this.ensureInitialized();

    // Count documents for this index
    const countQuery = `
      SELECT COUNT(*) as count
      FROM \`${this.config.bucketName}\`.\`${this.scopeName}\`.\`${this.collectionName}\`
      WHERE indexName = $1
    `;
    const result = await this.cluster!.query(countQuery, {
      parameters: [indexName],
    });
    const vectorCount = (result.rows[0] as { count: number })?.count || 0;

    // Get index info
    const fullIndexName = `${this.indexPrefix}_${indexName}`;
    let dimension: number | undefined;
    try {
      const indexInfo = await this.searchIndexManager!.getIndex(fullIndexName);
      const mapping = Object.values(indexInfo.params.mapping.types)[0];
      const vectorField =
        mapping?.properties[this.vectorFieldName]?.fields?.[0];
      dimension = vectorField?.dims;
    } catch {
      // Index might not exist yet
    }

    return {
      vectorCount,
      dimension,
      metrics: {
        bucket: this.config.bucketName,
        scope: this.scopeName,
        collection: this.collectionName,
        indexName: fullIndexName,
      },
    };
  }

  /**
   * Translate filter to Couchbase format
   */
  protected translateFilter<TMetadata extends UnknownRecord>(
    filter: MetadataFilter<TMetadata>,
  ): unknown {
    return translateToCouchbase(filter);
  }

  /**
   * Map similarity metric to Couchbase format
   */
  private mapMetric(metric: SimilarityMetric): string {
    switch (metric) {
      case "cosine":
        return "dot_product"; // Couchbase uses dot_product for normalized vectors
      case "euclidean":
        return "l2_norm";
      case "dotProduct":
        return "dot_product";
      default:
        return "dot_product";
    }
  }

  /**
   * Build FTS filter from metadata filter for Couchbase search queries
   * @see https://docs.couchbase.com/server/current/fts/fts-searching-with-the-rest-api.html
   */
  private buildFtsFilter(filter: MetadataFilter): Record<string, unknown> {
    const conjuncts: Array<Record<string, unknown>> = [];

    for (const [key, value] of Object.entries(filter)) {
      if (key === "$and") {
        const subFilters = (value as MetadataFilter[]).map((f) =>
          this.buildFtsFilter(f),
        );
        conjuncts.push({ conjuncts: subFilters });
      } else if (key === "$or") {
        const subFilters = (value as MetadataFilter[]).map((f) =>
          this.buildFtsFilter(f),
        );
        conjuncts.push({ disjuncts: subFilters, min: 1 });
      } else if (key === "$not") {
        const subFilter = this.buildFtsFilter(value as MetadataFilter);
        conjuncts.push({ must_not: subFilter });
      } else if (typeof value === "object" && value !== null) {
        // Field filter
        const fieldFilter = value as Record<string, unknown>;
        for (const [op, val] of Object.entries(fieldFilter)) {
          conjuncts.push(
            this.buildFtsFieldCondition(`metadata.${key}`, op, val),
          );
        }
      } else {
        // Simple equality
        conjuncts.push({
          field: `metadata.${key}`,
          match: String(value),
        });
      }
    }

    if (conjuncts.length === 1) {
      return conjuncts[0];
    }
    return { conjuncts };
  }

  /**
   * Build a single FTS field condition
   */
  private buildFtsFieldCondition(
    field: string,
    op: string,
    value: unknown,
  ): Record<string, unknown> {
    switch (op) {
      case "$eq":
        return { field, match: String(value) };
      case "$ne":
        return { must_not: { field, match: String(value) } };
      case "$gt":
        return { field, min: value, inclusive_min: false };
      case "$gte":
        return { field, min: value, inclusive_min: true };
      case "$lt":
        return { field, max: value, inclusive_max: false };
      case "$lte":
        return { field, max: value, inclusive_max: true };
      case "$in":
        if (Array.isArray(value)) {
          return {
            disjuncts: value.map((v) => ({ field, match: String(v) })),
            min: 1,
          };
        }
        return { field, match: String(value) };
      case "$nin":
        if (Array.isArray(value)) {
          return {
            must_not: {
              disjuncts: value.map((v) => ({ field, match: String(v) })),
              min: 1,
            },
          };
        }
        return { must_not: { field, match: String(value) } };
      case "$contains":
        return { field, match: `*${value}*` };
      default:
        return { field, match: String(value) };
    }
  }

  /**
   * Wait for search index to be ready
   */
  private async waitForIndexReady(
    indexName: string,
    maxWaitMs: number = 60000,
  ): Promise<void> {
    const startTime = Date.now();
    const pollInterval = 2000;

    while (Date.now() - startTime < maxWaitMs) {
      try {
        await this.searchIndexManager!.getIndex(indexName);
        this.logDebug(`Index ${indexName} is ready`);
        return;
      } catch {
        // Index not ready yet
      }
      await new Promise((resolve) => setTimeout(resolve, pollInterval));
    }

    this.logInfo(
      `Index ${indexName} readiness check timed out after ${maxWaitMs}ms, proceeding anyway`,
    );
  }
}
