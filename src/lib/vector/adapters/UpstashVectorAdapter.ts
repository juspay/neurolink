/**
 * Upstash Vector Adapter
 * Implements vector similarity search using Upstash Vector - a REST-based serverless vector database
 *
 * Upstash Vector provides:
 * - Serverless, HTTP/REST-based operations
 * - Built-in embedding support
 * - Namespace partitioning
 * - Metadata filtering with SQL-like syntax
 * - Dense, sparse, and hybrid vector support
 *
 * @see https://upstash.com/docs/vector/sdks/ts/getting-started
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
} from "../types.js";

/**
 * Upstash Vector specific configuration
 */
export type UpstashVectorConfig = VectorStoreConfig & {
  /** Upstash Vector REST URL */
  url: string;
  /** Upstash Vector REST Token */
  token: string;
  /** Default namespace (optional) */
  defaultNamespace?: string;
  /** Request timeout in ms (default: 30000) */
  requestTimeout?: number;
  /** Enable automatic retries (default: true) */
  automaticRetries?: boolean;
  /** Custom headers (optional) */
  headers?: Record<string, string>;
};

/**
 * Upstash Index interface for type safety
 * Mirrors the @upstash/vector SDK Index class
 */
interface UpstashIndex<TMetadata extends UnknownRecord = UnknownRecord> {
  upsert(
    records: Array<{
      id: string;
      vector?: number[];
      data?: string;
      metadata?: TMetadata;
    }>,
    options?: { namespace?: string },
  ): Promise<{ upserted?: number; count?: number }>;

  query<T extends UnknownRecord = TMetadata>(
    options: {
      vector?: number[];
      data?: string;
      topK: number;
      includeVectors?: boolean;
      includeMetadata?: boolean;
      includeData?: boolean;
      filter?: string;
    },
    queryOptions?: { namespace?: string },
  ): Promise<
    Array<{
      id: string;
      score: number;
      vector?: number[];
      metadata?: T;
      data?: string;
    }>
  >;

  delete(
    ids: string | string[],
    options?: { namespace?: string },
  ): Promise<{ deleted?: number }>;

  fetch<T extends UnknownRecord = TMetadata>(
    ids: string[],
    options?: { namespace?: string; includeVectors?: boolean; includeData?: boolean },
  ): Promise<
    Array<{
      id: string;
      vector?: number[];
      metadata?: T;
      data?: string;
    } | null>
  >;

  range<T extends UnknownRecord = TMetadata>(
    options: {
      cursor: number | string;
      limit: number;
      includeVectors?: boolean;
      includeMetadata?: boolean;
      includeData?: boolean;
    },
    rangeOptions?: { namespace?: string },
  ): Promise<{
    nextCursor: string;
    vectors: Array<{
      id: string;
      vector?: number[];
      metadata?: T;
      data?: string;
    }>;
  }>;

  reset(options?: { namespace?: string }): Promise<void>;

  info(): Promise<{
    vectorCount: number;
    pendingVectorCount: number;
    indexSize: number;
    dimension: number;
    similarityFunction: string;
    namespaces?: Record<string, { vectorCount: number; pendingVectorCount: number }>;
  }>;

  listNamespaces(): Promise<string[]>;

  deleteNamespace(namespace: string): Promise<void>;

  namespace(name: string): UpstashNamespace<TMetadata>;
}

/**
 * Namespace interface for isolated operations
 */
interface UpstashNamespace<TMetadata extends UnknownRecord = UnknownRecord> {
  upsert(
    records: Array<{
      id: string;
      vector?: number[];
      data?: string;
      metadata?: TMetadata;
    }>,
  ): Promise<{ upserted?: number; count?: number }>;

  query<T extends UnknownRecord = TMetadata>(options: {
    vector?: number[];
    data?: string;
    topK: number;
    includeVectors?: boolean;
    includeMetadata?: boolean;
    includeData?: boolean;
    filter?: string;
  }): Promise<
    Array<{
      id: string;
      score: number;
      vector?: number[];
      metadata?: T;
      data?: string;
    }>
  >;

  delete(ids: string | string[]): Promise<{ deleted?: number }>;

  fetch<T extends UnknownRecord = TMetadata>(
    ids: string[],
    options?: { includeVectors?: boolean; includeData?: boolean },
  ): Promise<
    Array<{
      id: string;
      vector?: number[];
      metadata?: T;
      data?: string;
    } | null>
  >;

  reset(): Promise<void>;
}

/**
 * Upstash Vector Adapter
 *
 * Features:
 * - REST/HTTP based - no persistent connections
 * - Namespace support for data partitioning
 * - Metadata filtering with SQL-like syntax
 * - Built-in embedding support (optional)
 * - Serverless-friendly design
 *
 * Note: Requires @upstash/vector package:
 *   npm install @upstash/vector
 */
export class UpstashVectorAdapter extends BaseVectorStore<UpstashVectorConfig> {
  private index: UpstashIndex | null = null;
  private indexInfo: {
    dimension?: number;
    similarityFunction?: string;
    namespaces: Set<string>;
  } = { namespaces: new Set() };

  constructor(config: UpstashVectorConfig) {
    super(config, "upstash" as VectorStoreName);
  }

  /**
   * Initialize connection to Upstash Vector
   */
  async connect(): Promise<void> {
    if (this.initialized) {
      logger.debug("Upstash Vector already connected");
      return;
    }

    try {
      // Dynamically import @upstash/vector
      const { Index } = await this.loadUpstashSDK();

      // Create index instance
      this.index = new Index({
        url: this.config.url,
        token: this.config.token,
      }) as UpstashIndex;

      // Fetch and cache index info
      const info = await this.index.info();
      this.indexInfo = {
        dimension: info.dimension,
        similarityFunction: info.similarityFunction,
        namespaces: new Set(info.namespaces ? Object.keys(info.namespaces) : []),
      };

      // Also fetch namespace list for completeness
      try {
        const namespaces = await this.index.listNamespaces();
        namespaces.forEach((ns) => this.indexInfo.namespaces.add(ns));
      } catch {
        // listNamespaces may not be available in older SDK versions
        logger.debug("Could not list namespaces, continuing without namespace cache");
      }

      this.initialized = true;
      logger.debug("Upstash Vector connected successfully", {
        dimension: this.indexInfo.dimension,
        metric: this.indexInfo.similarityFunction,
        namespaceCount: this.indexInfo.namespaces.size,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to connect to Upstash Vector: ${message}`);
    }
  }

  /**
   * Close connection (no-op for REST-based service)
   */
  async disconnect(): Promise<void> {
    this.index = null;
    this.initialized = false;
    this.indexInfo = { namespaces: new Set() };
    logger.debug("Upstash Vector disconnected");
  }

  /**
   * Create a new namespace (Upstash uses namespaces instead of indexes)
   * Note: Upstash automatically creates namespaces on first use,
   * but this method validates the configuration
   */
  async createIndex(config: VectorIndexConfig): Promise<void> {
    this.ensureInitialized();

    const { name, dimension } = config;

    // Upstash Vector uses a single index with namespaces for partitioning
    // The dimension is set at the Upstash index level, not per-namespace
    if (this.indexInfo.dimension && dimension !== this.indexInfo.dimension) {
      throw new Error(
        `Dimension mismatch: Upstash index has dimension ${this.indexInfo.dimension}, ` +
          `but ${dimension} was requested. Upstash Vector uses a single dimension for all namespaces.`,
      );
    }

    // Track the namespace
    this.indexInfo.namespaces.add(name);

    logger.debug(`Registered namespace ${name}`, {
      dimension: this.indexInfo.dimension,
    });
  }

  /**
   * Delete a namespace
   */
  async deleteIndex(indexName: string): Promise<void> {
    this.ensureInitialized();

    try {
      // Delete the namespace using the SDK
      await this.index!.deleteNamespace(indexName);
      this.indexInfo.namespaces.delete(indexName);
      logger.debug(`Deleted namespace ${indexName}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to delete namespace ${indexName}: ${message}`);
    }
  }

  /**
   * List all namespaces
   */
  async listIndexes(): Promise<string[]> {
    this.ensureInitialized();

    try {
      const namespaces = await this.index!.listNamespaces();
      // Update cache
      this.indexInfo.namespaces = new Set(namespaces);
      return namespaces;
    } catch (error) {
      // Fallback to cached namespaces if API call fails
      return Array.from(this.indexInfo.namespaces);
    }
  }

  /**
   * Check if a namespace exists
   */
  async indexExists(indexName: string): Promise<boolean> {
    this.ensureInitialized();

    try {
      const namespaces = await this.listIndexes();
      return namespaces.includes(indexName);
    } catch {
      // Fallback to cache
      return this.indexInfo.namespaces.has(indexName);
    }
  }

  /**
   * Upsert vectors into a namespace
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

    const namespace = options?.namespace || indexName;

    try {
      // Transform records to Upstash format
      const upstashRecords = records.map((record) => ({
        id: record.id,
        vector: record.vector,
        metadata: record.metadata,
        data: record.content,
      }));

      // Batch upsert using namespace
      const ns = this.index!.namespace(namespace);
      const result = await ns.upsert(upstashRecords);

      // Track namespace
      this.indexInfo.namespaces.add(namespace);

      const upsertedCount = result.upserted ?? result.count ?? records.length;
      logger.debug(`Upserted ${upsertedCount} records to namespace ${namespace}`);

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

    const targetNamespace = namespace || indexName;

    try {
      // Build query options
      const queryOptions: {
        vector: number[];
        topK: number;
        includeVectors: boolean;
        includeMetadata: boolean;
        includeData: boolean;
        filter?: string;
      } = {
        vector,
        topK,
        includeVectors,
        includeMetadata,
        includeData: true,
      };

      // Convert filter to Upstash filter string
      if (filter) {
        queryOptions.filter = this.translateFilter(filter);
      }

      // Execute query on namespace
      const ns = this.index!.namespace(targetNamespace);
      const results = await ns.query<TMetadata>(queryOptions);

      // Transform results
      const queryResults: VectorQueryResult<TMetadata>[] = results
        .filter((r) => {
          // Apply minimum score filter
          if (minScore !== undefined && r.score < minScore) {
            return false;
          }
          return true;
        })
        .map((r) => ({
          id: r.id,
          score: r.score,
          vector: r.vector,
          metadata: r.metadata,
          content: r.data,
        }));

      return queryResults;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to query vectors: ${message}`);
    }
  }

  /**
   * Delete vectors from a namespace
   */
  async delete(
    indexName: string,
    options: VectorDeleteOptions,
  ): Promise<{ deletedCount: number }> {
    this.ensureInitialized();

    const { ids, filter, namespace, deleteAll } = options;
    const targetNamespace = namespace || indexName;

    try {
      const ns = this.index!.namespace(targetNamespace);

      if (deleteAll) {
        // Reset the entire namespace
        await ns.reset();
        logger.debug(`Deleted all records from namespace ${targetNamespace}`);
        return { deletedCount: -1 }; // Unknown count after reset
      }

      if (ids && ids.length > 0) {
        // Delete by IDs
        const result = await ns.delete(ids);
        const deletedCount = result.deleted ?? ids.length;
        logger.debug(`Deleted ${deletedCount} records from namespace ${targetNamespace}`);
        return { deletedCount };
      }

      if (filter) {
        // Upstash doesn't support delete by filter directly
        // We need to query first, then delete
        const filterStr = this.translateFilter(filter);

        // Query to get matching IDs (fetch all with high topK)
        const matchingResults = await ns.query({
          // Use a zero vector to match all when filtering
          // This is a workaround - ideally we'd want a dedicated filter endpoint
          vector: new Array(this.indexInfo.dimension || 1536).fill(0),
          topK: 10000, // Maximum reasonable batch
          filter: filterStr,
          includeVectors: false,
          includeMetadata: false,
          includeData: false,
        });

        if (matchingResults.length > 0) {
          const idsToDelete = matchingResults.map((r) => r.id);
          const result = await ns.delete(idsToDelete);
          const deletedCount = result.deleted ?? idsToDelete.length;
          logger.debug(`Deleted ${deletedCount} records by filter from namespace ${targetNamespace}`);
          return { deletedCount };
        }

        return { deletedCount: 0 };
      }

      return { deletedCount: 0 };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to delete records: ${message}`);
    }
  }

  /**
   * Get index/namespace statistics
   */
  async getStats(indexName: string): Promise<VectorStoreStats> {
    this.ensureInitialized();

    try {
      const info = await this.index!.info();

      // Update cached info
      this.indexInfo.dimension = info.dimension;
      this.indexInfo.similarityFunction = info.similarityFunction;

      // Get namespace-specific stats if available
      const namespaceStats = info.namespaces?.[indexName];

      return {
        vectorCount: namespaceStats?.vectorCount ?? info.vectorCount,
        indexSize: info.indexSize,
        dimension: info.dimension,
        namespaceCount: info.namespaces ? Object.keys(info.namespaces).length : 1,
        metrics: {
          similarityFunction: info.similarityFunction,
          pendingVectorCount:
            namespaceStats?.pendingVectorCount ?? info.pendingVectorCount,
        },
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to get stats for ${indexName}: ${message}`);
    }
  }

  /**
   * Translate abstract filter to Upstash filter string
   * Upstash uses SQL-like filter syntax: "field = 'value' and field2 > 10"
   */
  protected translateFilter<TMetadata extends UnknownRecord>(
    filter: MetadataFilter<TMetadata>,
  ): string {
    const conditions: string[] = [];

    for (const [key, value] of Object.entries(filter)) {
      if (key === "$and" && Array.isArray(value)) {
        const subConditions = value.map((f) =>
          this.translateFilter(f as MetadataFilter),
        );
        conditions.push(`(${subConditions.join(" AND ")})`);
      } else if (key === "$or" && Array.isArray(value)) {
        const subConditions = value.map((f) =>
          this.translateFilter(f as MetadataFilter),
        );
        conditions.push(`(${subConditions.join(" OR ")})`);
      } else if (key === "$not" && typeof value === "object" && value !== null) {
        const subFilter = this.translateFilter(value as MetadataFilter);
        conditions.push(`NOT (${subFilter})`);
      } else if (this.isFieldFilter(value)) {
        const fieldCondition = this.translateFieldFilter(key, value as FieldFilter);
        if (fieldCondition) {
          conditions.push(fieldCondition);
        }
      } else {
        // Simple equality
        conditions.push(this.formatCondition(key, "=", value));
      }
    }

    return conditions.length > 0 ? conditions.join(" AND ") : "";
  }

  // ===================
  // PRIVATE HELPER METHODS
  // ===================

  /**
   * Load Upstash Vector SDK dynamically
   */
  private async loadUpstashSDK(): Promise<{
    Index: new (config: { url: string; token: string }) => UpstashIndex;
  }> {
    try {
      const modulePath = "@upstash/vector";
      const module = await import(/* @vite-ignore */ modulePath);
      return module;
    } catch {
      throw new Error(
        "Upstash Vector SDK not found. Install it with: npm install @upstash/vector",
      );
    }
  }

  /**
   * Check if value is a field filter object
   */
  private isFieldFilter(value: unknown): boolean {
    if (typeof value !== "object" || value === null) return false;
    const keys = Object.keys(value);
    return keys.some((k) => k.startsWith("$"));
  }

  /**
   * Translate a field filter to Upstash syntax
   */
  private translateFieldFilter(key: string, filter: FieldFilter): string {
    const conditions: string[] = [];

    for (const [op, val] of Object.entries(filter)) {
      switch (op) {
        case "$eq":
          conditions.push(this.formatCondition(key, "=", val));
          break;
        case "$ne":
          conditions.push(this.formatCondition(key, "!=", val));
          break;
        case "$gt":
          conditions.push(this.formatCondition(key, ">", val));
          break;
        case "$gte":
          conditions.push(this.formatCondition(key, ">=", val));
          break;
        case "$lt":
          conditions.push(this.formatCondition(key, "<", val));
          break;
        case "$lte":
          conditions.push(this.formatCondition(key, "<=", val));
          break;
        case "$in":
          if (Array.isArray(val)) {
            const values = val.map((v) => this.formatValue(v)).join(", ");
            conditions.push(`${key} IN (${values})`);
          }
          break;
        case "$nin":
          if (Array.isArray(val)) {
            const values = val.map((v) => this.formatValue(v)).join(", ");
            conditions.push(`${key} NOT IN (${values})`);
          }
          break;
        case "$exists":
          if (val) {
            conditions.push(`${key} IS NOT NULL`);
          } else {
            conditions.push(`${key} IS NULL`);
          }
          break;
        case "$contains":
          // Upstash may support LIKE or CONTAINS depending on version
          conditions.push(`${key} CONTAINS ${this.formatValue(val)}`);
          break;
        case "$startsWith":
          // Use GLOB or LIKE pattern
          conditions.push(`${key} GLOB ${this.formatValue(`${val}*`)}`);
          break;
        case "$endsWith":
          // Use GLOB or LIKE pattern
          conditions.push(`${key} GLOB ${this.formatValue(`*${val}`)}`);
          break;
        default:
          // Unknown operator, treat as equality
          conditions.push(this.formatCondition(key, "=", val));
      }
    }

    return conditions.join(" AND ");
  }

  /**
   * Format a condition for Upstash filter syntax
   */
  private formatCondition(field: string, operator: string, value: unknown): string {
    return `${field} ${operator} ${this.formatValue(value)}`;
  }

  /**
   * Format a value for Upstash filter syntax
   */
  private formatValue(value: unknown): string {
    if (typeof value === "string") {
      // Escape single quotes and wrap in single quotes
      return `'${value.replace(/'/g, "''")}'`;
    }
    if (typeof value === "number" || typeof value === "boolean") {
      return String(value);
    }
    if (value === null || value === undefined) {
      return "NULL";
    }
    // For arrays and objects, stringify
    return `'${JSON.stringify(value).replace(/'/g, "''")}'`;
  }
}
