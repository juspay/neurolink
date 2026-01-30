/**
 * DuckDB Vector Store Adapter
 * Implements vector similarity search using DuckDB with the VSS extension
 *
 * DuckDB is an embedded analytical database that provides efficient vector
 * similarity search through its VSS extension. Supports in-memory and
 * file-based modes with SQL-based queries.
 *
 * @see https://duckdb.org/docs/extensions/vss
 */

import type { UnknownRecord } from "../../types/common.js";
import { logger } from "../../utils/logger.js";
import { BaseVectorStore } from "../BaseVectorStore.js";
import type {
  DuckDBConfig,
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
 * Internal type for DuckDB database interface
 * Compatible with duckdb-async API
 */
interface DuckDBDatabase {
  run(sql: string, ...params: unknown[]): Promise<void>;
  exec(sql: string): Promise<void>;
  all<T = unknown>(sql: string, ...params: unknown[]): Promise<T[]>;
  get<T = unknown>(sql: string, ...params: unknown[]): Promise<T | undefined>;
  close(): Promise<void>;
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
 * Row result from vector query
 */
interface VectorRow {
  id: string;
  vector: string; // JSON array string in DuckDB
  metadata: string | null;
  content: string | null;
  namespace: string | null;
}

/**
 * DuckDB Vector Store Adapter
 *
 * Features:
 * - In-memory or file-based DuckDB databases
 * - Vector similarity search using VSS extension (HNSW indexes)
 * - Metadata filtering with SQL WHERE clauses
 * - Namespace support through column filtering
 * - Batch operations for performance
 * - Support for cosine, L2 (euclidean), and inner product (dot product) metrics
 *
 * Note: Requires the duckdb package to be installed.
 *   npm install duckdb-async
 */
export class DuckDBAdapter extends BaseVectorStore<DuckDBConfig> {
  private db: DuckDBDatabase | null = null;
  private indexMetadataCache: Map<string, IndexMetadata> = new Map();
  private vssExtensionLoaded: boolean = false;

  constructor(config: DuckDBConfig) {
    super(config, "duckdb" as VectorStoreName);
  }

  /**
   * Initialize connection to DuckDB database
   * Creates the database file if it doesn't exist
   */
  async connect(): Promise<void> {
    if (this.initialized) {
      logger.debug("DuckDB already connected");
      return;
    }

    try {
      // Dynamically import duckdb
      const Database = await this.loadDuckDBDriver();

      const dbPath = this.config.inMemory ? ":memory:" : this.config.databasePath;

      // Create database instance
      this.db = await Database.create(dbPath) as DuckDBDatabase;

      // Load VSS extension for vector similarity search
      await this.loadVSSExtension();

      // Create metadata table for tracking indexes
      await this.createMetadataTable();

      this.initialized = true;
      logger.debug("DuckDB connected successfully", {
        path: dbPath,
        inMemory: this.config.inMemory,
        vssEnabled: this.vssExtensionLoaded,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to connect to DuckDB: ${message}`);
    }
  }

  /**
   * Close the database connection
   */
  async disconnect(): Promise<void> {
    if (this.db) {
      try {
        await this.db.close();
        this.db = null;
        this.initialized = false;
        this.indexMetadataCache.clear();
        this.vssExtensionLoaded = false;
        logger.debug("DuckDB disconnected");
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        throw new Error(`Failed to disconnect from DuckDB: ${message}`);
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
      // Create the main data table with FLOAT array for vectors
      await this.db!.exec(`
        CREATE TABLE IF NOT EXISTS "${tableName}" (
          id VARCHAR PRIMARY KEY,
          vector FLOAT[${dimension}] NOT NULL,
          metadata JSON,
          content VARCHAR,
          namespace VARCHAR,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Create namespace index for efficient filtering
      await this.db!.exec(`
        CREATE INDEX IF NOT EXISTS "idx_${tableName}_namespace"
        ON "${tableName}" (namespace)
      `);

      // Try to create HNSW index for vector search if VSS extension is loaded
      if (this.vssExtensionLoaded) {
        const duckdbMetric = this.toDuckDBMetric(metric);
        try {
          await this.db!.exec(`
            CREATE INDEX IF NOT EXISTS "idx_${tableName}_vector"
            ON "${tableName}"
            USING HNSW (vector)
            WITH (metric = '${duckdbMetric}')
          `);
          logger.debug(`Created HNSW index for ${tableName} with ${duckdbMetric} metric`);
        } catch (err) {
          // HNSW index creation may fail on some DuckDB versions
          logger.warn(`Failed to create HNSW index for ${tableName}, using brute-force search`, {
            error: err instanceof Error ? err.message : String(err),
          });
        }
      }

      // Store index metadata
      await this.db!.run(
        `INSERT OR REPLACE INTO _vector_indexes (name, dimension, metric, created_at)
         VALUES (?, ?, ?, CURRENT_TIMESTAMP)`,
        name,
        dimension,
        metric,
      );

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
      // Drop main table (HNSW index is dropped automatically)
      await this.db!.exec(`DROP TABLE IF EXISTS "${tableName}"`);

      // Remove from metadata
      await this.db!.run(`DELETE FROM _vector_indexes WHERE name = ?`, indexName);

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
      const rows = await this.db!.all<{ name: string }>(
        `SELECT name FROM _vector_indexes`,
      );
      return rows.map((row) => row.name);
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
      const row = await this.db!.get<{ exists: number }>(
        `SELECT 1 as exists FROM _vector_indexes WHERE name = ?`,
        indexName,
      );
      return row !== undefined;
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

    const tableName = this.sanitizeTableName(indexName);
    const namespace = options?.namespace || null;

    // Validate dimensions
    this.validateDimensions(records.map((r) => r.vector));

    try {
      let upsertedCount = 0;

      for (const record of records) {
        const vectorJson = JSON.stringify(record.vector);
        const metadataJson = record.metadata
          ? JSON.stringify(record.metadata)
          : null;

        // DuckDB uses INSERT OR REPLACE for upsert behavior
        await this.db!.run(
          `INSERT OR REPLACE INTO "${tableName}" (id, vector, metadata, content, namespace, updated_at)
           VALUES (?, ${vectorJson}::FLOAT[], ?::JSON, ?, ?, CURRENT_TIMESTAMP)`,
          record.id,
          metadataJson,
          record.content || null,
          record.namespace || namespace,
        );
        upsertedCount++;
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

    try {
      // Get index metadata for metric type
      const indexMeta = this.indexMetadataCache.get(indexName) ||
        await this.loadIndexMetadata(indexName);
      const metric = indexMeta?.metric || "cosine";

      // Build the similarity expression based on metric
      const vectorJson = JSON.stringify(vector);
      const { scoreExpr, orderDirection } = this.getSimilarityExpression(
        `vector`,
        `${vectorJson}::FLOAT[]`,
        metric,
      );

      // Build query with optional filters
      let sql = `
        SELECT
          id,
          ${includeVectors ? "vector," : ""}
          metadata,
          content,
          ${scoreExpr} AS score
        FROM "${tableName}"
        WHERE 1=1
      `;
      const params: unknown[] = [];

      if (namespace) {
        sql += ` AND namespace = ?`;
        params.push(namespace);
      }

      if (filter) {
        const { sql: filterSql, params: filterParams } = this.translateFilter(filter);
        sql += ` AND (${filterSql})`;
        params.push(...filterParams);
      }

      // Add score filter if specified
      if (minScore !== undefined) {
        sql += ` AND ${scoreExpr} >= ?`;
        params.push(minScore);
      }

      // Order by similarity and limit
      sql += ` ORDER BY score ${orderDirection} LIMIT ?`;
      params.push(topK);

      const rows = await this.db!.all<VectorRow & { score: number }>(sql, ...params);

      // Transform results
      const results: VectorQueryResult<TMetadata>[] = rows.map((row) => {
        const result: VectorQueryResult<TMetadata> = {
          id: row.id,
          score: row.score,
          content: row.content || undefined,
        };

        if (includeVectors && row.vector) {
          result.vector = this.parseVectorString(row.vector);
        }

        if (includeMetadata && row.metadata) {
          try {
            result.metadata = JSON.parse(row.metadata) as TMetadata;
          } catch {
            // Ignore parse errors
          }
        }

        return result;
      });

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
      let sql: string;
      const params: unknown[] = [];

      if (deleteAll) {
        // Delete all records, optionally filtered by namespace
        if (namespace) {
          sql = `DELETE FROM "${tableName}" WHERE namespace = ?`;
          params.push(namespace);
        } else {
          sql = `DELETE FROM "${tableName}"`;
        }
      } else if (ids && ids.length > 0) {
        // Delete by IDs
        const placeholders = ids.map(() => "?").join(", ");
        sql = `DELETE FROM "${tableName}" WHERE id IN (${placeholders})`;
        params.push(...ids);
      } else if (filter) {
        // Delete by filter
        const { sql: filterSql, params: filterParams } = this.translateFilter(filter);
        sql = `DELETE FROM "${tableName}" WHERE ${filterSql}`;
        params.push(...filterParams);
      } else {
        return { deletedCount: 0 };
      }

      // DuckDB doesn't return row count directly from run, so we count first
      const countSql = sql.replace(/^DELETE FROM/, "SELECT COUNT(*) as count FROM");
      const countResult = await this.db!.get<{ count: number }>(countSql, ...params);
      const deletedCount = countResult?.count || 0;

      await this.db!.run(sql, ...params);

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
      const countResult = await this.db!.get<{ count: number }>(
        `SELECT COUNT(*) as count FROM "${tableName}"`,
      );

      // Get namespace count
      const nsResult = await this.db!.get<{ count: number }>(
        `SELECT COUNT(DISTINCT namespace) as count FROM "${tableName}" WHERE namespace IS NOT NULL`,
      );

      // Get dimension from metadata
      const meta = this.indexMetadataCache.get(indexName) ||
        await this.loadIndexMetadata(indexName);

      return {
        vectorCount: countResult?.count || 0,
        dimension: meta?.dimension,
        namespaceCount: nsResult?.count || 0,
        metrics: {
          metric: meta?.metric || "cosine",
          vssEnabled: this.vssExtensionLoaded,
        },
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to get stats for ${indexName}: ${message}`);
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
        // Simple equality - use JSON extraction
        conditions.push(`metadata->>'${key}' = ?`);
        params.push(String(value));
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
   * Load DuckDB driver dynamically
   */
  private async loadDuckDBDriver(): Promise<{ create: (path: string) => Promise<DuckDBDatabase> }> {
    try {
      // Try duckdb-async first (recommended)
      const modulePath = "duckdb-async";
      const module = await import(/* @vite-ignore */ modulePath);
      return {
        create: async (path: string) => {
          const Database = module.Database;
          return Database.create(path);
        },
      };
    } catch {
      try {
        // Fall back to duckdb with promisified API
        const modulePath = "duckdb";
        const duckdb = await import(/* @vite-ignore */ modulePath);
        return {
          create: (path: string) => {
            return new Promise((resolve, reject) => {
              const db = new duckdb.Database(path, (err: Error | null) => {
                if (err) {
                  reject(err);
                  return;
                }
                // Wrap synchronous API with async wrappers
                resolve(this.wrapSyncDatabase(db));
              });
            });
          },
        };
      } catch {
        throw new Error(
          "DuckDB driver not found. Install duckdb-async: npm install duckdb-async",
        );
      }
    }
  }

  /**
   * Wrap synchronous DuckDB API with async interface
   */
  private wrapSyncDatabase(db: unknown): DuckDBDatabase {
    const syncDb = db as {
      run(sql: string, ...params: unknown[]): void;
      exec(sql: string): void;
      all(sql: string, ...params: unknown[]): unknown[];
      get(sql: string, ...params: unknown[]): unknown;
      close(): void;
    };

    return {
      run: async (sql: string, ...params: unknown[]) => {
        return new Promise<void>((resolve, reject) => {
          try {
            syncDb.run(sql, ...params);
            resolve();
          } catch (err) {
            reject(err);
          }
        });
      },
      exec: async (sql: string) => {
        return new Promise<void>((resolve, reject) => {
          try {
            syncDb.exec(sql);
            resolve();
          } catch (err) {
            reject(err);
          }
        });
      },
      all: async <T>(sql: string, ...params: unknown[]): Promise<T[]> => {
        return new Promise((resolve, reject) => {
          try {
            const result = syncDb.all(sql, ...params) as T[];
            resolve(result);
          } catch (err) {
            reject(err);
          }
        });
      },
      get: async <T>(sql: string, ...params: unknown[]): Promise<T | undefined> => {
        return new Promise((resolve, reject) => {
          try {
            const result = syncDb.get(sql, ...params) as T | undefined;
            resolve(result);
          } catch (err) {
            reject(err);
          }
        });
      },
      close: async () => {
        return new Promise<void>((resolve, reject) => {
          try {
            syncDb.close();
            resolve();
          } catch (err) {
            reject(err);
          }
        });
      },
    };
  }

  /**
   * Load VSS extension for vector operations
   */
  private async loadVSSExtension(): Promise<void> {
    try {
      // Install and load the VSS extension
      await this.db!.exec(`INSTALL vss`);
      await this.db!.exec(`LOAD vss`);
      this.vssExtensionLoaded = true;
      logger.debug("DuckDB VSS extension loaded successfully");
    } catch (error) {
      // VSS extension may not be available in all DuckDB builds
      logger.warn("DuckDB VSS extension not available, using fallback similarity calculations", {
        error: error instanceof Error ? error.message : String(error),
      });
      this.vssExtensionLoaded = false;
    }
  }

  /**
   * Create metadata table for tracking indexes
   */
  private async createMetadataTable(): Promise<void> {
    await this.db!.exec(`
      CREATE TABLE IF NOT EXISTS _vector_indexes (
        name VARCHAR PRIMARY KEY,
        dimension INTEGER NOT NULL,
        metric VARCHAR NOT NULL,
        created_at TIMESTAMP NOT NULL
      )
    `);

    // Load existing index metadata into cache
    const rows = await this.db!.all<IndexMetadata>(`SELECT * FROM _vector_indexes`);
    for (const row of rows) {
      this.indexMetadataCache.set(row.name, row);
    }
  }

  /**
   * Load index metadata from database
   */
  private async loadIndexMetadata(indexName: string): Promise<IndexMetadata | undefined> {
    const row = await this.db!.get<IndexMetadata>(
      `SELECT * FROM _vector_indexes WHERE name = ?`,
      indexName,
    );
    if (row) {
      this.indexMetadataCache.set(indexName, row);
    }
    return row;
  }

  /**
   * Sanitize table name to prevent SQL injection
   */
  private sanitizeTableName(name: string): string {
    // Only allow alphanumeric characters and underscores
    return name.replace(/[^a-zA-Z0-9_]/g, "_");
  }

  /**
   * Convert NeuroLink similarity metric to DuckDB metric name
   */
  private toDuckDBMetric(metric: SimilarityMetric): string {
    switch (metric) {
      case "euclidean":
        return "l2sq"; // L2 squared distance
      case "dotProduct":
        return "ip"; // Inner product
      case "cosine":
      default:
        return "cosine";
    }
  }

  /**
   * Get similarity expression for SQL query
   */
  private getSimilarityExpression(
    vectorColumn: string,
    queryVector: string,
    metric: SimilarityMetric,
  ): { scoreExpr: string; orderDirection: string } {
    if (this.vssExtensionLoaded) {
      // Use DuckDB VSS functions
      switch (metric) {
        case "euclidean":
          // L2 distance: lower is better, convert to similarity score
          return {
            scoreExpr: `1.0 / (1.0 + array_distance(${vectorColumn}, ${queryVector}))`,
            orderDirection: "DESC",
          };
        case "dotProduct":
          // Inner product: higher is better
          return {
            scoreExpr: `array_inner_product(${vectorColumn}, ${queryVector})`,
            orderDirection: "DESC",
          };
        case "cosine":
        default:
          // Cosine similarity: higher is better (1 - cosine_distance)
          return {
            scoreExpr: `1.0 - array_cosine_distance(${vectorColumn}, ${queryVector})`,
            orderDirection: "DESC",
          };
      }
    } else {
      // Fallback: manual calculation using list functions
      // DuckDB can compute dot products and norms on arrays
      switch (metric) {
        case "euclidean":
          // Euclidean distance approximation
          return {
            scoreExpr: `1.0 / (1.0 + sqrt(list_sum(list_transform(list_zip(${vectorColumn}, ${queryVector}), x -> (x[1] - x[2]) * (x[1] - x[2])))))`,
            orderDirection: "DESC",
          };
        case "dotProduct":
          // Dot product
          return {
            scoreExpr: `list_sum(list_transform(list_zip(${vectorColumn}, ${queryVector}), x -> x[1] * x[2]))`,
            orderDirection: "DESC",
          };
        case "cosine":
        default:
          // Cosine similarity
          return {
            scoreExpr: `(
              list_sum(list_transform(list_zip(${vectorColumn}, ${queryVector}), x -> x[1] * x[2])) /
              NULLIF(
                sqrt(list_sum(list_transform(${vectorColumn}, x -> x * x))) *
                sqrt(list_sum(list_transform(${queryVector}, x -> x * x))),
                0
              )
            )`,
            orderDirection: "DESC",
          };
      }
    }
  }

  /**
   * Parse vector string from DuckDB result
   * DuckDB returns arrays as strings like "[0.1, 0.2, 0.3]"
   */
  private parseVectorString(vectorStr: string): number[] {
    try {
      return JSON.parse(vectorStr);
    } catch {
      // Handle DuckDB array format if different
      const cleaned = vectorStr.replace(/[\[\]]/g, "");
      return cleaned.split(",").map((s) => parseFloat(s.trim()));
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
      // Use JSON path extraction for metadata fields
      const jsonPath = `metadata->>'${key}'`;

      switch (op) {
        case "$eq":
          conditions.push(`${jsonPath} = ?`);
          params.push(String(val));
          break;
        case "$ne":
          conditions.push(`${jsonPath} != ?`);
          params.push(String(val));
          break;
        case "$gt":
          conditions.push(`CAST(${jsonPath} AS DOUBLE) > ?`);
          params.push(val);
          break;
        case "$gte":
          conditions.push(`CAST(${jsonPath} AS DOUBLE) >= ?`);
          params.push(val);
          break;
        case "$lt":
          conditions.push(`CAST(${jsonPath} AS DOUBLE) < ?`);
          params.push(val);
          break;
        case "$lte":
          conditions.push(`CAST(${jsonPath} AS DOUBLE) <= ?`);
          params.push(val);
          break;
        case "$in":
          if (Array.isArray(val)) {
            const placeholders = val.map(() => "?").join(", ");
            conditions.push(`${jsonPath} IN (${placeholders})`);
            params.push(...val.map(String));
          }
          break;
        case "$nin":
          if (Array.isArray(val)) {
            const placeholders = val.map(() => "?").join(", ");
            conditions.push(`${jsonPath} NOT IN (${placeholders})`);
            params.push(...val.map(String));
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
          params.push(String(val));
      }
    }

    return {
      sql: conditions.length > 0 ? conditions.join(" AND ") : "1=1",
      param: params,
    };
  }
}
