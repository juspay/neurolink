/**
 * LibSQL/Turso Vector Store Adapter
 * Implements vector similarity search using LibSQL with native vector support
 *
 * LibSQL is a SQLite fork with native vector support, offering:
 * - Local file-based databases
 * - Turso cloud hosting (serverless SQLite)
 * - Embedded replicas (local + cloud sync)
 *
 * @see https://docs.turso.tech/features/ai-and-embeddings
 * @see https://github.com/tursodatabase/libsql
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
  SimilarityMetric,
} from "../types.js";

/**
 * LibSQL configuration options
 */
export type LibSQLConfig = {
  /** Store name for identification */
  name?: string;
  /** Connection timeout in ms */
  timeout?: number;
  /** Maximum retries for operations */
  maxRetries?: number;
  /** Enable debug logging */
  debug?: boolean;
  /**
   * Connection mode:
   * - local: Local file-based database
   * - remote: Turso cloud connection (requires url + authToken)
   * - replica: Embedded replica (local + sync to Turso)
   */
  mode: "local" | "remote" | "replica";
  /** Database file path for local/replica mode */
  databasePath?: string;
  /** Turso database URL for remote/replica mode */
  url?: string;
  /** Turso auth token for remote/replica mode */
  authToken?: string;
  /** Sync interval in ms for replica mode (default: 60000) */
  syncInterval?: number;
  /** Encryption key for local database (optional) */
  encryptionKey?: string;
  /** Provider-specific configuration */
  [key: string]: unknown;
};

/**
 * Internal type for LibSQL client
 */
interface LibSQLClient {
  execute(sql: string | { sql: string; args: unknown[] }): Promise<LibSQLResult>;
  batch(statements: Array<{ sql: string; args: unknown[] }>): Promise<LibSQLResult[]>;
  sync?(): Promise<void>;
  close(): void;
}

interface LibSQLResult {
  columns: string[];
  rows: unknown[][];
  rowsAffected: number;
  lastInsertRowid: bigint | number | undefined;
}

/**
 * Index metadata stored in the database
 */
interface IndexMetadata {
  name: string;
  dimension: number;
  metric: SimilarityMetric;
  created_at: string;
}

/**
 * LibSQL/Turso Vector Store Adapter
 *
 * Features:
 * - Native vector support via LibSQL F32_BLOB type
 * - Local, remote (Turso), and embedded-replica modes
 * - Metadata filtering with SQL WHERE clauses
 * - Namespace support through table naming
 * - Batch operations for performance
 * - Transaction support for atomicity
 * - Automatic sync for replica mode
 *
 * Vector Operations:
 * - Uses vector_distance_cos() for cosine similarity
 * - Uses vector_distance_l2() for euclidean distance
 * - Stores vectors as F32_BLOB for efficient storage
 *
 * @example
 * // Local mode
 * const adapter = new LibSQLAdapter({
 *   mode: "local",
 *   databasePath: "./vectors.db",
 * });
 *
 * @example
 * // Turso cloud mode
 * const adapter = new LibSQLAdapter({
 *   mode: "remote",
 *   url: "libsql://your-db.turso.io",
 *   authToken: process.env.TURSO_TOKEN,
 * });
 *
 * @example
 * // Embedded replica mode
 * const adapter = new LibSQLAdapter({
 *   mode: "replica",
 *   databasePath: "./local-replica.db",
 *   url: "libsql://your-db.turso.io",
 *   authToken: process.env.TURSO_TOKEN,
 *   syncInterval: 30000,
 * });
 */
export class LibSQLAdapter extends BaseVectorStore<LibSQLConfig> {
  private client: LibSQLClient | null = null;
  private indexMetadataCache: Map<string, IndexMetadata> = new Map();
  private syncTimer: ReturnType<typeof setInterval> | null = null;

  constructor(config: LibSQLConfig) {
    super(config, "libsql" as VectorStoreName);
    this.validateConfig(config);
  }

  /**
   * Validate configuration
   */
  private validateConfig(config: LibSQLConfig): void {
    switch (config.mode) {
      case "local":
        if (!config.databasePath) {
          throw new Error("LibSQL local mode requires databasePath");
        }
        break;
      case "remote":
        if (!config.url) {
          throw new Error("LibSQL remote mode requires url");
        }
        if (!config.authToken) {
          throw new Error("LibSQL remote mode requires authToken");
        }
        break;
      case "replica":
        if (!config.databasePath) {
          throw new Error("LibSQL replica mode requires databasePath");
        }
        if (!config.url) {
          throw new Error("LibSQL replica mode requires url");
        }
        if (!config.authToken) {
          throw new Error("LibSQL replica mode requires authToken");
        }
        break;
      default:
        throw new Error(`Invalid LibSQL mode: ${config.mode}`);
    }
  }

  /**
   * Initialize connection to LibSQL database
   */
  async connect(): Promise<void> {
    if (this.initialized) {
      logger.debug("LibSQL already connected");
      return;
    }

    try {
      this.client = await this.createClient();

      // Create metadata table for tracking indexes
      await this.createMetadataTable();

      // Setup sync for replica mode
      if (this.config.mode === "replica" && this.config.syncInterval) {
        this.setupSyncTimer();
      }

      this.initialized = true;
      logger.debug("LibSQL connected successfully", {
        mode: this.config.mode,
        url: this.config.url ? this.maskUrl(this.config.url) : undefined,
        path: this.config.databasePath,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to connect to LibSQL: ${message}`);
    }
  }

  /**
   * Close the database connection
   */
  async disconnect(): Promise<void> {
    if (this.syncTimer) {
      clearInterval(this.syncTimer);
      this.syncTimer = null;
    }

    if (this.client) {
      try {
        // Final sync before disconnect for replica mode
        if (this.config.mode === "replica" && this.client.sync) {
          await this.client.sync();
        }
        this.client.close();
        this.client = null;
        this.initialized = false;
        this.indexMetadataCache.clear();
        logger.debug("LibSQL disconnected");
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        throw new Error(`Failed to disconnect from LibSQL: ${message}`);
      }
    }
  }

  /**
   * Create a new vector index (table)
   */
  async createIndex(config: VectorIndexConfig): Promise<void> {
    this.ensureInitialized();

    const { name, dimension, metric = "cosine" } = config;
    const tableName = this.sanitizeTableName(name);

    try {
      // Create the main data table with vector column
      await this.client!.execute(`
        CREATE TABLE IF NOT EXISTS "${tableName}" (
          id TEXT PRIMARY KEY,
          vector F32_BLOB(${dimension}) NOT NULL,
          metadata TEXT,
          content TEXT,
          namespace TEXT,
          created_at TEXT DEFAULT (datetime('now')),
          updated_at TEXT DEFAULT (datetime('now'))
        )
      `);

      // Create indexes for efficient filtering
      await this.client!.execute(`
        CREATE INDEX IF NOT EXISTS "idx_${tableName}_namespace"
        ON "${tableName}" (namespace)
      `);

      // Store index metadata
      await this.client!.execute({
        sql: `
          INSERT OR REPLACE INTO _vector_indexes (name, dimension, metric, created_at)
          VALUES (?, ?, ?, datetime('now'))
        `,
        args: [name, dimension, metric],
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

    const tableName = this.sanitizeTableName(indexName);

    try {
      // Drop main table
      await this.client!.execute(`DROP TABLE IF EXISTS "${tableName}"`);

      // Remove from metadata
      await this.client!.execute({
        sql: `DELETE FROM _vector_indexes WHERE name = ?`,
        args: [indexName],
      });

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
      const result = await this.client!.execute(`SELECT name FROM _vector_indexes`);
      return result.rows.map((row) => row[0] as string);
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
      const result = await this.client!.execute({
        sql: `SELECT 1 FROM _vector_indexes WHERE name = ?`,
        args: [indexName],
      });
      return result.rows.length > 0;
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

    const tableName = this.sanitizeTableName(indexName);
    const namespace = options?.namespace || null;

    // Validate dimensions
    if (records.length > 0) {
      this.validateDimensions(records.map((r) => r.vector));
    }

    try {
      // Use batch for better performance
      const statements = records.map((record) => ({
        sql: `
          INSERT INTO "${tableName}" (id, vector, metadata, content, namespace, updated_at)
          VALUES (?, vector32(?), ?, ?, ?, datetime('now'))
          ON CONFLICT(id) DO UPDATE SET
            vector = excluded.vector,
            metadata = excluded.metadata,
            content = excluded.content,
            namespace = excluded.namespace,
            updated_at = datetime('now')
        `,
        args: [
          record.id,
          this.vectorToJson(record.vector),
          record.metadata ? JSON.stringify(record.metadata) : null,
          record.content || null,
          record.namespace || namespace,
        ],
      }));

      if (statements.length > 0) {
        await this.client!.batch(statements);
      }

      logger.debug(`Upserted ${records.length} records to ${indexName}`);
      return { upsertedCount: records.length };
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

    const tableName = this.sanitizeTableName(indexName);
    const {
      vector,
      topK,
      minScore,
      filter,
      includeVectors = false,
      includeMetadata = true,
      namespace,
    } = options;

    // Get index metadata for metric type
    const indexMeta = this.indexMetadataCache.get(indexName);
    const metric = indexMeta?.metric || "cosine";

    try {
      // Build the distance function based on metric
      const distanceFunc = this.getDistanceFunction(metric);

      // Build SELECT clause
      const selectCols = ["id", "content", `${distanceFunc}(vector, vector32(?)) as distance`];
      if (includeVectors) {
        selectCols.push("vector_extract(vector) as vector_data");
      }
      if (includeMetadata) {
        selectCols.push("metadata");
      }

      // Build WHERE clause
      let whereClause = "1=1";
      const params: unknown[] = [this.vectorToJson(vector)];

      if (namespace) {
        whereClause += ` AND namespace = ?`;
        params.push(namespace);
      }

      if (filter) {
        const { sql: filterSql, params: filterParams } = this.translateFilter(filter);
        whereClause += ` AND (${filterSql})`;
        params.push(...filterParams);
      }

      // Add minScore filter (convert to distance threshold)
      if (minScore !== undefined) {
        const maxDistance = this.scoreToDistance(minScore, metric);
        whereClause += ` AND ${distanceFunc}(vector, vector32(?)) <= ?`;
        params.push(this.vectorToJson(vector), maxDistance);
      }

      const sql = `
        SELECT ${selectCols.join(", ")}
        FROM "${tableName}"
        WHERE ${whereClause}
        ORDER BY distance ASC
        LIMIT ?
      `;
      params.push(topK);

      const result = await this.client!.execute({ sql, args: params });

      // Convert results
      const results: VectorQueryResult<TMetadata>[] = [];
      const colMap = new Map(result.columns.map((col, idx) => [col, idx]));

      for (const row of result.rows) {
        const distance = row[colMap.get("distance")!] as number;
        const score = this.distanceToScore(distance, metric);

        const queryResult: VectorQueryResult<TMetadata> = {
          id: row[colMap.get("id")!] as string,
          score,
          content: (row[colMap.get("content")!] as string) || undefined,
        };

        if (includeVectors && colMap.has("vector_data")) {
          const vectorData = row[colMap.get("vector_data")!];
          queryResult.vector = this.parseVectorData(vectorData);
        }

        if (includeMetadata && colMap.has("metadata")) {
          const metadataStr = row[colMap.get("metadata")!] as string | null;
          if (metadataStr) {
            try {
              queryResult.metadata = JSON.parse(metadataStr) as TMetadata;
            } catch {
              // Ignore parse errors
            }
          }
        }

        results.push(queryResult);
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

    const tableName = this.sanitizeTableName(indexName);
    const { ids, filter, namespace, deleteAll } = options;

    try {
      let result: LibSQLResult;

      if (deleteAll) {
        // Delete all records, optionally filtered by namespace
        if (namespace) {
          result = await this.client!.execute({
            sql: `DELETE FROM "${tableName}" WHERE namespace = ?`,
            args: [namespace],
          });
        } else {
          result = await this.client!.execute(`DELETE FROM "${tableName}"`);
        }
      } else if (ids && ids.length > 0) {
        // Delete by IDs
        const placeholders = ids.map(() => "?").join(", ");
        result = await this.client!.execute({
          sql: `DELETE FROM "${tableName}" WHERE id IN (${placeholders})`,
          args: ids,
        });
      } else if (filter) {
        // Delete by filter
        const { sql: filterSql, params: filterParams } = this.translateFilter(filter);
        result = await this.client!.execute({
          sql: `DELETE FROM "${tableName}" WHERE ${filterSql}`,
          args: filterParams,
        });
      } else {
        return { deletedCount: 0 };
      }

      const deletedCount = result.rowsAffected;
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

    const tableName = this.sanitizeTableName(indexName);

    try {
      // Get count
      const countResult = await this.client!.execute(
        `SELECT COUNT(*) as count FROM "${tableName}"`,
      );
      const vectorCount = countResult.rows[0][0] as number;

      // Get namespace count
      const nsResult = await this.client!.execute(
        `SELECT COUNT(DISTINCT namespace) as count FROM "${tableName}" WHERE namespace IS NOT NULL`,
      );
      const namespaceCount = nsResult.rows[0][0] as number;

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
   * Sync with remote database (replica mode only)
   */
  async sync(): Promise<void> {
    if (this.config.mode !== "replica" || !this.client?.sync) {
      logger.debug("Sync not available in this mode");
      return;
    }

    try {
      await this.client.sync();
      logger.debug("LibSQL sync completed");
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      logger.warn(`LibSQL sync failed: ${message}`);
    }
  }

  /**
   * Translate abstract filter to SQL WHERE clause
   */
  protected translateFilter<TMetadata extends UnknownRecord>(
    filter: MetadataFilter<TMetadata>,
  ): { sql: string; params: unknown[] } {
    const conditions: string[] = [];
    const params: unknown[] = [];

    for (const [key, value] of Object.entries(filter)) {
      if (key === "$and" && Array.isArray(value)) {
        const subConditions = value.map((f) => {
          const result = this.translateFilter(f as MetadataFilter);
          params.push(...result.params);
          return `(${result.sql})`;
        });
        conditions.push(subConditions.join(" AND "));
      } else if (key === "$or" && Array.isArray(value)) {
        const subConditions = value.map((f) => {
          const result = this.translateFilter(f as MetadataFilter);
          params.push(...result.params);
          return `(${result.sql})`;
        });
        conditions.push(`(${subConditions.join(" OR ")})`);
      } else if (key === "$not" && typeof value === "object" && value !== null) {
        const result = this.translateFilter(value as MetadataFilter);
        params.push(...result.params);
        conditions.push(`NOT (${result.sql})`);
      } else if (this.isFieldFilter(value)) {
        const { sql, param } = this.translateFieldFilter(key, value as FieldFilter);
        conditions.push(sql);
        params.push(...param);
      } else {
        // Simple equality
        conditions.push(`json_extract(metadata, '$.${key}') = ?`);
        params.push(value);
      }
    }

    return {
      sql: conditions.length > 0 ? conditions.join(" AND ") : "1=1",
      params,
    };
  }

  // ===================
  // PRIVATE HELPER METHODS
  // ===================

  /**
   * Create LibSQL client based on configuration
   */
  private async createClient(): Promise<LibSQLClient> {
    try {
      // Dynamically import @libsql/client
      const modulePath = "@libsql/client";
      const { createClient } = await import(/* @vite-ignore */ modulePath);

      const clientConfig: {
        url: string;
        authToken?: string;
        syncUrl?: string;
        encryptionKey?: string;
      } = {
        url: "",
      };

      switch (this.config.mode) {
        case "local":
          clientConfig.url = `file:${this.config.databasePath}`;
          if (this.config.encryptionKey) {
            clientConfig.encryptionKey = this.config.encryptionKey;
          }
          break;
        case "remote":
          clientConfig.url = this.config.url!;
          clientConfig.authToken = this.config.authToken;
          break;
        case "replica":
          clientConfig.url = `file:${this.config.databasePath}`;
          clientConfig.syncUrl = this.config.url;
          clientConfig.authToken = this.config.authToken;
          if (this.config.encryptionKey) {
            clientConfig.encryptionKey = this.config.encryptionKey;
          }
          break;
      }

      return createClient(clientConfig);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(
        `LibSQL client not found. Install @libsql/client: npm install @libsql/client. Error: ${message}`,
      );
    }
  }

  /**
   * Create metadata table for tracking indexes
   */
  private async createMetadataTable(): Promise<void> {
    await this.client!.execute(`
      CREATE TABLE IF NOT EXISTS _vector_indexes (
        name TEXT PRIMARY KEY,
        dimension INTEGER NOT NULL,
        metric TEXT NOT NULL,
        created_at TEXT NOT NULL
      )
    `);

    // Load existing index metadata into cache
    const result = await this.client!.execute(`SELECT * FROM _vector_indexes`);
    const colMap = new Map(result.columns.map((col, idx) => [col, idx]));

    for (const row of result.rows) {
      const meta: IndexMetadata = {
        name: row[colMap.get("name")!] as string,
        dimension: row[colMap.get("dimension")!] as number,
        metric: row[colMap.get("metric")!] as SimilarityMetric,
        created_at: row[colMap.get("created_at")!] as string,
      };
      this.indexMetadataCache.set(meta.name, meta);
    }
  }

  /**
   * Setup periodic sync for replica mode
   */
  private setupSyncTimer(): void {
    const interval = this.config.syncInterval || 60000;
    this.syncTimer = setInterval(() => {
      this.sync().catch((err) => {
        logger.warn(`Periodic sync failed: ${err.message}`);
      });
    }, interval);
  }

  /**
   * Sanitize table name to prevent SQL injection
   */
  private sanitizeTableName(name: string): string {
    return name.replace(/[^a-zA-Z0-9_]/g, "_");
  }

  /**
   * Convert vector to JSON string for LibSQL vector32() function
   */
  private vectorToJson(vector: number[]): string {
    return JSON.stringify(vector);
  }

  /**
   * Parse vector data from LibSQL result
   */
  private parseVectorData(data: unknown): number[] {
    if (typeof data === "string") {
      try {
        return JSON.parse(data);
      } catch {
        return [];
      }
    }
    if (Array.isArray(data)) {
      return data as number[];
    }
    return [];
  }

  /**
   * Get the appropriate distance function for the metric
   */
  private getDistanceFunction(metric: SimilarityMetric): string {
    switch (metric) {
      case "euclidean":
        return "vector_distance_l2";
      case "dotProduct":
        // LibSQL uses cosine by default; for dot product, we use cosine
        // (normalized vectors give same ranking)
        return "vector_distance_cos";
      case "cosine":
      default:
        return "vector_distance_cos";
    }
  }

  /**
   * Convert similarity score to distance threshold
   */
  private scoreToDistance(score: number, metric: SimilarityMetric): number {
    switch (metric) {
      case "cosine":
        // Cosine distance = 1 - cosine similarity
        return 1 - score;
      case "euclidean":
        // For euclidean, we use inverse scoring: score = 1 / (1 + distance)
        // So distance = (1 / score) - 1
        return score > 0 ? (1 / score) - 1 : Infinity;
      case "dotProduct":
        // Similar to cosine for normalized vectors
        return 1 - score;
      default:
        return 1 - score;
    }
  }

  /**
   * Convert distance to similarity score
   */
  private distanceToScore(distance: number, metric: SimilarityMetric): number {
    switch (metric) {
      case "cosine":
        // Cosine similarity = 1 - cosine distance
        return 1 - distance;
      case "euclidean":
        // Convert euclidean distance to similarity score
        return 1 / (1 + distance);
      case "dotProduct":
        // Similar to cosine for normalized vectors
        return 1 - distance;
      default:
        return 1 - distance;
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
   * Translate a field filter to SQL
   */
  private translateFieldFilter(
    key: string,
    filter: FieldFilter,
  ): { sql: string; param: unknown[] } {
    const conditions: string[] = [];
    const params: unknown[] = [];

    for (const [op, val] of Object.entries(filter)) {
      const jsonPath = `json_extract(metadata, '$.${key}')`;

      switch (op) {
        case "$eq":
          conditions.push(`${jsonPath} = ?`);
          params.push(val);
          break;
        case "$ne":
          conditions.push(`${jsonPath} != ?`);
          params.push(val);
          break;
        case "$gt":
          conditions.push(`CAST(${jsonPath} AS REAL) > ?`);
          params.push(val);
          break;
        case "$gte":
          conditions.push(`CAST(${jsonPath} AS REAL) >= ?`);
          params.push(val);
          break;
        case "$lt":
          conditions.push(`CAST(${jsonPath} AS REAL) < ?`);
          params.push(val);
          break;
        case "$lte":
          conditions.push(`CAST(${jsonPath} AS REAL) <= ?`);
          params.push(val);
          break;
        case "$in":
          if (Array.isArray(val)) {
            const placeholders = val.map(() => "?").join(", ");
            conditions.push(`${jsonPath} IN (${placeholders})`);
            params.push(...val);
          }
          break;
        case "$nin":
          if (Array.isArray(val)) {
            const placeholders = val.map(() => "?").join(", ");
            conditions.push(`${jsonPath} NOT IN (${placeholders})`);
            params.push(...val);
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
          conditions.push(`${jsonPath} LIKE ?`);
          params.push(`%${val}%`);
          break;
        case "$startsWith":
          conditions.push(`${jsonPath} LIKE ?`);
          params.push(`${val}%`);
          break;
        case "$endsWith":
          conditions.push(`${jsonPath} LIKE ?`);
          params.push(`%${val}`);
          break;
        default:
          // Unknown operator, treat as equality
          conditions.push(`${jsonPath} = ?`);
          params.push(val);
      }
    }

    return {
      sql: conditions.length > 0 ? conditions.join(" AND ") : "1=1",
      param: params,
    };
  }

  /**
   * Mask URL for logging (hide auth token if present)
   */
  private maskUrl(url: string): string {
    try {
      const parsed = new URL(url);
      if (parsed.password) {
        parsed.password = "***";
      }
      return parsed.toString();
    } catch {
      return url.replace(/authToken=[^&]+/, "authToken=***");
    }
  }
}
