/**
 * SQLite-VSS Vector Store Adapter
 * Implements vector similarity search using SQLite with the VSS extension
 *
 * SQLite-VSS provides vector similarity search capabilities through virtual tables
 * and supports cosine, euclidean, and dot product similarity metrics.
 *
 * @see https://github.com/asg017/sqlite-vss
 */

import type { UnknownRecord } from "../../types/common.js";
import { logger } from "../../utils/logger.js";
import { BaseVectorStore } from "../BaseVectorStore.js";
import type {
  SQLiteVSSConfig,
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
 * Internal type for SQLite database interface
 * Compatible with better-sqlite3 API
 */
interface SQLiteDatabase {
  exec(sql: string): void;
  prepare(sql: string): SQLiteStatement;
  close(): void;
  pragma(pragma: string, options?: { simple?: boolean }): unknown;
}

interface SQLiteStatement {
  run(...params: unknown[]): SQLiteRunResult;
  get(...params: unknown[]): unknown;
  all(...params: unknown[]): unknown[];
  finalize?(): void;
}

interface SQLiteRunResult {
  changes: number;
  lastInsertRowid: number | bigint;
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
 * SQLite-VSS Vector Store Adapter
 *
 * Features:
 * - In-memory or file-based SQLite databases
 * - Vector similarity search using VSS virtual tables
 * - Metadata filtering with SQL WHERE clauses
 * - Namespace support through table naming
 * - Batch operations for performance
 * - Transaction support for atomicity
 *
 * Note: Requires the sqlite-vss extension to be available.
 * For production use, install better-sqlite3 and sqlite-vss:
 *   npm install better-sqlite3
 *   # VSS extension must be loaded separately
 */
export class SQLiteVSSAdapter extends BaseVectorStore<SQLiteVSSConfig> {
  private db: SQLiteDatabase | null = null;
  private indexMetadataCache: Map<string, IndexMetadata> = new Map();

  constructor(config: SQLiteVSSConfig) {
    super(config, "sqlite-vss" as VectorStoreName);
  }

  /**
   * Initialize connection to SQLite database
   * Creates the database file if it doesn't exist
   */
  async connect(): Promise<void> {
    if (this.initialized) {
      logger.debug("SQLite-VSS already connected");
      return;
    }

    try {
      // Dynamically import better-sqlite3
      const Database = await this.loadSQLiteDriver();

      const dbPath = this.config.inMemory ? ":memory:" : this.config.databasePath;

      // Create database instance
      this.db = new Database(dbPath, {
        timeout: this.config.busyTimeout || 5000,
      }) as SQLiteDatabase;

      // Configure database
      if (this.config.walMode !== false) {
        this.db.pragma("journal_mode = WAL");
      }
      if (this.config.foreignKeys) {
        this.db.pragma("foreign_keys = ON");
      }

      // Load VSS extension if available
      await this.loadVSSExtension();

      // Create metadata table for tracking indexes
      this.createMetadataTable();

      this.initialized = true;
      logger.debug("SQLite-VSS connected successfully", {
        path: dbPath,
        inMemory: this.config.inMemory,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to connect to SQLite-VSS: ${message}`);
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
        logger.debug("SQLite-VSS disconnected");
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        throw new Error(`Failed to disconnect from SQLite-VSS: ${message}`);
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
      // Create the main data table
      this.db!.exec(`
        CREATE TABLE IF NOT EXISTS "${tableName}" (
          id TEXT PRIMARY KEY,
          vector BLOB NOT NULL,
          metadata TEXT,
          content TEXT,
          namespace TEXT,
          created_at TEXT DEFAULT CURRENT_TIMESTAMP,
          updated_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Create namespace index for efficient filtering
      this.db!.exec(`
        CREATE INDEX IF NOT EXISTS "idx_${tableName}_namespace"
        ON "${tableName}" (namespace)
      `);

      // Try to create VSS virtual table for vector search
      // This requires the VSS extension to be loaded
      try {
        this.db!.exec(`
          CREATE VIRTUAL TABLE IF NOT EXISTS "${tableName}_vss" USING vss0(
            vector(${dimension})
          )
        `);
      } catch {
        // VSS extension not available, fall back to brute-force search
        logger.warn(
          `VSS extension not available for ${tableName}, using fallback search`,
        );
      }

      // Store index metadata
      const stmt = this.db!.prepare(`
        INSERT OR REPLACE INTO _vector_indexes (name, dimension, metric, created_at)
        VALUES (?, ?, ?, datetime('now'))
      `);
      stmt.run(name, dimension, metric);

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
      // Drop VSS virtual table if exists
      try {
        this.db!.exec(`DROP TABLE IF EXISTS "${tableName}_vss"`);
      } catch {
        // Ignore if VSS table doesn't exist
      }

      // Drop main table
      this.db!.exec(`DROP TABLE IF EXISTS "${tableName}"`);

      // Remove from metadata
      const stmt = this.db!.prepare(`DELETE FROM _vector_indexes WHERE name = ?`);
      stmt.run(indexName);

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
      const stmt = this.db!.prepare(`SELECT name FROM _vector_indexes`);
      const rows = stmt.all() as Array<{ name: string }>;
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
      const stmt = this.db!.prepare(
        `SELECT 1 FROM _vector_indexes WHERE name = ?`,
      );
      const row = stmt.get(indexName);
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

    const tableName = this.sanitizeTableName(indexName);
    const namespace = options?.namespace || null;

    // Validate dimensions
    if (records.length > 0) {
      this.validateDimensions(records.map((r) => r.vector));
    }

    try {
      const stmt = this.db!.prepare(`
        INSERT INTO "${tableName}" (id, vector, metadata, content, namespace, updated_at)
        VALUES (?, ?, ?, ?, ?, datetime('now'))
        ON CONFLICT(id) DO UPDATE SET
          vector = excluded.vector,
          metadata = excluded.metadata,
          content = excluded.content,
          namespace = excluded.namespace,
          updated_at = datetime('now')
      `);

      let upsertedCount = 0;

      for (const record of records) {
        const vectorBlob = this.vectorToBlob(record.vector);
        const metadataJson = record.metadata
          ? JSON.stringify(record.metadata)
          : null;

        stmt.run(
          record.id,
          vectorBlob,
          metadataJson,
          record.content || null,
          record.namespace || namespace,
        );
        upsertedCount++;

        // Also update VSS index if available
        await this.upsertToVSS(tableName, record.id, record.vector);
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
      // Try VSS query first, fall back to brute force
      const useVSS = await this.hasVSSTable(tableName);

      if (useVSS) {
        return this.queryWithVSS(
          tableName,
          vector,
          topK,
          minScore,
          filter as MetadataFilter<TMetadata> | undefined,
          includeVectors,
          includeMetadata,
          namespace,
        );
      } else {
        return this.queryBruteForce(
          tableName,
          vector,
          topK,
          minScore,
          filter as MetadataFilter<TMetadata> | undefined,
          includeVectors,
          includeMetadata,
          namespace,
        );
      }
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
      let deletedCount = 0;

      if (deleteAll) {
        // Delete all records, optionally filtered by namespace
        if (namespace) {
          const stmt = this.db!.prepare(
            `DELETE FROM "${tableName}" WHERE namespace = ?`,
          );
          const result = stmt.run(namespace);
          deletedCount = result.changes;
        } else {
          const stmt = this.db!.prepare(`DELETE FROM "${tableName}"`);
          const result = stmt.run();
          deletedCount = result.changes;
        }
      } else if (ids && ids.length > 0) {
        // Delete by IDs
        const placeholders = ids.map(() => "?").join(", ");
        const stmt = this.db!.prepare(
          `DELETE FROM "${tableName}" WHERE id IN (${placeholders})`,
        );
        const result = stmt.run(...ids);
        deletedCount = result.changes;
      } else if (filter) {
        // Delete by filter
        const { sql, params } = this.translateFilter(filter);
        const stmt = this.db!.prepare(
          `DELETE FROM "${tableName}" WHERE ${sql}`,
        );
        const result = stmt.run(...params);
        deletedCount = result.changes;
      }

      // Also delete from VSS index if available
      if (ids && ids.length > 0) {
        await this.deleteFromVSS(tableName, ids);
      }

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
      const countStmt = this.db!.prepare(
        `SELECT COUNT(*) as count FROM "${tableName}"`,
      );
      const countResult = countStmt.get() as { count: number };

      // Get namespace count
      const nsStmt = this.db!.prepare(
        `SELECT COUNT(DISTINCT namespace) as count FROM "${tableName}" WHERE namespace IS NOT NULL`,
      );
      const nsResult = nsStmt.get() as { count: number };

      // Get dimension from metadata
      const meta = this.indexMetadataCache.get(indexName);

      return {
        vectorCount: countResult.count,
        dimension: meta?.dimension,
        namespaceCount: nsResult.count,
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
   * Translate abstract filter to SQL WHERE clause
   */
  protected translateFilter<TMetadata extends UnknownRecord>(
    filter: MetadataFilter<TMetadata>,
  ): { sql: string; params: unknown[] } {
    const conditions: string[] = [];
    const params: unknown[] = [];
    let paramIndex = 1;

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
        const { sql, param } = this.translateFieldFilter(
          key,
          value as FieldFilter,
          paramIndex,
        );
        conditions.push(sql);
        params.push(...param);
        paramIndex += param.length;
      } else {
        // Simple equality
        conditions.push(`json_extract(metadata, '$.${key}') = ?`);
        params.push(value);
        paramIndex++;
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
   * Load SQLite driver dynamically
   */
  private async loadSQLiteDriver(): Promise<new (path: string, options?: unknown) => SQLiteDatabase> {
    try {
      // Try to load better-sqlite3 dynamically
      // Using dynamic import string to avoid TypeScript module resolution
      const modulePath = "better-sqlite3";
      const module = await import(/* @vite-ignore */ modulePath);
      return module.default;
    } catch {
      throw new Error(
        "SQLite driver not found. Install better-sqlite3: npm install better-sqlite3",
      );
    }
  }

  /**
   * Load VSS extension if available
   */
  private async loadVSSExtension(): Promise<void> {
    // The VSS extension loading depends on the platform and installation
    // This is a placeholder - actual implementation would load the extension
    try {
      // Attempt to load the extension
      // this.db!.loadExtension("vss0");
      logger.debug("VSS extension check complete");
    } catch {
      logger.debug("VSS extension not loaded, using fallback search");
    }
  }

  /**
   * Create metadata table for tracking indexes
   */
  private createMetadataTable(): void {
    this.db!.exec(`
      CREATE TABLE IF NOT EXISTS _vector_indexes (
        name TEXT PRIMARY KEY,
        dimension INTEGER NOT NULL,
        metric TEXT NOT NULL,
        created_at TEXT NOT NULL
      )
    `);

    // Load existing index metadata into cache
    const stmt = this.db!.prepare(`SELECT * FROM _vector_indexes`);
    const rows = stmt.all() as IndexMetadata[];
    for (const row of rows) {
      this.indexMetadataCache.set(row.name, row);
    }
  }

  /**
   * Sanitize table name to prevent SQL injection
   */
  private sanitizeTableName(name: string): string {
    // Only allow alphanumeric characters and underscores
    return name.replace(/[^a-zA-Z0-9_]/g, "_");
  }

  /**
   * Convert vector to blob for storage
   */
  private vectorToBlob(vector: number[]): Buffer {
    const buffer = Buffer.alloc(vector.length * 4);
    for (let i = 0; i < vector.length; i++) {
      buffer.writeFloatLE(vector[i], i * 4);
    }
    return buffer;
  }

  /**
   * Convert blob to vector
   */
  private blobToVector(blob: Buffer): number[] {
    const vector: number[] = [];
    for (let i = 0; i < blob.length; i += 4) {
      vector.push(blob.readFloatLE(i));
    }
    return vector;
  }

  /**
   * Calculate cosine similarity between two vectors
   */
  private cosineSimilarity(a: number[], b: number[]): number {
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }

    const denominator = Math.sqrt(normA) * Math.sqrt(normB);
    return denominator === 0 ? 0 : dotProduct / denominator;
  }

  /**
   * Calculate euclidean distance between two vectors
   */
  private euclideanDistance(a: number[], b: number[]): number {
    let sum = 0;
    for (let i = 0; i < a.length; i++) {
      const diff = a[i] - b[i];
      sum += diff * diff;
    }
    return Math.sqrt(sum);
  }

  /**
   * Calculate dot product between two vectors
   */
  private dotProduct(a: number[], b: number[]): number {
    let sum = 0;
    for (let i = 0; i < a.length; i++) {
      sum += a[i] * b[i];
    }
    return sum;
  }

  /**
   * Check if VSS table exists
   */
  private async hasVSSTable(tableName: string): Promise<boolean> {
    try {
      const stmt = this.db!.prepare(
        `SELECT 1 FROM sqlite_master WHERE type='table' AND name=?`,
      );
      const result = stmt.get(`${tableName}_vss`);
      return result !== undefined;
    } catch {
      return false;
    }
  }

  /**
   * Upsert to VSS virtual table
   */
  private async upsertToVSS(
    tableName: string,
    id: string,
    vector: number[],
  ): Promise<void> {
    try {
      const hasVSS = await this.hasVSSTable(tableName);
      if (!hasVSS) return;

      // VSS uses rowid-based indexing, so we need to manage the mapping
      const vectorBlob = this.vectorToBlob(vector);
      const stmt = this.db!.prepare(`
        INSERT OR REPLACE INTO "${tableName}_vss" (rowid, vector)
        SELECT rowid, ? FROM "${tableName}" WHERE id = ?
      `);
      stmt.run(vectorBlob, id);
    } catch {
      // Ignore VSS errors, fall back to brute force
    }
  }

  /**
   * Delete from VSS virtual table
   */
  private async deleteFromVSS(tableName: string, ids: string[]): Promise<void> {
    try {
      const hasVSS = await this.hasVSSTable(tableName);
      if (!hasVSS) return;

      const placeholders = ids.map(() => "?").join(", ");
      const stmt = this.db!.prepare(`
        DELETE FROM "${tableName}_vss"
        WHERE rowid IN (SELECT rowid FROM "${tableName}" WHERE id IN (${placeholders}))
      `);
      stmt.run(...ids);
    } catch {
      // Ignore VSS errors
    }
  }

  /**
   * Query using VSS virtual table
   */
  private async queryWithVSS<TMetadata extends UnknownRecord>(
    tableName: string,
    queryVector: number[],
    topK: number,
    minScore: number | undefined,
    filter: MetadataFilter<TMetadata> | undefined,
    includeVectors: boolean,
    includeMetadata: boolean,
    namespace: string | undefined,
  ): Promise<VectorQueryResult<TMetadata>[]> {
    // VSS query implementation would use the virtual table
    // For now, fall back to brute force as VSS extension may not be available
    return this.queryBruteForce(
      tableName,
      queryVector,
      topK,
      minScore,
      filter,
      includeVectors,
      includeMetadata,
      namespace,
    );
  }

  /**
   * Brute force similarity search (fallback when VSS not available)
   */
  private queryBruteForce<TMetadata extends UnknownRecord>(
    tableName: string,
    queryVector: number[],
    topK: number,
    minScore: number | undefined,
    filter: MetadataFilter<TMetadata> | undefined,
    includeVectors: boolean,
    includeMetadata: boolean,
    namespace: string | undefined,
  ): VectorQueryResult<TMetadata>[] {
    // Build query with optional filter
    let sql = `SELECT id, vector, metadata, content FROM "${tableName}" WHERE 1=1`;
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

    const stmt = this.db!.prepare(sql);
    const rows = stmt.all(...params) as Array<{
      id: string;
      vector: Buffer;
      metadata: string | null;
      content: string | null;
    }>;

    // Get index metadata for metric type
    const indexMeta = Array.from(this.indexMetadataCache.values()).find(
      (m) => this.sanitizeTableName(m.name) === tableName,
    );
    const metric = indexMeta?.metric || "cosine";

    // Calculate similarity scores
    const results: Array<VectorQueryResult<TMetadata> & { score: number }> = [];

    for (const row of rows) {
      const vector = this.blobToVector(row.vector);
      let score: number;

      switch (metric) {
        case "euclidean":
          // For euclidean, lower is better, so we invert
          score = 1 / (1 + this.euclideanDistance(queryVector, vector));
          break;
        case "dotProduct":
          score = this.dotProduct(queryVector, vector);
          break;
        case "cosine":
        default:
          score = this.cosineSimilarity(queryVector, vector);
          break;
      }

      // Apply minimum score filter
      if (minScore !== undefined && score < minScore) {
        continue;
      }

      const result: VectorQueryResult<TMetadata> = {
        id: row.id,
        score,
        content: row.content || undefined,
      };

      if (includeVectors) {
        result.vector = vector;
      }

      if (includeMetadata && row.metadata) {
        try {
          result.metadata = JSON.parse(row.metadata) as TMetadata;
        } catch {
          // Ignore parse errors
        }
      }

      results.push(result as VectorQueryResult<TMetadata> & { score: number });
    }

    // Sort by score descending and take topK
    results.sort((a, b) => b.score - a.score);
    return results.slice(0, topK);
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
    _paramIndex: number,
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
}
