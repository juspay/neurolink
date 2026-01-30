/**
 * LanceDB Vector Store Adapter
 * Implements vector similarity search using LanceDB's embedded vector database
 *
 * LanceDB is a developer-friendly, serverless vector database built on the
 * Lance columnar format. It supports local file storage and cloud storage
 * (S3, Azure, GCS) with native vector search capabilities.
 *
 * @see https://lancedb.github.io/lancedb/
 */

import type { UnknownRecord } from "../../types/common.js";
import { logger } from "../../utils/logger.js";
import { BaseVectorStore } from "../BaseVectorStore.js";
import type {
  LanceDBConfig,
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
 * LanceDB Connection interface
 * Compatible with @lancedb/lancedb Connection API
 */
interface LanceDBConnection {
  createTable(
    name: string,
    data: unknown[],
    options?: { mode?: "create" | "overwrite" },
  ): Promise<LanceDBTable>;
  createEmptyTable(
    name: string,
    schema: unknown,
  ): Promise<LanceDBTable>;
  openTable(name: string): Promise<LanceDBTable>;
  dropTable(name: string): Promise<void>;
  tableNames(): Promise<string[]>;
  close(): void;
  isOpen(): boolean;
}

/**
 * LanceDB Table interface
 * Compatible with @lancedb/lancedb Table API
 */
interface LanceDBTable {
  name: string;
  add(data: unknown[]): Promise<void>;
  delete(predicate: string): Promise<void>;
  update(options: { where?: string; values?: Record<string, unknown> }): Promise<void>;
  countRows(filter?: string): Promise<number>;
  search(query: number[]): LanceDBVectorQuery;
  vectorSearch(vector: number[]): LanceDBVectorQuery;
  query(): LanceDBQuery;
  schema(): Promise<LanceDBSchema>;
  close(): void;
}

/**
 * LanceDB Query interface for filtering/scanning
 */
interface LanceDBQuery {
  where(predicate: string): LanceDBQuery;
  select(columns: string[]): LanceDBQuery;
  limit(n: number): LanceDBQuery;
  toArray(): Promise<unknown[]>;
}

/**
 * LanceDB Vector Query interface
 */
interface LanceDBVectorQuery {
  limit(n: number): LanceDBVectorQuery;
  where(predicate: string): LanceDBVectorQuery;
  select(columns: string[]): LanceDBVectorQuery;
  distanceType(metric: "l2" | "cosine" | "dot"): LanceDBVectorQuery;
  nprobes(n: number): LanceDBVectorQuery;
  refineFactor(n: number): LanceDBVectorQuery;
  toArray(): Promise<LanceDBSearchResult[]>;
}

/**
 * LanceDB Search Result
 */
interface LanceDBSearchResult {
  id: string;
  vector?: number[];
  _distance?: number;
  [key: string]: unknown;
}

/**
 * LanceDB Schema
 */
interface LanceDBSchema {
  fields: Array<{ name: string; type: unknown }>;
}

/**
 * Index metadata stored in a metadata table
 */
interface IndexMetadata {
  name: string;
  dimension: number;
  metric: SimilarityMetric;
  created_at: string;
}

/**
 * LanceDB Vector Store Adapter
 *
 * Features:
 * - Local file storage or cloud storage (S3, Azure, GCS)
 * - Arrow-based columnar format for efficient storage
 * - Native vector similarity search
 * - SQL-style metadata filtering
 * - Namespace support through separate tables
 * - Batch operations for performance
 * - Built-in full-text search capabilities
 *
 * Note: Requires the @lancedb/lancedb package to be installed:
 *   npm install @lancedb/lancedb
 */
export class LanceDBAdapter extends BaseVectorStore<LanceDBConfig> {
  private db: LanceDBConnection | null = null;
  private indexMetadataCache: Map<string, IndexMetadata> = new Map();
  private static readonly METADATA_TABLE_NAME = "_neurolink_metadata";

  constructor(config: LanceDBConfig) {
    super(config, "lance" as VectorStoreName);
  }

  /**
   * Initialize connection to LanceDB database
   * Creates the database directory if it doesn't exist (for local storage)
   */
  async connect(): Promise<void> {
    if (this.initialized) {
      logger.debug("LanceDB already connected");
      return;
    }

    try {
      // Dynamically import @lancedb/lancedb
      const lancedb = await this.loadLanceDBDriver();

      // Build connection options
      const connectionOptions: Record<string, unknown> = {};

      if (this.config.storageOptions) {
        connectionOptions.storageOptions = this.config.storageOptions;
      }

      if (this.config.readConsistency) {
        connectionOptions.readConsistencyInterval =
          this.config.readConsistency === "strong" ? 0 : undefined;
      }

      // Connect to database
      this.db = await lancedb.connect(this.config.uri, connectionOptions);

      // Initialize metadata table for tracking indexes
      await this.initializeMetadataTable();

      this.initialized = true;
      logger.debug("LanceDB connected successfully", {
        uri: this.config.uri,
        isCloud: this.isCloudStorage(),
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to connect to LanceDB: ${message}`);
    }
  }

  /**
   * Close the database connection
   */
  async disconnect(): Promise<void> {
    if (this.db) {
      try {
        this.db.close();
        this.db = null;
        this.initialized = false;
        this.indexMetadataCache.clear();
        logger.debug("LanceDB disconnected");
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        throw new Error(`Failed to disconnect from LanceDB: ${message}`);
      }
    }
  }

  /**
   * Create a new vector index (table)
   * In LanceDB, each index is represented as a separate table
   */
  async createIndex(config: VectorIndexConfig): Promise<void> {
    this.ensureInitialized();

    const { name, dimension, metric = "cosine" } = config;
    const tableName = this.getTableName(name);

    try {
      // Check if table already exists
      const existingTables = await this.db!.tableNames();
      if (existingTables.includes(tableName)) {
        logger.debug(`Index ${name} already exists`);
        return;
      }

      // Create table with a sample record to establish schema
      // LanceDB infers schema from the first record
      const sampleVector = new Array(dimension).fill(0);
      const sampleRecord = {
        id: "__schema_init__",
        vector: sampleVector,
        metadata: JSON.stringify({}),
        content: "",
        namespace: "",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const table = await this.db!.createTable(tableName, [sampleRecord], {
        mode: "create",
      });

      // Delete the sample record
      await table.delete("id = '__schema_init__'");

      // Store index metadata
      await this.storeIndexMetadata({
        name,
        dimension,
        metric,
        created_at: new Date().toISOString(),
      });

      this.indexMetadataCache.set(name, {
        name,
        dimension,
        metric,
        created_at: new Date().toISOString(),
      });

      logger.debug(`Created index ${name}`, { dimension, metric });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to create index ${name}: ${message}`);
    }
  }

  /**
   * Delete an index (table)
   */
  async deleteIndex(indexName: string): Promise<void> {
    this.ensureInitialized();

    const tableName = this.getTableName(indexName);

    try {
      await this.db!.dropTable(tableName);
      await this.deleteIndexMetadata(indexName);
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
      const tableNames = await this.db!.tableNames();
      // Filter out metadata table and convert back to index names
      return tableNames
        .filter((name) => name !== LanceDBAdapter.METADATA_TABLE_NAME)
        .map((name) => this.getIndexNameFromTable(name));
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
      const tableName = this.getTableName(indexName);
      const tableNames = await this.db!.tableNames();
      return tableNames.includes(tableName);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to check index existence: ${message}`);
    }
  }

  /**
   * Upsert vectors into the index
   * LanceDB supports efficient append operations and merge inserts
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

    const tableName = this.getTableName(indexName);
    const namespace = options?.namespace || "";

    // Validate dimensions
    this.validateDimensions(records.map((r) => r.vector));

    try {
      const table = await this.db!.openTable(tableName);

      // For each record, first try to delete existing (for upsert behavior)
      // then add the new record
      const lanceRecords = records.map((record) => ({
        id: record.id,
        vector: record.vector,
        metadata: record.metadata ? JSON.stringify(record.metadata) : "{}",
        content: record.content || "",
        namespace: record.namespace || namespace,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }));

      // Delete existing records with matching IDs for upsert behavior
      const ids = records.map((r) => `'${this.escapeString(r.id)}'`).join(", ");
      try {
        await table.delete(`id IN (${ids})`);
      } catch {
        // Ignore delete errors - records may not exist
      }

      // Add new records
      await table.add(lanceRecords);

      logger.debug(`Upserted ${records.length} records to ${indexName}`);
      return { upsertedCount: records.length };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to upsert records: ${message}`);
    }
  }

  /**
   * Query vectors by similarity
   * Uses LanceDB's native vector search with optional filtering
   */
  async query<TMetadata extends UnknownRecord = UnknownRecord>(
    indexName: string,
    options: VectorQueryOptions<TMetadata>,
  ): Promise<VectorQueryResult<TMetadata>[]> {
    this.ensureInitialized();

    const tableName = this.getTableName(indexName);
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
      const table = await this.db!.openTable(tableName);

      // Get index metadata for metric type
      const indexMeta = this.indexMetadataCache.get(indexName);
      const metric = indexMeta?.metric || "cosine";

      // Build vector search query
      let searchQuery = table.vectorSearch(vector);

      // Set distance type based on metric
      searchQuery = searchQuery.distanceType(this.metricToDistanceType(metric));

      // Apply limit (fetch more than needed for minScore filtering)
      searchQuery = searchQuery.limit(topK * 2);

      // Build filter predicate
      const predicates: string[] = [];

      if (namespace) {
        predicates.push(`namespace = '${this.escapeString(namespace)}'`);
      }

      if (filter) {
        const filterPredicate = this.translateFilter(filter);
        if (filterPredicate && filterPredicate !== "1=1") {
          predicates.push(filterPredicate);
        }
      }

      if (predicates.length > 0) {
        searchQuery = searchQuery.where(predicates.join(" AND "));
      }

      // Select columns
      const selectColumns = ["id", "_distance"];
      if (includeMetadata) {
        selectColumns.push("metadata", "content");
      }
      if (includeVectors) {
        selectColumns.push("vector");
      }
      searchQuery = searchQuery.select(selectColumns);

      // Execute query
      const rawResults = await searchQuery.toArray();

      // Convert results
      const results: VectorQueryResult<TMetadata>[] = [];

      for (const row of rawResults) {
        // Convert distance to similarity score
        const score = this.distanceToScore(
          row._distance as number,
          metric,
        );

        // Apply minimum score filter
        if (minScore !== undefined && score < minScore) {
          continue;
        }

        const result: VectorQueryResult<TMetadata> = {
          id: row.id as string,
          score,
        };

        if (includeVectors && row.vector) {
          result.vector = row.vector as number[];
        }

        if (includeMetadata) {
          if (row.metadata) {
            try {
              result.metadata = JSON.parse(row.metadata as string) as TMetadata;
            } catch {
              // Ignore parse errors
            }
          }
          if (row.content) {
            result.content = row.content as string;
          }
        }

        results.push(result);

        // Stop once we have enough results
        if (results.length >= topK) {
          break;
        }
      }

      return results;
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

    const tableName = this.getTableName(indexName);
    const { ids, filter, namespace, deleteAll } = options;

    try {
      const table = await this.db!.openTable(tableName);

      // Get count before delete for reporting
      let countBefore = 0;
      try {
        countBefore = await table.countRows();
      } catch {
        // Ignore count errors
      }

      if (deleteAll) {
        // Delete all records, optionally filtered by namespace
        if (namespace) {
          await table.delete(`namespace = '${this.escapeString(namespace)}'`);
        } else {
          // Delete all - use a predicate that matches everything
          await table.delete("id IS NOT NULL");
        }
      } else if (ids && ids.length > 0) {
        // Delete by IDs
        const idList = ids.map((id) => `'${this.escapeString(id)}'`).join(", ");
        await table.delete(`id IN (${idList})`);
      } else if (filter) {
        // Delete by filter
        const predicate = this.translateFilter(filter);
        if (predicate && predicate !== "1=1") {
          await table.delete(predicate);
        }
      }

      // Get count after delete
      let countAfter = 0;
      try {
        countAfter = await table.countRows();
      } catch {
        // Ignore count errors
      }

      const deletedCount = Math.max(0, countBefore - countAfter);
      logger.debug(`Deleted ${deletedCount} records from ${indexName}`);
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

    const tableName = this.getTableName(indexName);

    try {
      const table = await this.db!.openTable(tableName);

      // Get total count
      const vectorCount = await table.countRows();

      // Get namespace count
      let namespaceCount = 0;
      try {
        const namespaces = await table
          .query()
          .select(["namespace"])
          .toArray();
        const uniqueNamespaces = new Set(
          namespaces
            .map((r) => (r as { namespace: string }).namespace)
            .filter((ns) => ns && ns !== ""),
        );
        namespaceCount = uniqueNamespaces.size;
      } catch {
        // Ignore namespace count errors
      }

      // Get dimension from metadata
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
   * Translate abstract filter to SQL WHERE clause for LanceDB
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
        const subCondition = this.translateFilter(value as MetadataFilter);
        conditions.push(`NOT (${subCondition})`);
      } else if (this.isFieldFilter(value)) {
        const fieldCondition = this.translateFieldFilter(
          key,
          value as FieldFilter,
        );
        if (fieldCondition) {
          conditions.push(fieldCondition);
        }
      } else {
        // Simple equality - extract from JSON metadata
        conditions.push(
          `json_extract(metadata, '$.${key}') = ${this.valueToSQL(value)}`,
        );
      }
    }

    return conditions.length > 0 ? conditions.join(" AND ") : "1=1";
  }

  // ===================
  // PRIVATE HELPER METHODS
  // ===================

  /**
   * Load LanceDB driver dynamically
   */
  private async loadLanceDBDriver(): Promise<{
    connect(uri: string, options?: Record<string, unknown>): Promise<LanceDBConnection>;
  }> {
    try {
      const modulePath = "@lancedb/lancedb";
      const module = await import(/* @vite-ignore */ modulePath);
      return module;
    } catch {
      throw new Error(
        "LanceDB driver not found. Install @lancedb/lancedb: npm install @lancedb/lancedb",
      );
    }
  }

  /**
   * Check if using cloud storage
   */
  private isCloudStorage(): boolean {
    const uri = this.config.uri.toLowerCase();
    return (
      uri.startsWith("s3://") ||
      uri.startsWith("s3+ddb://") ||
      uri.startsWith("az://") ||
      uri.startsWith("gs://")
    );
  }

  /**
   * Initialize metadata table for tracking index configurations
   */
  private async initializeMetadataTable(): Promise<void> {
    try {
      const tableNames = await this.db!.tableNames();

      if (!tableNames.includes(LanceDBAdapter.METADATA_TABLE_NAME)) {
        // Create metadata table
        await this.db!.createTable(
          LanceDBAdapter.METADATA_TABLE_NAME,
          [{
            index_name: "__init__",
            dimension: 0,
            metric: "cosine",
            created_at: new Date().toISOString(),
          }],
          { mode: "create" },
        );

        // Delete the init record
        const table = await this.db!.openTable(LanceDBAdapter.METADATA_TABLE_NAME);
        await table.delete("index_name = '__init__'");
      }

      // Load existing metadata into cache
      await this.loadIndexMetadataCache();
    } catch (error) {
      logger.debug("Failed to initialize metadata table", { error });
      // Continue without metadata table - will work but without caching
    }
  }

  /**
   * Load index metadata from table into cache
   */
  private async loadIndexMetadataCache(): Promise<void> {
    try {
      const table = await this.db!.openTable(LanceDBAdapter.METADATA_TABLE_NAME);
      const rows = await table.query().toArray();

      for (const row of rows) {
        const typedRow = row as {
          index_name: string;
          dimension: number;
          metric: string;
          created_at: string;
        };

        this.indexMetadataCache.set(typedRow.index_name, {
          name: typedRow.index_name,
          dimension: typedRow.dimension,
          metric: typedRow.metric as SimilarityMetric,
          created_at: typedRow.created_at,
        });
      }
    } catch {
      // Ignore cache loading errors
    }
  }

  /**
   * Store index metadata in the metadata table
   */
  private async storeIndexMetadata(metadata: IndexMetadata): Promise<void> {
    try {
      const table = await this.db!.openTable(LanceDBAdapter.METADATA_TABLE_NAME);

      // Delete existing entry if any
      try {
        await table.delete(`index_name = '${this.escapeString(metadata.name)}'`);
      } catch {
        // Ignore
      }

      // Add new entry
      await table.add([{
        index_name: metadata.name,
        dimension: metadata.dimension,
        metric: metadata.metric,
        created_at: metadata.created_at,
      }]);
    } catch (error) {
      logger.debug("Failed to store index metadata", { error });
    }
  }

  /**
   * Delete index metadata from the metadata table
   */
  private async deleteIndexMetadata(indexName: string): Promise<void> {
    try {
      const table = await this.db!.openTable(LanceDBAdapter.METADATA_TABLE_NAME);
      await table.delete(`index_name = '${this.escapeString(indexName)}'`);
    } catch {
      // Ignore
    }
  }

  /**
   * Convert index name to table name
   * Sanitizes the name for use as a table identifier
   */
  private getTableName(indexName: string): string {
    // Replace invalid characters with underscores
    return `idx_${indexName.replace(/[^a-zA-Z0-9_]/g, "_")}`;
  }

  /**
   * Extract index name from table name
   */
  private getIndexNameFromTable(tableName: string): string {
    if (tableName.startsWith("idx_")) {
      return tableName.substring(4);
    }
    return tableName;
  }

  /**
   * Escape string for SQL
   */
  private escapeString(str: string): string {
    return str.replace(/'/g, "''");
  }

  /**
   * Convert value to SQL literal
   */
  private valueToSQL(value: unknown): string {
    if (value === null || value === undefined) {
      return "NULL";
    }
    if (typeof value === "string") {
      return `'${this.escapeString(value)}'`;
    }
    if (typeof value === "number") {
      return String(value);
    }
    if (typeof value === "boolean") {
      return value ? "TRUE" : "FALSE";
    }
    return `'${this.escapeString(JSON.stringify(value))}'`;
  }

  /**
   * Convert similarity metric to LanceDB distance type
   */
  private metricToDistanceType(metric: SimilarityMetric): "l2" | "cosine" | "dot" {
    switch (metric) {
      case "euclidean":
        return "l2";
      case "dotProduct":
        return "dot";
      case "cosine":
      default:
        return "cosine";
    }
  }

  /**
   * Convert distance to similarity score
   */
  private distanceToScore(distance: number, metric: SimilarityMetric): number {
    switch (metric) {
      case "euclidean":
        // For L2 distance, lower is better
        // Convert to similarity: 1 / (1 + distance)
        return 1 / (1 + distance);
      case "dotProduct":
        // Dot product is already a similarity score
        // LanceDB returns it negated as distance, so negate back
        return -distance;
      case "cosine":
      default:
        // Cosine distance is 1 - cosine_similarity
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
   * Translate a field filter to SQL
   */
  private translateFieldFilter(key: string, filter: FieldFilter): string {
    const conditions: string[] = [];
    const jsonPath = `json_extract(metadata, '$.${key}')`;

    for (const [op, val] of Object.entries(filter)) {
      switch (op) {
        case "$eq":
          conditions.push(`${jsonPath} = ${this.valueToSQL(val)}`);
          break;
        case "$ne":
          conditions.push(`${jsonPath} != ${this.valueToSQL(val)}`);
          break;
        case "$gt":
          conditions.push(`CAST(${jsonPath} AS REAL) > ${val}`);
          break;
        case "$gte":
          conditions.push(`CAST(${jsonPath} AS REAL) >= ${val}`);
          break;
        case "$lt":
          conditions.push(`CAST(${jsonPath} AS REAL) < ${val}`);
          break;
        case "$lte":
          conditions.push(`CAST(${jsonPath} AS REAL) <= ${val}`);
          break;
        case "$in":
          if (Array.isArray(val)) {
            const inValues = val.map((v) => this.valueToSQL(v)).join(", ");
            conditions.push(`${jsonPath} IN (${inValues})`);
          }
          break;
        case "$nin":
          if (Array.isArray(val)) {
            const ninValues = val.map((v) => this.valueToSQL(v)).join(", ");
            conditions.push(`${jsonPath} NOT IN (${ninValues})`);
          }
          break;
        case "$exists":
          if (val) {
            conditions.push(`${jsonPath} IS NOT NULL`);
          } else {
            conditions.push(`${jsonPath} IS NULL`);
          }
          break;
        case "$contains":
          conditions.push(`${jsonPath} LIKE '%${this.escapeString(String(val))}%'`);
          break;
        case "$startsWith":
          conditions.push(`${jsonPath} LIKE '${this.escapeString(String(val))}%'`);
          break;
        case "$endsWith":
          conditions.push(`${jsonPath} LIKE '%${this.escapeString(String(val))}'`);
          break;
        default:
          // Unknown operator, treat as equality
          conditions.push(`${jsonPath} = ${this.valueToSQL(val)}`);
      }
    }

    return conditions.length > 0 ? conditions.join(" AND ") : "";
  }
}
