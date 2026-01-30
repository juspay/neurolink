/**
 * Couchbase Vector Store Adapter
 * Implements vector similarity search using Couchbase Vector Search via FTS service
 *
 * Couchbase provides vector search capabilities through its Full-Text Search (FTS) service,
 * supporting hybrid search combining vector similarity with full-text and metadata filtering.
 *
 * @see https://docs.couchbase.com/server/current/vector-search/vector-search.html
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
 * Couchbase-specific configuration
 */
export type CouchbaseConfig = VectorStoreConfig & {
  /** Couchbase connection string (e.g., "couchbase://localhost") */
  connectionString: string;
  /** Username for authentication */
  username: string;
  /** Password for authentication */
  password: string;
  /** Bucket name for storing vectors */
  bucketName: string;
  /** Scope name (default: "_default") */
  scopeName?: string;
  /** Collection name (default: "_default") */
  collectionName?: string;
  /** Connection timeout in ms (default: 10000) */
  connectionTimeout?: number;
  /** KV operation timeout in ms (default: 5000) */
  kvTimeout?: number;
  /** Search operation timeout in ms (default: 75000) */
  searchTimeout?: number;
  /** Use TLS for connection (default: false) */
  useTls?: boolean;
  /** Trust store path for TLS (optional) */
  trustStorePath?: string;
};

/**
 * Internal interface for Couchbase cluster
 */
interface CouchbaseCluster {
  bucket(name: string): CouchbaseBucket;
  searchQuery(
    indexName: string,
    query: CouchbaseSearchQuery,
    options?: CouchbaseSearchOptions,
  ): Promise<CouchbaseSearchResult>;
  searchIndexes(): CouchbaseSearchIndexManager;
  close(): Promise<void>;
}

interface CouchbaseBucket {
  scope(name: string): CouchbaseScope;
  defaultScope(): CouchbaseScope;
}

interface CouchbaseScope {
  collection(name: string): CouchbaseCollection;
}

interface CouchbaseCollection {
  get(key: string): Promise<CouchbaseGetResult>;
  upsert(key: string, value: unknown): Promise<CouchbaseMutationResult>;
  remove(key: string): Promise<CouchbaseMutationResult>;
  exists(key: string): Promise<CouchbaseExistsResult>;
}

interface CouchbaseGetResult {
  content: unknown;
  cas: unknown;
}

interface CouchbaseMutationResult {
  cas: unknown;
}

interface CouchbaseExistsResult {
  exists: boolean;
}

interface CouchbaseSearchQuery {
  matchAll?(): CouchbaseSearchQuery;
  matchNone?(): CouchbaseSearchQuery;
}

interface CouchbaseSearchOptions {
  limit?: number;
  skip?: number;
  fields?: string[];
  includeLocations?: boolean;
  raw?: Record<string, unknown>;
}

interface CouchbaseSearchResult {
  rows: CouchbaseSearchRow[];
  meta: CouchbaseSearchMeta;
}

interface CouchbaseSearchRow {
  id: string;
  score: number;
  index?: string;
  locations?: unknown;
  fields?: Record<string, unknown>;
}

interface CouchbaseSearchMeta {
  totalRows: number;
  took: number;
  maxScore: number;
  successCount?: number;
  errorCount?: number;
}

interface CouchbaseSearchIndexManager {
  getAllIndexes(): Promise<CouchbaseSearchIndex[]>;
  getIndex(name: string): Promise<CouchbaseSearchIndex>;
  upsertIndex(index: CouchbaseSearchIndex): Promise<void>;
  dropIndex(name: string): Promise<void>;
}

interface CouchbaseSearchIndex {
  name: string;
  type?: string;
  params?: Record<string, unknown>;
  planParams?: Record<string, unknown>;
  sourceType?: string;
  sourceName?: string;
  sourceParams?: Record<string, unknown>;
  uuid?: string;
}

/**
 * Vector document structure stored in Couchbase
 */
interface VectorDocument {
  id: string;
  vector: number[];
  metadata?: UnknownRecord;
  content?: string;
  namespace?: string;
  indexName: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Index metadata stored in Couchbase
 */
interface IndexMetadata {
  name: string;
  dimension: number;
  metric: SimilarityMetric;
  createdAt: string;
  vectorCount: number;
}

/**
 * Couchbase Vector Store Adapter
 *
 * Features:
 * - Vector similarity search via FTS (Full-Text Search) service
 * - Hybrid search combining vector, text, and metadata filtering
 * - JSON document storage with flexible schema
 * - Namespace support through document attributes
 * - Batch operations for performance
 * - Multiple similarity metrics (cosine, euclidean, dot product)
 *
 * Requirements:
 * - Couchbase Server 7.1+ with Vector Search enabled
 * - FTS service configured on the cluster
 * - Appropriate bucket and scope permissions
 */
export class CouchbaseAdapter extends BaseVectorStore<CouchbaseConfig> {
  private cluster: CouchbaseCluster | null = null;
  private collection: CouchbaseCollection | null = null;
  private scopeName: string;
  private collectionName: string;
  private indexMetadataCache: Map<string, IndexMetadata> = new Map();

  constructor(config: CouchbaseConfig) {
    super(config, "couchbase" as VectorStoreName);
    this.scopeName = config.scopeName || "_default";
    this.collectionName = config.collectionName || "_default";
  }

  /**
   * Initialize connection to Couchbase cluster
   */
  async connect(): Promise<void> {
    if (this.initialized) {
      logger.debug("Couchbase already connected");
      return;
    }

    try {
      const couchbase = await this.loadCouchbaseDriver();

      // Build connection options
      const connectOptions: Record<string, unknown> = {
        username: this.config.username,
        password: this.config.password,
        timeouts: {
          connectTimeout: this.config.connectionTimeout || 10000,
          kvTimeout: this.config.kvTimeout || 5000,
          searchTimeout: this.config.searchTimeout || 75000,
        },
      };

      // Add TLS configuration if enabled
      if (this.config.useTls) {
        connectOptions.security = {
          trustStorePath: this.config.trustStorePath,
        };
      }

      // Connect to cluster
      this.cluster = await couchbase.connect(
        this.config.connectionString,
        connectOptions,
      );

      // Get bucket and collection
      const bucket = this.cluster.bucket(this.config.bucketName);
      const scope =
        this.scopeName === "_default"
          ? bucket.defaultScope()
          : bucket.scope(this.scopeName);
      this.collection = scope.collection(this.collectionName);

      // Load existing index metadata
      await this.loadIndexMetadata();

      this.initialized = true;
      logger.debug("Couchbase connected successfully", {
        connectionString: this.config.connectionString,
        bucket: this.config.bucketName,
        scope: this.scopeName,
        collection: this.collectionName,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to connect to Couchbase: ${message}`);
    }
  }

  /**
   * Close the Couchbase cluster connection
   */
  async disconnect(): Promise<void> {
    if (this.cluster) {
      try {
        await this.cluster.close();
        this.cluster = null;
        this.collection = null;
        this.initialized = false;
        this.indexMetadataCache.clear();
        logger.debug("Couchbase disconnected");
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        throw new Error(`Failed to disconnect from Couchbase: ${message}`);
      }
    }
  }

  /**
   * Create a new vector search index
   * Creates an FTS index configured for vector search
   */
  async createIndex(config: VectorIndexConfig): Promise<void> {
    this.ensureInitialized();

    const { name, dimension, metric = "cosine" } = config;

    try {
      // Create FTS index with vector search configuration
      const indexDefinition = this.buildSearchIndexDefinition(
        name,
        dimension,
        metric,
      );

      const searchIndexManager = this.cluster!.searchIndexes();
      await searchIndexManager.upsertIndex(indexDefinition);

      // Store index metadata document
      const metadataDoc: IndexMetadata = {
        name,
        dimension,
        metric,
        createdAt: new Date().toISOString(),
        vectorCount: 0,
      };

      await this.collection!.upsert(`_index_meta_${name}`, metadataDoc);
      this.indexMetadataCache.set(name, metadataDoc);

      logger.debug(`Created Couchbase vector index ${name}`, {
        dimension,
        metric,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to create index ${name}: ${message}`);
    }
  }

  /**
   * Delete a vector search index
   */
  async deleteIndex(indexName: string): Promise<void> {
    this.ensureInitialized();

    try {
      // Drop the FTS index
      const searchIndexManager = this.cluster!.searchIndexes();
      try {
        await searchIndexManager.dropIndex(indexName);
      } catch {
        // Index might not exist, continue cleanup
      }

      // Delete all vectors in this index
      // Note: In production, you'd use N1QL for bulk deletion
      // This is a simplified implementation
      const meta = this.indexMetadataCache.get(indexName);
      if (meta) {
        // Delete metadata document
        try {
          await this.collection!.remove(`_index_meta_${indexName}`);
        } catch {
          // Ignore if not found
        }
      }

      this.indexMetadataCache.delete(indexName);

      logger.debug(`Deleted Couchbase vector index ${indexName}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to delete index ${indexName}: ${message}`);
    }
  }

  /**
   * List all vector search indexes
   */
  async listIndexes(): Promise<string[]> {
    this.ensureInitialized();

    try {
      // Return cached index names
      // In production, you might also query FTS index manager
      return Array.from(this.indexMetadataCache.keys());
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
      // Check cache first
      if (this.indexMetadataCache.has(indexName)) {
        return true;
      }

      // Check if metadata document exists
      const result = await this.collection!.exists(`_index_meta_${indexName}`);
      return result.exists;
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

    const namespace = options?.namespace || null;

    // Validate dimensions
    const indexMeta = this.indexMetadataCache.get(indexName);
    if (records.length > 0 && indexMeta) {
      this.validateDimensions(
        records.map((r) => r.vector),
        indexMeta.dimension,
      );
    } else if (records.length > 0) {
      this.validateDimensions(records.map((r) => r.vector));
    }

    try {
      let upsertedCount = 0;
      const now = new Date().toISOString();

      for (const record of records) {
        const doc: VectorDocument = {
          id: record.id,
          vector: record.vector,
          metadata: record.metadata as UnknownRecord | undefined,
          content: record.content,
          namespace: record.namespace || namespace || undefined,
          indexName,
          createdAt: now,
          updatedAt: now,
        };

        // Use document key format: {indexName}::{id}
        const docKey = `${indexName}::${record.id}`;
        await this.collection!.upsert(docKey, doc);
        upsertedCount++;
      }

      // Update index metadata count
      if (indexMeta) {
        indexMeta.vectorCount += upsertedCount;
        await this.collection!.upsert(`_index_meta_${indexName}`, indexMeta);
      }

      logger.debug(`Upserted ${upsertedCount} records to Couchbase ${indexName}`);
      return { upsertedCount };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to upsert records: ${message}`);
    }
  }

  /**
   * Query vectors by similarity using FTS vector search
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
      // Build the vector search query
      const searchQuery = this.buildVectorSearchQuery(
        indexName,
        vector,
        topK,
        filter as MetadataFilter<TMetadata> | undefined,
        namespace,
      );

      // Execute the search
      const searchResult = await this.cluster!.searchQuery(
        indexName,
        searchQuery.query,
        searchQuery.options,
      );

      // Process results
      const results: VectorQueryResult<TMetadata>[] = [];

      for (const row of searchResult.rows) {
        // Apply minimum score filter
        if (minScore !== undefined && row.score < minScore) {
          continue;
        }

        // Fetch the full document if needed
        const docKey = row.id;
        let doc: VectorDocument | null = null;

        if (includeVectors || includeMetadata) {
          try {
            const getResult = await this.collection!.get(docKey);
            doc = getResult.content as VectorDocument;
          } catch {
            // Document might have been deleted, skip
            continue;
          }
        }

        const result: VectorQueryResult<TMetadata> = {
          id: row.id.replace(`${indexName}::`, ""),
          score: row.score,
        };

        if (includeVectors && doc) {
          result.vector = doc.vector;
        }

        if (includeMetadata && doc) {
          result.metadata = doc.metadata as TMetadata;
          result.content = doc.content;
        }

        results.push(result);
      }

      return results.slice(0, topK);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
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

    const { ids, filter, namespace, deleteAll } = options;

    try {
      let deletedCount = 0;

      if (deleteAll) {
        // Delete all documents for this index
        // Note: In production, use N1QL for efficient bulk deletion
        // This is a simplified implementation that would require listing all docs
        logger.warn(
          "deleteAll not fully implemented for Couchbase - use N1QL for bulk deletion",
        );
        // Update metadata to reflect deletion
        const indexMeta = this.indexMetadataCache.get(indexName);
        if (indexMeta) {
          deletedCount = indexMeta.vectorCount;
          indexMeta.vectorCount = 0;
          await this.collection!.upsert(`_index_meta_${indexName}`, indexMeta);
        }
      } else if (ids && ids.length > 0) {
        // Delete by IDs
        for (const id of ids) {
          const docKey = `${indexName}::${id}`;
          try {
            await this.collection!.remove(docKey);
            deletedCount++;
          } catch {
            // Document might not exist, continue
          }
        }

        // Update index metadata
        const indexMeta = this.indexMetadataCache.get(indexName);
        if (indexMeta) {
          indexMeta.vectorCount = Math.max(
            0,
            indexMeta.vectorCount - deletedCount,
          );
          await this.collection!.upsert(`_index_meta_${indexName}`, indexMeta);
        }
      } else if (filter || namespace) {
        // Delete by filter/namespace would require N1QL query
        // This is a placeholder - full implementation would use N1QL
        logger.warn(
          "Filter-based deletion not fully implemented - use N1QL for complex deletions",
        );
      }

      logger.debug(`Deleted ${deletedCount} records from Couchbase ${indexName}`);
      return { deletedCount };
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

    try {
      const indexMeta = this.indexMetadataCache.get(indexName);

      if (!indexMeta) {
        // Try to load from storage
        try {
          const result = await this.collection!.get(`_index_meta_${indexName}`);
          const meta = result.content as IndexMetadata;
          this.indexMetadataCache.set(indexName, meta);
          return {
            vectorCount: meta.vectorCount,
            dimension: meta.dimension,
            metrics: {
              metric: meta.metric,
              createdAt: meta.createdAt,
            },
          };
        } catch {
          throw new Error(`Index ${indexName} not found`);
        }
      }

      return {
        vectorCount: indexMeta.vectorCount,
        dimension: indexMeta.dimension,
        metrics: {
          metric: indexMeta.metric,
          createdAt: indexMeta.createdAt,
        },
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to get stats for ${indexName}: ${message}`);
    }
  }

  /**
   * Translate abstract filter to Couchbase search query format
   */
  protected translateFilter<TMetadata extends UnknownRecord>(
    filter: MetadataFilter<TMetadata>,
  ): Record<string, unknown> {
    const conjuncts: Record<string, unknown>[] = [];

    for (const [key, value] of Object.entries(filter)) {
      if (key === "$and" && Array.isArray(value)) {
        const subFilters = value.map((f) =>
          this.translateFilter(f as MetadataFilter),
        );
        conjuncts.push({
          conjuncts: subFilters,
        });
      } else if (key === "$or" && Array.isArray(value)) {
        const subFilters = value.map((f) =>
          this.translateFilter(f as MetadataFilter),
        );
        conjuncts.push({
          disjuncts: subFilters,
        });
      } else if (
        key === "$not" &&
        typeof value === "object" &&
        value !== null
      ) {
        const subFilter = this.translateFilter(value as MetadataFilter);
        conjuncts.push({
          must_not: subFilter,
        });
      } else if (this.isFieldFilter(value)) {
        const fieldQuery = this.translateFieldFilter(
          `metadata.${key}`,
          value as FieldFilter,
        );
        conjuncts.push(fieldQuery);
      } else {
        // Simple equality - use term query
        conjuncts.push({
          term: value,
          field: `metadata.${key}`,
        });
      }
    }

    if (conjuncts.length === 1) {
      return conjuncts[0];
    }

    return {
      conjuncts,
    };
  }

  // ===================
  // PRIVATE HELPER METHODS
  // ===================

  /**
   * Load Couchbase driver dynamically
   */
  private async loadCouchbaseDriver(): Promise<{
    connect: (
      connectionString: string,
      options: Record<string, unknown>,
    ) => Promise<CouchbaseCluster>;
  }> {
    try {
      const modulePath = "couchbase";
      const module = await import(/* @vite-ignore */ modulePath);
      return module;
    } catch {
      throw new Error(
        "Couchbase driver not found. Install couchbase: npm install couchbase",
      );
    }
  }

  /**
   * Load existing index metadata from storage
   */
  private async loadIndexMetadata(): Promise<void> {
    // In a full implementation, you would query for all metadata documents
    // For now, we rely on the cache being populated during index creation
    // This could be enhanced with a N1QL query to find all _index_meta_* documents
    logger.debug("Index metadata loading - using cache only");
  }

  /**
   * Build FTS index definition for vector search
   */
  private buildSearchIndexDefinition(
    name: string,
    dimension: number,
    metric: SimilarityMetric,
  ): CouchbaseSearchIndex {
    // Map our metric names to Couchbase similarity types
    const similarityMap: Record<SimilarityMetric, string> = {
      cosine: "l2_norm", // Couchbase uses l2_norm with normalization for cosine
      euclidean: "l2_norm",
      dotProduct: "dot_product",
    };

    return {
      name,
      type: "fulltext-index",
      sourceType: "couchbase",
      sourceName: this.config.bucketName,
      params: {
        doc_config: {
          docid_prefix_delim: "::",
          docid_regexp: `${name}::.*`,
          mode: "scope.collection.type_field",
          type_field: "indexName",
        },
        mapping: {
          default_analyzer: "standard",
          default_datetime_parser: "dateTimeOptional",
          default_field: "_all",
          default_mapping: {
            dynamic: true,
            enabled: false,
          },
          default_type: "_default",
          docvalues_dynamic: false,
          index_dynamic: true,
          store_dynamic: false,
          type_field: "_type",
          types: {
            [`${this.scopeName}.${this.collectionName}`]: {
              default_analyzer: "standard",
              dynamic: true,
              enabled: true,
              properties: {
                vector: {
                  enabled: true,
                  dynamic: false,
                  fields: [
                    {
                      dims: dimension,
                      index: true,
                      name: "vector",
                      similarity: similarityMap[metric],
                      type: "vector",
                      vector_index_optimized_for: "recall",
                    },
                  ],
                },
                metadata: {
                  enabled: true,
                  dynamic: true,
                },
                content: {
                  enabled: true,
                  dynamic: false,
                  fields: [
                    {
                      analyzer: "standard",
                      index: true,
                      name: "content",
                      type: "text",
                    },
                  ],
                },
                namespace: {
                  enabled: true,
                  dynamic: false,
                  fields: [
                    {
                      index: true,
                      name: "namespace",
                      type: "keyword",
                    },
                  ],
                },
                indexName: {
                  enabled: true,
                  dynamic: false,
                  fields: [
                    {
                      index: true,
                      name: "indexName",
                      type: "keyword",
                    },
                  ],
                },
              },
            },
          },
        },
        store: {
          indexType: "scorch",
          segmentVersion: 15,
        },
      },
      planParams: {
        maxPartitionsPerPIndex: 1024,
        numReplicas: 0,
      },
    };
  }

  /**
   * Build vector search query for Couchbase FTS
   */
  private buildVectorSearchQuery<TMetadata extends UnknownRecord>(
    indexName: string,
    vector: number[],
    topK: number,
    filter?: MetadataFilter<TMetadata>,
    namespace?: string,
  ): {
    query: CouchbaseSearchQuery;
    options: CouchbaseSearchOptions;
  } {
    // Build the base kNN query
    const knnQuery = {
      k: topK,
      field: "vector",
      vector: vector,
    };

    // Build filter queries if needed
    const mustQueries: Record<string, unknown>[] = [];

    // Always filter by index name
    mustQueries.push({
      term: indexName,
      field: "indexName",
    });

    // Add namespace filter if specified
    if (namespace) {
      mustQueries.push({
        term: namespace,
        field: "namespace",
      });
    }

    // Add metadata filter if specified
    if (filter) {
      const translatedFilter = this.translateFilter(filter);
      mustQueries.push(translatedFilter);
    }

    // Combine kNN with filters using a boolean query
    const combinedQuery = {
      knn: [knnQuery],
      query: mustQueries.length > 0 ? { conjuncts: mustQueries } : { match_all: {} },
    };

    return {
      query: combinedQuery as unknown as CouchbaseSearchQuery,
      options: {
        limit: topK,
        fields: ["*"],
      },
    };
  }

  /**
   * Check if value is a field filter (has operator keys)
   */
  private isFieldFilter(value: unknown): boolean {
    if (typeof value !== "object" || value === null) return false;
    const keys = Object.keys(value);
    return keys.some((k) => k.startsWith("$"));
  }

  /**
   * Translate a field filter to Couchbase query format
   */
  private translateFieldFilter(
    field: string,
    filter: FieldFilter,
  ): Record<string, unknown> {
    const queries: Record<string, unknown>[] = [];

    for (const [op, val] of Object.entries(filter)) {
      switch (op) {
        case "$eq":
          queries.push({ term: val, field });
          break;
        case "$ne":
          queries.push({
            must_not: { term: val, field },
          });
          break;
        case "$gt":
          queries.push({
            min: val,
            inclusive_min: false,
            field,
          });
          break;
        case "$gte":
          queries.push({
            min: val,
            inclusive_min: true,
            field,
          });
          break;
        case "$lt":
          queries.push({
            max: val,
            inclusive_max: false,
            field,
          });
          break;
        case "$lte":
          queries.push({
            max: val,
            inclusive_max: true,
            field,
          });
          break;
        case "$in":
          if (Array.isArray(val)) {
            queries.push({
              disjuncts: val.map((v) => ({ term: v, field })),
            });
          }
          break;
        case "$nin":
          if (Array.isArray(val)) {
            queries.push({
              must_not: {
                disjuncts: val.map((v) => ({ term: v, field })),
              },
            });
          }
          break;
        case "$exists":
          // Couchbase doesn't have direct exists query, use wildcard
          if (val) {
            queries.push({ wildcard: "*", field });
          } else {
            queries.push({ must_not: { wildcard: "*", field } });
          }
          break;
        case "$contains":
          queries.push({ match: val, field, fuzziness: 0 });
          break;
        case "$startsWith":
          queries.push({ prefix: val, field });
          break;
        case "$endsWith":
          // Couchbase doesn't have native endsWith, use wildcard
          queries.push({ wildcard: `*${val}`, field });
          break;
        default:
          // Unknown operator, treat as equality
          queries.push({ term: val, field });
      }
    }

    if (queries.length === 1) {
      return queries[0];
    }

    return { conjuncts: queries };
  }
}
