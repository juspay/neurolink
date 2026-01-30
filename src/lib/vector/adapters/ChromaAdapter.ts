/**
 * Chroma Vector Store Adapter
 * Implements vector similarity search using Chroma embedded vector database
 *
 * Chroma is an open-source embedding database designed for AI applications.
 * It supports in-memory, persistent, and HTTP client modes with rich filtering
 * capabilities.
 *
 * @see https://docs.trychroma.com/
 */

import type { UnknownRecord } from "../../types/common.js";
import { logger } from "../../utils/logger.js";
import { BaseVectorStore } from "../BaseVectorStore.js";
import type {
  VectorStoreName,
  VectorStoreConfig,
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
 * Chroma-specific configuration
 */
export interface ChromaConfig extends VectorStoreConfig {
  /** Local persistence path for persistent mode */
  path?: string;
  /** Chroma server URL for HTTP mode (e.g., "http://localhost:8000") */
  url?: string;
  /** Authentication for Chroma server */
  auth?: {
    provider: string;
    credentials: string;
  };
  /** Multi-tenant support - tenant identifier */
  tenant?: string;
  /** Database name for multi-database support */
  database?: string;
  /** Whether to use ephemeral (in-memory) mode - defaults to true if no path/url provided */
  ephemeral?: boolean;
  /** SSL configuration for HTTP client */
  ssl?: boolean;
  /** Default embedding function name (optional - Chroma can auto-embed) */
  embeddingFunction?: string;
}

/**
 * Chroma Collection interface
 * Compatible with chromadb Collection API
 */
interface ChromaCollection {
  name: string;
  id: string;
  metadata?: Record<string, unknown>;
  add(params: {
    ids: string[];
    embeddings?: number[][];
    metadatas?: Record<string, unknown>[];
    documents?: string[];
  }): Promise<void>;
  update(params: {
    ids: string[];
    embeddings?: number[][];
    metadatas?: Record<string, unknown>[];
    documents?: string[];
  }): Promise<void>;
  upsert(params: {
    ids: string[];
    embeddings?: number[][];
    metadatas?: Record<string, unknown>[];
    documents?: string[];
  }): Promise<void>;
  query(params: {
    queryEmbeddings?: number[][];
    nResults?: number;
    where?: ChromaWhereClause;
    whereDocument?: ChromaWhereDocumentClause;
    include?: Array<"documents" | "metadatas" | "embeddings" | "distances">;
  }): Promise<ChromaQueryResult>;
  get(params?: {
    ids?: string[];
    where?: ChromaWhereClause;
    whereDocument?: ChromaWhereDocumentClause;
    include?: Array<"documents" | "metadatas" | "embeddings">;
    limit?: number;
    offset?: number;
  }): Promise<ChromaGetResult>;
  delete(params?: {
    ids?: string[];
    where?: ChromaWhereClause;
    whereDocument?: ChromaWhereDocumentClause;
  }): Promise<void>;
  count(): Promise<number>;
  modify(params: { name?: string; metadata?: Record<string, unknown> }): Promise<void>;
  peek(params?: { limit?: number }): Promise<ChromaGetResult>;
}

/**
 * Chroma Client interface
 * Compatible with chromadb ChromaClient API
 */
interface ChromaClient {
  createCollection(params: {
    name: string;
    metadata?: Record<string, unknown>;
    embeddingFunction?: unknown;
  }): Promise<ChromaCollection>;
  getCollection(params: {
    name: string;
    embeddingFunction?: unknown;
  }): Promise<ChromaCollection>;
  getOrCreateCollection(params: {
    name: string;
    metadata?: Record<string, unknown>;
    embeddingFunction?: unknown;
  }): Promise<ChromaCollection>;
  deleteCollection(params: { name: string }): Promise<void>;
  listCollections(): Promise<Array<{ name: string; id: string; metadata?: Record<string, unknown> }>>;
  heartbeat(): Promise<number>;
  reset(): Promise<boolean>;
}

/**
 * Chroma where clause for metadata filtering
 */
interface ChromaWhereClause {
  $eq?: string | number | boolean;
  $ne?: string | number | boolean;
  $gt?: number;
  $gte?: number;
  $lt?: number;
  $lte?: number;
  $in?: Array<string | number | boolean>;
  $nin?: Array<string | number | boolean>;
  $and?: ChromaWhereClause[];
  $or?: ChromaWhereClause[];
  [key: string]: unknown;
}

/**
 * Chroma where_document clause for document-level filtering
 */
interface ChromaWhereDocumentClause {
  $contains?: string;
  $not_contains?: string;
  $and?: ChromaWhereDocumentClause[];
  $or?: ChromaWhereDocumentClause[];
}

/**
 * Chroma query result
 */
interface ChromaQueryResult {
  ids: string[][];
  embeddings?: number[][][] | null;
  documents?: (string | null)[][] | null;
  metadatas?: (Record<string, unknown> | null)[][] | null;
  distances?: number[][] | null;
}

/**
 * Chroma get result
 */
interface ChromaGetResult {
  ids: string[];
  embeddings?: number[][] | null;
  documents?: (string | null)[] | null;
  metadatas?: (Record<string, unknown> | null)[] | null;
}

/**
 * Index metadata stored for tracking collection configurations
 */
interface IndexMetadata {
  name: string;
  dimension: number;
  metric: SimilarityMetric;
  created_at: string;
}

/**
 * Chroma Vector Store Adapter
 *
 * Features:
 * - In-memory (ephemeral) mode for development/testing
 * - Persistent mode with local directory storage
 * - HTTP client mode for Chroma server connections
 * - Rich metadata filtering with $eq, $ne, $gt, $gte, $lt, $lte, $in, $nin
 * - Document-level filtering with $contains, $not_contains
 * - Multi-tenant and multi-database support
 * - Optional authentication for server mode
 * - Batch operations for performance
 *
 * Note: Requires the chromadb package to be installed:
 *   npm install chromadb
 */
export class ChromaAdapter extends BaseVectorStore<ChromaConfig> {
  private client: ChromaClient | null = null;
  private indexMetadataCache: Map<string, IndexMetadata> = new Map();
  private static readonly METADATA_COLLECTION_NAME = "_neurolink_metadata";

  constructor(config: ChromaConfig) {
    super(config, "chroma" as VectorStoreName);
  }

  /**
   * Initialize connection to Chroma database
   * Determines mode based on configuration (ephemeral, persistent, or HTTP)
   */
  async connect(): Promise<void> {
    if (this.initialized) {
      logger.debug("Chroma already connected");
      return;
    }

    try {
      const chromadb = await this.loadChromaDriver();

      // Determine client mode based on configuration
      if (this.config.url) {
        // HTTP client mode - connect to Chroma server
        const clientOptions: Record<string, unknown> = {
          path: this.config.url,
        };

        if (this.config.auth) {
          clientOptions.auth = this.config.auth;
        }

        if (this.config.tenant) {
          clientOptions.tenant = this.config.tenant;
        }

        if (this.config.database) {
          clientOptions.database = this.config.database;
        }

        this.client = new chromadb.ChromaClient(clientOptions);
      } else if (this.config.path && !this.config.ephemeral) {
        // Persistent mode - local directory storage
        const clientOptions: Record<string, unknown> = {
          path: this.config.path,
        };

        if (this.config.tenant) {
          clientOptions.tenant = this.config.tenant;
        }

        if (this.config.database) {
          clientOptions.database = this.config.database;
        }

        this.client = new chromadb.ChromaClient(clientOptions);
      } else {
        // Ephemeral (in-memory) mode
        this.client = new chromadb.ChromaClient();
      }

      // Verify connection with heartbeat
      await this.client.heartbeat();

      // Initialize metadata collection for tracking indexes
      await this.initializeMetadataCollection();

      this.initialized = true;
      logger.debug("Chroma connected successfully", {
        mode: this.getConnectionMode(),
        url: this.config.url,
        path: this.config.path,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to connect to Chroma: ${message}`);
    }
  }

  /**
   * Close the database connection
   */
  async disconnect(): Promise<void> {
    if (this.client) {
      try {
        // Chroma client doesn't have an explicit close method
        // Just clear the reference
        this.client = null;
        this.initialized = false;
        this.indexMetadataCache.clear();
        logger.debug("Chroma disconnected");
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        throw new Error(`Failed to disconnect from Chroma: ${message}`);
      }
    }
  }

  /**
   * Create a new vector index (collection)
   * In Chroma, each index is represented as a collection
   */
  async createIndex(config: VectorIndexConfig): Promise<void> {
    this.ensureInitialized();

    const { name, dimension, metric = "cosine" } = config;

    try {
      // Check if collection already exists
      const collections = await this.client!.listCollections();
      const exists = collections.some((col) => col.name === name);

      if (exists) {
        logger.debug(`Collection ${name} already exists`);
        return;
      }

      // Create collection with metadata
      const collectionMetadata: Record<string, unknown> = {
        "hnsw:space": this.metricToChromaSpace(metric),
        dimension,
        created_at: new Date().toISOString(),
      };

      await this.client!.createCollection({
        name,
        metadata: collectionMetadata,
      });

      // Store index metadata
      const metadata: IndexMetadata = {
        name,
        dimension,
        metric,
        created_at: new Date().toISOString(),
      };

      await this.storeIndexMetadata(metadata);
      this.indexMetadataCache.set(name, metadata);

      logger.debug(`Created collection ${name}`, { dimension, metric });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to create index ${name}: ${message}`);
    }
  }

  /**
   * Delete an index (collection)
   */
  async deleteIndex(indexName: string): Promise<void> {
    this.ensureInitialized();

    try {
      await this.client!.deleteCollection({ name: indexName });
      await this.deleteIndexMetadata(indexName);
      this.indexMetadataCache.delete(indexName);

      logger.debug(`Deleted collection ${indexName}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to delete index ${indexName}: ${message}`);
    }
  }

  /**
   * List all indexes (collections)
   */
  async listIndexes(): Promise<string[]> {
    this.ensureInitialized();

    try {
      const collections = await this.client!.listCollections();
      // Filter out metadata collection
      return collections
        .filter((col) => col.name !== ChromaAdapter.METADATA_COLLECTION_NAME)
        .map((col) => col.name);
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
      const collections = await this.client!.listCollections();
      return collections.some((col) => col.name === indexName);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to check index existence: ${message}`);
    }
  }

  /**
   * Upsert vectors into the collection
   * Chroma supports native upsert operations
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

    // Validate dimensions
    this.validateDimensions(records.map((r) => r.vector));

    try {
      const collection = await this.client!.getCollection({ name: indexName });

      // Prepare data for Chroma
      const ids = records.map((r) => r.id);
      const embeddings = records.map((r) => r.vector);
      const documents = records.map((r) => r.content || "");

      // Prepare metadata - include namespace if provided
      const namespace = options?.namespace;
      const metadatas = records.map((r) => {
        const meta: Record<string, unknown> = { ...r.metadata };
        if (namespace) {
          meta._namespace = namespace;
        }
        if (r.namespace) {
          meta._namespace = r.namespace;
        }
        return meta;
      });

      // Use Chroma's native upsert
      await collection.upsert({
        ids,
        embeddings,
        documents,
        metadatas,
      });

      logger.debug(`Upserted ${records.length} records to ${indexName}`);
      return { upsertedCount: records.length };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to upsert records: ${message}`);
    }
  }

  /**
   * Query vectors by similarity
   * Uses Chroma's native vector search with optional filtering
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
      const collection = await this.client!.getCollection({ name: indexName });

      // Build include array
      const include: Array<"documents" | "metadatas" | "embeddings" | "distances"> = ["distances"];
      if (includeMetadata) {
        include.push("metadatas", "documents");
      }
      if (includeVectors) {
        include.push("embeddings");
      }

      // Build where clause
      let whereClause: ChromaWhereClause | undefined;

      if (namespace) {
        whereClause = { _namespace: namespace };
      }

      if (filter) {
        const translatedFilter = this.translateFilter(filter);
        if (whereClause) {
          whereClause = {
            $and: [whereClause, translatedFilter],
          };
        } else if (translatedFilter && Object.keys(translatedFilter).length > 0) {
          whereClause = translatedFilter;
        }
      }

      // Execute query
      const queryParams: Parameters<ChromaCollection["query"]>[0] = {
        queryEmbeddings: [vector],
        nResults: topK,
        include,
      };

      if (whereClause && Object.keys(whereClause).length > 0) {
        queryParams.where = whereClause;
      }

      const queryResult = await collection.query(queryParams);

      // Convert results
      const results: VectorQueryResult<TMetadata>[] = [];

      if (queryResult.ids && queryResult.ids[0]) {
        const ids = queryResult.ids[0];
        const distances = queryResult.distances?.[0] || [];
        const metadatas = queryResult.metadatas?.[0] || [];
        const documents = queryResult.documents?.[0] || [];
        const embeddings = queryResult.embeddings?.[0] || [];

        // Get metric type for score conversion
        const indexMeta = this.indexMetadataCache.get(indexName);
        const metric = indexMeta?.metric || "cosine";

        for (let i = 0; i < ids.length; i++) {
          // Convert distance to similarity score
          const distance = distances[i] ?? 0;
          const score = this.distanceToScore(distance, metric);

          // Apply minimum score filter
          if (minScore !== undefined && score < minScore) {
            continue;
          }

          const result: VectorQueryResult<TMetadata> = {
            id: ids[i],
            score,
          };

          if (includeVectors && embeddings[i]) {
            result.vector = embeddings[i];
          }

          if (includeMetadata) {
            const meta = metadatas[i];
            if (meta) {
              // Remove internal namespace field from returned metadata
              const { _namespace, ...restMeta } = meta as Record<string, unknown>;
              result.metadata = restMeta as TMetadata;
            }
            if (documents[i]) {
              result.content = documents[i];
            }
          }

          results.push(result);
        }
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
      const collection = await this.client!.getCollection({ name: indexName });

      // Get count before delete for reporting
      const countBefore = await collection.count();

      if (deleteAll) {
        // Delete all records, optionally filtered by namespace
        if (namespace) {
          await collection.delete({
            where: { _namespace: namespace },
          });
        } else {
          // Delete all - Chroma requires at least one filter parameter
          // Get all IDs first
          const allRecords = await collection.get({});
          if (allRecords.ids.length > 0) {
            await collection.delete({ ids: allRecords.ids });
          }
        }
      } else if (ids && ids.length > 0) {
        // Delete by IDs
        await collection.delete({ ids });
      } else if (filter) {
        // Delete by filter
        const whereClause = this.translateFilter(filter);
        if (whereClause && Object.keys(whereClause).length > 0) {
          await collection.delete({ where: whereClause });
        }
      }

      // Get count after delete
      const countAfter = await collection.count();
      const deletedCount = Math.max(0, countBefore - countAfter);

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
      const collection = await this.client!.getCollection({ name: indexName });

      // Get total count
      const vectorCount = await collection.count();

      // Get namespace count by querying unique namespaces
      let namespaceCount = 0;
      try {
        const allRecords = await collection.get({
          include: ["metadatas"],
        });
        const namespaces = new Set<string>();
        for (const meta of allRecords.metadatas || []) {
          if (meta && meta._namespace) {
            namespaces.add(meta._namespace as string);
          }
        }
        namespaceCount = namespaces.size;
      } catch {
        // Ignore namespace count errors
      }

      // Get dimension from metadata cache
      const meta = this.indexMetadataCache.get(indexName);

      return {
        vectorCount,
        dimension: meta?.dimension,
        namespaceCount,
        metrics: {
          metric: meta?.metric || "cosine",
        },
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to get stats for ${indexName}: ${message}`);
    }
  }

  /**
   * Translate abstract filter to Chroma where clause
   */
  protected translateFilter<TMetadata extends UnknownRecord>(
    filter: MetadataFilter<TMetadata>,
  ): ChromaWhereClause {
    const result: ChromaWhereClause = {};

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
        // Chroma doesn't have native $not, simulate with $nin for equality
        const subFilter = this.translateFilter(value as MetadataFilter);
        // Convert positive conditions to negative
        for (const [subKey, subValue] of Object.entries(subFilter)) {
          if (!subKey.startsWith("$")) {
            if (typeof subValue === "object" && subValue !== null) {
              // Complex filter
              if ("$eq" in (subValue as object)) {
                result[subKey] = { $ne: (subValue as { $eq: unknown }).$eq };
              } else if ("$in" in (subValue as object)) {
                result[subKey] = { $nin: (subValue as { $in: unknown[] }).$in };
              }
            } else {
              // Simple equality negation
              result[subKey] = { $ne: subValue };
            }
          }
        }
      } else if (this.isFieldFilter(value)) {
        result[key] = this.translateFieldFilter(value as FieldFilter);
      } else {
        // Simple equality - Chroma uses direct equality
        result[key] = value as string | number | boolean;
      }
    }

    return result;
  }

  /**
   * Translate document filter to Chroma where_document clause
   * This is a public method for advanced users who want document-level filtering
   */
  translateDocumentFilter(filter: {
    contains?: string;
    notContains?: string;
  }): ChromaWhereDocumentClause {
    const result: ChromaWhereDocumentClause = {};

    if (filter.contains) {
      result.$contains = filter.contains;
    }
    if (filter.notContains) {
      result.$not_contains = filter.notContains;
    }

    return result;
  }

  /**
   * Modify collection metadata
   * Allows updating collection name or metadata
   */
  async modifyCollection(
    indexName: string,
    params: { name?: string; metadata?: Record<string, unknown> },
  ): Promise<void> {
    this.ensureInitialized();

    try {
      const collection = await this.client!.getCollection({ name: indexName });
      await collection.modify(params);

      // Update cache if name changed
      if (params.name && params.name !== indexName) {
        const oldMeta = this.indexMetadataCache.get(indexName);
        if (oldMeta) {
          this.indexMetadataCache.delete(indexName);
          this.indexMetadataCache.set(params.name, {
            ...oldMeta,
            name: params.name,
          });
        }
      }

      logger.debug(`Modified collection ${indexName}`, params);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to modify collection ${indexName}: ${message}`);
    }
  }

  /**
   * Peek at records in a collection (useful for debugging)
   */
  async peek(indexName: string, limit: number = 10): Promise<ChromaGetResult> {
    this.ensureInitialized();

    try {
      const collection = await this.client!.getCollection({ name: indexName });
      return await collection.peek({ limit });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to peek collection ${indexName}: ${message}`);
    }
  }

  /**
   * Get records by IDs
   */
  async getByIds<TMetadata extends UnknownRecord = UnknownRecord>(
    indexName: string,
    ids: string[],
    options?: {
      includeVectors?: boolean;
      includeMetadata?: boolean;
    },
  ): Promise<VectorQueryResult<TMetadata>[]> {
    this.ensureInitialized();

    try {
      const collection = await this.client!.getCollection({ name: indexName });

      const include: Array<"documents" | "metadatas" | "embeddings"> = [];
      if (options?.includeMetadata !== false) {
        include.push("metadatas", "documents");
      }
      if (options?.includeVectors) {
        include.push("embeddings");
      }

      const getResult = await collection.get({ ids, include });

      const results: VectorQueryResult<TMetadata>[] = [];

      for (let i = 0; i < getResult.ids.length; i++) {
        const result: VectorQueryResult<TMetadata> = {
          id: getResult.ids[i],
          score: 1.0, // No distance for direct get
        };

        if (options?.includeVectors && getResult.embeddings?.[i]) {
          result.vector = getResult.embeddings[i];
        }

        if (options?.includeMetadata !== false) {
          const meta = getResult.metadatas?.[i];
          if (meta) {
            const { _namespace, ...restMeta } = meta as Record<string, unknown>;
            result.metadata = restMeta as TMetadata;
          }
          if (getResult.documents?.[i]) {
            result.content = getResult.documents[i];
          }
        }

        results.push(result);
      }

      return results;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to get records by IDs: ${message}`);
    }
  }

  // ===================
  // PRIVATE HELPER METHODS
  // ===================

  /**
   * Load Chroma driver dynamically
   */
  private async loadChromaDriver(): Promise<{
    ChromaClient: new (config?: Record<string, unknown>) => ChromaClient;
  }> {
    try {
      const modulePath = "chromadb";
      const module = await import(/* @vite-ignore */ modulePath);
      return module;
    } catch {
      throw new Error(
        "Chroma driver not found. Install chromadb: npm install chromadb",
      );
    }
  }

  /**
   * Get connection mode description
   */
  private getConnectionMode(): string {
    if (this.config.url) {
      return "http";
    } else if (this.config.path && !this.config.ephemeral) {
      return "persistent";
    }
    return "ephemeral";
  }

  /**
   * Initialize metadata collection for tracking index configurations
   */
  private async initializeMetadataCollection(): Promise<void> {
    try {
      // Try to get or create metadata collection
      await this.client!.getOrCreateCollection({
        name: ChromaAdapter.METADATA_COLLECTION_NAME,
        metadata: {
          description: "NeuroLink internal metadata for vector indexes",
        },
      });

      // Load existing metadata into cache
      await this.loadIndexMetadataCache();
    } catch (error) {
      logger.debug("Failed to initialize metadata collection", { error });
      // Continue without metadata collection - will work but without caching
    }
  }

  /**
   * Load index metadata from collection into cache
   */
  private async loadIndexMetadataCache(): Promise<void> {
    try {
      const metaCollection = await this.client!.getCollection({
        name: ChromaAdapter.METADATA_COLLECTION_NAME,
      });

      const results = await metaCollection.get({
        include: ["metadatas"],
      });

      for (let i = 0; i < results.ids.length; i++) {
        const id = results.ids[i];
        const meta = results.metadatas?.[i] as unknown as IndexMetadata;

        if (meta && meta.name) {
          this.indexMetadataCache.set(id, meta);
        }
      }
    } catch {
      // Ignore cache loading errors
    }
  }

  /**
   * Store index metadata in the metadata collection
   */
  private async storeIndexMetadata(metadata: IndexMetadata): Promise<void> {
    try {
      const metaCollection = await this.client!.getCollection({
        name: ChromaAdapter.METADATA_COLLECTION_NAME,
      });

      // Upsert metadata record
      await metaCollection.upsert({
        ids: [metadata.name],
        metadatas: [metadata as unknown as Record<string, unknown>],
        documents: [`Index configuration for ${metadata.name}`],
        embeddings: [[0]], // Dummy embedding - required but not used
      });
    } catch (error) {
      logger.debug("Failed to store index metadata", { error });
    }
  }

  /**
   * Delete index metadata from the metadata collection
   */
  private async deleteIndexMetadata(indexName: string): Promise<void> {
    try {
      const metaCollection = await this.client!.getCollection({
        name: ChromaAdapter.METADATA_COLLECTION_NAME,
      });
      await metaCollection.delete({ ids: [indexName] });
    } catch {
      // Ignore
    }
  }

  /**
   * Convert similarity metric to Chroma HNSW space parameter
   */
  private metricToChromaSpace(metric: SimilarityMetric): string {
    switch (metric) {
      case "euclidean":
        return "l2";
      case "dotProduct":
        return "ip"; // inner product
      case "cosine":
      default:
        return "cosine";
    }
  }

  /**
   * Convert distance to similarity score
   * Chroma returns distances, we need to convert to scores
   */
  private distanceToScore(distance: number, metric: SimilarityMetric): number {
    switch (metric) {
      case "euclidean":
        // For L2 distance, lower is better
        // Convert to similarity: 1 / (1 + distance)
        return 1 / (1 + distance);
      case "dotProduct":
        // For inner product, Chroma returns negative distance
        // Higher is better, so negate back
        return -distance;
      case "cosine":
      default:
        // Cosine distance in Chroma is already 1 - similarity
        // So similarity = 1 - distance
        return 1 - distance;
    }
  }

  /**
   * Check if value is a field filter
   */
  private isFieldFilter(value: unknown): boolean {
    if (typeof value !== "object" || value === null) {
      return false;
    }
    const keys = Object.keys(value);
    return keys.some((k) => k.startsWith("$"));
  }

  /**
   * Translate a field filter to Chroma format
   */
  private translateFieldFilter(filter: FieldFilter): Record<string, unknown> {
    const result: Record<string, unknown> = {};

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
          // Chroma doesn't have native $exists, skip
          logger.debug("Chroma does not support $exists filter, ignoring");
          break;
        case "$contains":
        case "$startsWith":
        case "$endsWith":
          // These are string operations not directly supported in Chroma metadata filters
          // Log and skip
          logger.debug(`Chroma does not support ${op} in metadata filters, ignoring`);
          break;
        default:
          // Unknown operator, treat as equality
          result.$eq = val;
      }
    }

    return result;
  }
}
