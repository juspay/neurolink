/**
 * pgvector (PostgreSQL) Vector Store Adapter
 * Implements vector similarity search using PostgreSQL with the pgvector extension
 *
 * pgvector is a PostgreSQL extension that adds vector similarity search capabilities
 * with support for IVFFlat and HNSW indexes. It provides excellent SQL integration
 * with existing PostgreSQL features like JSONB for metadata filtering.
 *
 * @see https://github.com/pgvector/pgvector
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
 * pgvector configuration options
 */
export interface PgvectorConfig extends VectorStoreConfig {
  /** PostgreSQL connection string (takes precedence over individual options) */
  connectionString?: string;
  /** PostgreSQL host */
  host?: string;
  /** PostgreSQL port */
  port?: number;
  /** PostgreSQL user */
  user?: string;
  /** PostgreSQL password */
  password?: string;
  /** PostgreSQL database name */
  database?: string;
  /** Schema for tables (default: public) */
  schema?: string;
  /** Connection pool size (default: 10) */
  poolSize?: number;
  /** SSL configuration */
  ssl?: boolean | PgvectorSSLConfig;
  /** Connection timeout in ms (default: 30000) */
  connectionTimeout?: number;
  /** Idle timeout in ms (default: 10000) */
  idleTimeout?: number;
  /** Statement timeout in ms (default: 30000) */
  statementTimeout?: number;
}

/**
 * SSL configuration for PostgreSQL
 */
export interface PgvectorSSLConfig {
  rejectUnauthorized?: boolean;
  ca?: string;
  cert?: string;
  key?: string;
}

/**
 * pgvector index type
 */
export type PgvectorIndexType = "ivfflat" | "hnsw" | "none";

/**
 * pgvector-specific index configuration
 */
export interface PgvectorIndexOptions {
  /** Index type (default: hnsw) */
  indexType?: PgvectorIndexType;
  /** Number of lists for IVFFlat index (default: 100) */
  lists?: number;
  /** Number of probes for IVFFlat search (default: 10) */
  probes?: number;
  /** HNSW M parameter - max number of connections (default: 16) */
  m?: number;
  /** HNSW ef_construction parameter (default: 64) */
  efConstruction?: number;
}

/**
 * Internal type for PostgreSQL client pool
 */
interface PgPool {
  query(
    sql: string,
    params?: unknown[],
  ): Promise<PgQueryResult>;
  connect(): Promise<PgClient>;
  end(): Promise<void>;
}

interface PgClient {
  query(sql: string, params?: unknown[]): Promise<PgQueryResult>;
  release(): void;
}

interface PgQueryResult {
  rows: unknown[];
  rowCount: number | null;
  fields: Array<{ name: string }>;
}

/**
 * Index metadata stored in the database
 */
interface IndexMetadata {
  name: string;
  dimension: number;
  metric: SimilarityMetric;
  index_type: PgvectorIndexType;
  created_at: string;
}

/**
 * pgvector (PostgreSQL) Vector Store Adapter
 *
 * Features:
 * - PostgreSQL with pgvector extension for vector similarity search
 * - Support for IVFFlat and HNSW index types
 * - Multiple distance operators: L2 (<->), cosine (<=>), inner product (<#>)
 * - Connection pooling with pg-pool
 * - JSONB metadata columns for flexible filtering
 * - Batch inserts using multi-row INSERT
 * - Schema support (e.g., schema.table_name)
 * - Full SQL WHERE clause support for metadata filtering
 * - Namespace support through column filtering
 *
 * Distance Operators:
 * - L2 (Euclidean): <-> operator
 * - Cosine: <=> operator (uses 1 - cosine_similarity)
 * - Inner Product: <#> operator (negative for max inner product)
 *
 * @example
 * // Connection string mode
 * const adapter = new PgvectorAdapter({
 *   connectionString: "postgresql://user:pass@localhost:5432/vectors",
 *   schema: "public",
 * });
 *
 * @example
 * // Individual connection options
 * const adapter = new PgvectorAdapter({
 *   host: "localhost",
 *   port: 5432,
 *   user: "postgres",
 *   password: "secret",
 *   database: "vectors",
 *   poolSize: 20,
 *   ssl: true,
 * });
 */
export class PgvectorAdapter extends BaseVectorStore<PgvectorConfig> {
  private pool: PgPool | null = null;
  private indexMetadataCache: Map<string, IndexMetadata> = new Map();
  private pgvectorExtensionLoaded: boolean = false;

  constructor(config: PgvectorConfig) {
    super(config, "pgvector" as VectorStoreName);
  }

  /**
   * Initialize connection pool to PostgreSQL
   */
  async connect(): Promise<void> {
    if (this.initialized) {
      logger.debug("pgvector already connected");
      return;
    }

    try {
      this.pool = await this.createPool();

      // Ensure pgvector extension is available
      await this.ensurePgvectorExtension();

      // Create metadata table for tracking indexes
      await this.createMetadataTable();

      this.initialized = true;
      logger.debug("pgvector connected successfully", {
        host: this.config.host,
        database: this.config.database,
        schema: this.config.schema || "public",
        pgvectorEnabled: this.pgvectorExtensionLoaded,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to connect to PostgreSQL: ${message}`);
    }
  }

  /**
   * Close the connection pool
   */
  async disconnect(): Promise<void> {
    if (this.pool) {
      try {
        await this.pool.end();
        this.pool = null;
        this.initialized = false;
        this.indexMetadataCache.clear();
        this.pgvectorExtensionLoaded = false;
        logger.debug("pgvector disconnected");
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        throw new Error(`Failed to disconnect from PostgreSQL: ${message}`);
      }
    }
  }

  /**
   * Create a new vector index (table with vector column)
   */
  async createIndex(config: VectorIndexConfig): Promise<void> {
    this.ensureInitialized();

    const { name, dimension, metric = "cosine" } = config;
    const tableName = this.getFullTableName(name);
    const indexOptions = (config.config as PgvectorIndexOptions) || {};
    const indexType = indexOptions.indexType || "hnsw";

    try {
      // Create the main data table with vector column
      await this.pool!.query(`
        CREATE TABLE IF NOT EXISTS ${tableName} (
          id TEXT PRIMARY KEY,
          vector vector(${dimension}) NOT NULL,
          metadata JSONB,
          content TEXT,
          namespace TEXT,
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW()
        )
      `);

      // Create namespace index for efficient filtering
      await this.pool!.query(`
        CREATE INDEX IF NOT EXISTS idx_${this.sanitizeTableName(name)}_namespace
        ON ${tableName} (namespace)
      `);

      // Create GIN index on metadata for JSONB filtering
      await this.pool!.query(`
        CREATE INDEX IF NOT EXISTS idx_${this.sanitizeTableName(name)}_metadata
        ON ${tableName} USING GIN (metadata)
      `);

      // Create vector index based on type and metric
      if (indexType !== "none" && this.pgvectorExtensionLoaded) {
        const vectorIndexName = `idx_${this.sanitizeTableName(name)}_vector`;
        const operatorClass = this.getOperatorClass(metric, indexType);

        if (indexType === "hnsw") {
          const m = indexOptions.m || 16;
          const efConstruction = indexOptions.efConstruction || 64;
          await this.pool!.query(`
            CREATE INDEX IF NOT EXISTS ${vectorIndexName}
            ON ${tableName}
            USING hnsw (vector ${operatorClass})
            WITH (m = ${m}, ef_construction = ${efConstruction})
          `);
          logger.debug(`Created HNSW index for ${name}`, { m, efConstruction, metric });
        } else if (indexType === "ivfflat") {
          const lists = indexOptions.lists || 100;
          await this.pool!.query(`
            CREATE INDEX IF NOT EXISTS ${vectorIndexName}
            ON ${tableName}
            USING ivfflat (vector ${operatorClass})
            WITH (lists = ${lists})
          `);
          logger.debug(`Created IVFFlat index for ${name}`, { lists, metric });
        }
      }

      // Store index metadata
      const schema = this.config.schema || "public";
      await this.pool!.query(
        `INSERT INTO ${schema}._vector_indexes (name, dimension, metric, index_type, created_at)
         VALUES ($1, $2, $3, $4, NOW())
         ON CONFLICT (name) DO UPDATE SET
           dimension = EXCLUDED.dimension,
           metric = EXCLUDED.metric,
           index_type = EXCLUDED.index_type`,
        [name, dimension, metric, indexType],
      );

      this.indexMetadataCache.set(name, {
        name,
        dimension,
        metric,
        index_type: indexType,
        created_at: new Date().toISOString(),
      });

      logger.debug(`Created index ${name}`, { dimension, metric, indexType });
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

    const tableName = this.getFullTableName(indexName);

    try {
      // Drop main table (indexes are dropped automatically)
      await this.pool!.query(`DROP TABLE IF EXISTS ${tableName} CASCADE`);

      // Remove from metadata
      const schema = this.config.schema || "public";
      await this.pool!.query(
        `DELETE FROM ${schema}._vector_indexes WHERE name = $1`,
        [indexName],
      );

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
      const schema = this.config.schema || "public";
      const result = await this.pool!.query(
        `SELECT name FROM ${schema}._vector_indexes ORDER BY name`,
      );
      return result.rows.map((row) => (row as { name: string }).name);
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
      const schema = this.config.schema || "public";
      const result = await this.pool!.query(
        `SELECT 1 FROM ${schema}._vector_indexes WHERE name = $1`,
        [indexName],
      );
      return (result.rowCount ?? 0) > 0;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to check index existence: ${message}`);
    }
  }

  /**
   * Upsert vectors into the index
   * Uses INSERT ... ON CONFLICT DO UPDATE for efficient upserts
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

    const tableName = this.getFullTableName(indexName);
    const namespace = options?.namespace || null;

    // Validate dimensions
    this.validateDimensions(records.map((r) => r.vector));

    try {
      // Use batched multi-row INSERT for better performance
      const batchSize = options?.batchSize || 100;
      let totalUpserted = 0;

      for (let i = 0; i < records.length; i += batchSize) {
        const batch = records.slice(i, i + batchSize);
        const values: unknown[] = [];
        const valuePlaceholders: string[] = [];
        let paramIndex = 1;

        for (const record of batch) {
          const vectorStr = `[${record.vector.join(",")}]`;
          valuePlaceholders.push(
            `($${paramIndex++}, $${paramIndex++}::vector, $${paramIndex++}::jsonb, $${paramIndex++}, $${paramIndex++}, NOW())`,
          );
          values.push(
            record.id,
            vectorStr,
            record.metadata ? JSON.stringify(record.metadata) : null,
            record.content || null,
            record.namespace || namespace,
          );
        }

        const sql = `
          INSERT INTO ${tableName} (id, vector, metadata, content, namespace, updated_at)
          VALUES ${valuePlaceholders.join(", ")}
          ON CONFLICT (id) DO UPDATE SET
            vector = EXCLUDED.vector,
            metadata = EXCLUDED.metadata,
            content = EXCLUDED.content,
            namespace = EXCLUDED.namespace,
            updated_at = NOW()
        `;

        await this.pool!.query(sql, values);
        totalUpserted += batch.length;
      }

      logger.debug(`Upserted ${totalUpserted} records to ${indexName}`);
      return { upsertedCount: totalUpserted };
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

    const tableName = this.getFullTableName(indexName);
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
      const indexMeta =
        this.indexMetadataCache.get(indexName) ||
        (await this.loadIndexMetadata(indexName));
      const metric = indexMeta?.metric || "cosine";

      // Build the distance expression and score conversion
      const vectorStr = `'[${vector.join(",")}]'::vector`;
      const { distanceExpr, scoreExpr } = this.getDistanceExpression(
        "vector",
        vectorStr,
        metric,
      );

      // Build SELECT clause
      const selectCols = [
        "id",
        "content",
        `${scoreExpr} AS score`,
        `${distanceExpr} AS distance`,
      ];
      if (includeVectors) {
        selectCols.push("vector::text AS vector_data");
      }
      if (includeMetadata) {
        selectCols.push("metadata");
      }

      // Build WHERE clause
      const conditions: string[] = ["1=1"];
      const params: unknown[] = [];
      let paramIndex = 1;

      if (namespace) {
        conditions.push(`namespace = $${paramIndex++}`);
        params.push(namespace);
      }

      if (filter) {
        const { sql: filterSql, params: filterParams, nextIndex } =
          this.translateFilter(filter, paramIndex);
        conditions.push(filterSql);
        params.push(...filterParams);
        paramIndex = nextIndex;
      }

      // Add minimum score filter (convert to distance threshold)
      if (minScore !== undefined) {
        const maxDistance = this.scoreToDistance(minScore, metric);
        conditions.push(`${distanceExpr} <= $${paramIndex++}`);
        params.push(maxDistance);
      }

      const sql = `
        SELECT ${selectCols.join(", ")}
        FROM ${tableName}
        WHERE ${conditions.join(" AND ")}
        ORDER BY distance ASC
        LIMIT $${paramIndex}
      `;
      params.push(topK);

      const result = await this.pool!.query(sql, params);

      // Transform results
      const results: VectorQueryResult<TMetadata>[] = result.rows.map((row) => {
        const typedRow = row as {
          id: string;
          content: string | null;
          score: number;
          distance: number;
          vector_data?: string;
          metadata?: TMetadata | string | null;
        };

        const queryResult: VectorQueryResult<TMetadata> = {
          id: typedRow.id,
          score: Number(typedRow.score),
          content: typedRow.content || undefined,
        };

        if (includeVectors && typedRow.vector_data) {
          queryResult.vector = this.parseVectorString(typedRow.vector_data);
        }

        if (includeMetadata && typedRow.metadata) {
          if (typeof typedRow.metadata === "string") {
            try {
              queryResult.metadata = JSON.parse(typedRow.metadata) as TMetadata;
            } catch {
              // Ignore parse errors
            }
          } else {
            queryResult.metadata = typedRow.metadata as TMetadata;
          }
        }

        return queryResult;
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

    const tableName = this.getFullTableName(indexName);
    const { ids, filter, namespace, deleteAll } = options;

    try {
      let sql: string;
      let params: unknown[] = [];

      if (deleteAll) {
        // Delete all records, optionally filtered by namespace
        if (namespace) {
          sql = `DELETE FROM ${tableName} WHERE namespace = $1`;
          params = [namespace];
        } else {
          sql = `DELETE FROM ${tableName}`;
        }
      } else if (ids && ids.length > 0) {
        // Delete by IDs
        const placeholders = ids.map((_, i) => `$${i + 1}`).join(", ");
        sql = `DELETE FROM ${tableName} WHERE id IN (${placeholders})`;
        params = ids;
      } else if (filter) {
        // Delete by filter
        const { sql: filterSql, params: filterParams } = this.translateFilter(
          filter,
          1,
        );
        sql = `DELETE FROM ${tableName} WHERE ${filterSql}`;
        params = filterParams;
      } else {
        return { deletedCount: 0 };
      }

      const result = await this.pool!.query(sql, params);
      const deletedCount = result.rowCount ?? 0;

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

    const tableName = this.getFullTableName(indexName);

    try {
      // Get count
      const countResult = await this.pool!.query(
        `SELECT COUNT(*) as count FROM ${tableName}`,
      );
      const vectorCount = parseInt(
        (countResult.rows[0] as { count: string }).count,
        10,
      );

      // Get namespace count
      const nsResult = await this.pool!.query(
        `SELECT COUNT(DISTINCT namespace) as count FROM ${tableName} WHERE namespace IS NOT NULL`,
      );
      const namespaceCount = parseInt(
        (nsResult.rows[0] as { count: string }).count,
        10,
      );

      // Get table size
      let indexSize: number | undefined;
      try {
        const sizeResult = await this.pool!.query(
          `SELECT pg_total_relation_size($1) as size`,
          [tableName],
        );
        indexSize = parseInt(
          (sizeResult.rows[0] as { size: string }).size,
          10,
        );
      } catch {
        // Ignore size query errors
      }

      // Get dimension from metadata
      const meta =
        this.indexMetadataCache.get(indexName) ||
        (await this.loadIndexMetadata(indexName));

      return {
        vectorCount,
        dimension: meta?.dimension,
        indexSize,
        namespaceCount,
        metrics: {
          metric: meta?.metric || "cosine",
          indexType: meta?.index_type || "hnsw",
          pgvectorEnabled: this.pgvectorExtensionLoaded,
        },
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to get stats for ${indexName}: ${message}`);
    }
  }

  /**
   * Set HNSW ef_search parameter for query performance tuning
   */
  async setHnswEfSearch(efSearch: number): Promise<void> {
    this.ensureInitialized();
    await this.pool!.query(`SET hnsw.ef_search = ${efSearch}`);
    logger.debug(`Set hnsw.ef_search = ${efSearch}`);
  }

  /**
   * Set IVFFlat probes parameter for query performance tuning
   */
  async setIvfflatProbes(probes: number): Promise<void> {
    this.ensureInitialized();
    await this.pool!.query(`SET ivfflat.probes = ${probes}`);
    logger.debug(`Set ivfflat.probes = ${probes}`);
  }

  /**
   * Translate abstract filter to PostgreSQL WHERE clause
   */
  protected translateFilter<TMetadata extends UnknownRecord>(
    filter: MetadataFilter<TMetadata>,
    startIndex: number = 1,
  ): { sql: string; params: unknown[]; nextIndex: number } {
    const conditions: string[] = [];
    const params: unknown[] = [];
    let paramIndex = startIndex;

    for (const [key, value] of Object.entries(filter)) {
      if (key === "$and" && Array.isArray(value)) {
        const subConditions = value.map((f) => {
          const result = this.translateFilter(
            f as MetadataFilter,
            paramIndex,
          );
          params.push(...result.params);
          paramIndex = result.nextIndex;
          return `(${result.sql})`;
        });
        conditions.push(subConditions.join(" AND "));
      } else if (key === "$or" && Array.isArray(value)) {
        const subConditions = value.map((f) => {
          const result = this.translateFilter(
            f as MetadataFilter,
            paramIndex,
          );
          params.push(...result.params);
          paramIndex = result.nextIndex;
          return `(${result.sql})`;
        });
        conditions.push(`(${subConditions.join(" OR ")})`);
      } else if (key === "$not" && typeof value === "object" && value !== null) {
        const result = this.translateFilter(value as MetadataFilter, paramIndex);
        params.push(...result.params);
        paramIndex = result.nextIndex;
        conditions.push(`NOT (${result.sql})`);
      } else if (this.isFieldFilter(value)) {
        const { sql, param, nextIndex } = this.translateFieldFilter(
          key,
          value as FieldFilter,
          paramIndex,
        );
        conditions.push(sql);
        params.push(...param);
        paramIndex = nextIndex;
      } else {
        // Simple equality - use JSONB containment operator for efficiency
        conditions.push(`metadata @> $${paramIndex++}::jsonb`);
        params.push(JSON.stringify({ [key]: value }));
      }
    }

    return {
      sql: conditions.length > 0 ? conditions.join(" AND ") : "1=1",
      params,
      nextIndex: paramIndex,
    };
  }

  // ===================
  // PRIVATE HELPER METHODS
  // ===================

  /**
   * Create PostgreSQL connection pool
   */
  private async createPool(): Promise<PgPool> {
    try {
      const modulePath = "pg";
      const pg = await import(/* @vite-ignore */ modulePath);
      const Pool = pg.default?.Pool || pg.Pool;

      const poolConfig: {
        connectionString?: string;
        host?: string;
        port?: number;
        user?: string;
        password?: string;
        database?: string;
        ssl?: boolean | PgvectorSSLConfig;
        max?: number;
        connectionTimeoutMillis?: number;
        idleTimeoutMillis?: number;
        statement_timeout?: number;
      } = {};

      if (this.config.connectionString) {
        poolConfig.connectionString = this.config.connectionString;
      } else {
        poolConfig.host = this.config.host || "localhost";
        poolConfig.port = this.config.port || 5432;
        poolConfig.user = this.config.user || "postgres";
        poolConfig.password = this.config.password;
        poolConfig.database = this.config.database || "postgres";
      }

      if (this.config.ssl !== undefined) {
        poolConfig.ssl = this.config.ssl;
      }

      poolConfig.max = this.config.poolSize || 10;
      poolConfig.connectionTimeoutMillis = this.config.connectionTimeout || 30000;
      poolConfig.idleTimeoutMillis = this.config.idleTimeout || 10000;
      poolConfig.statement_timeout = this.config.statementTimeout || 30000;

      return new Pool(poolConfig);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(
        `PostgreSQL client not found. Install pg: npm install pg. Error: ${message}`,
      );
    }
  }

  /**
   * Ensure pgvector extension is available
   */
  private async ensurePgvectorExtension(): Promise<void> {
    try {
      // Check if extension exists
      const result = await this.pool!.query(`
        SELECT 1 FROM pg_extension WHERE extname = 'vector'
      `);

      if ((result.rowCount ?? 0) === 0) {
        // Try to create extension
        await this.pool!.query(`CREATE EXTENSION IF NOT EXISTS vector`);
        logger.debug("Created pgvector extension");
      }

      this.pgvectorExtensionLoaded = true;
      logger.debug("pgvector extension is available");
    } catch (error) {
      logger.warn(
        "pgvector extension not available. Vector operations may fail.",
        { error: error instanceof Error ? error.message : String(error) },
      );
      this.pgvectorExtensionLoaded = false;
    }
  }

  /**
   * Create metadata table for tracking indexes
   */
  private async createMetadataTable(): Promise<void> {
    const schema = this.config.schema || "public";

    await this.pool!.query(`
      CREATE TABLE IF NOT EXISTS ${schema}._vector_indexes (
        name TEXT PRIMARY KEY,
        dimension INTEGER NOT NULL,
        metric TEXT NOT NULL,
        index_type TEXT NOT NULL DEFAULT 'hnsw',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    // Load existing index metadata into cache
    const result = await this.pool!.query(
      `SELECT * FROM ${schema}._vector_indexes`,
    );

    for (const row of result.rows) {
      const typedRow = row as IndexMetadata;
      this.indexMetadataCache.set(typedRow.name, typedRow);
    }
  }

  /**
   * Load index metadata from database
   */
  private async loadIndexMetadata(
    indexName: string,
  ): Promise<IndexMetadata | undefined> {
    const schema = this.config.schema || "public";
    const result = await this.pool!.query(
      `SELECT * FROM ${schema}._vector_indexes WHERE name = $1`,
      [indexName],
    );

    if ((result.rowCount ?? 0) > 0) {
      const meta = result.rows[0] as IndexMetadata;
      this.indexMetadataCache.set(indexName, meta);
      return meta;
    }
    return undefined;
  }

  /**
   * Get full table name with schema prefix
   */
  private getFullTableName(name: string): string {
    const schema = this.config.schema || "public";
    const sanitized = this.sanitizeTableName(name);
    return `${schema}."${sanitized}"`;
  }

  /**
   * Sanitize table name to prevent SQL injection
   */
  private sanitizeTableName(name: string): string {
    return name.replace(/[^a-zA-Z0-9_]/g, "_");
  }

  /**
   * Get pgvector operator class for index creation
   */
  private getOperatorClass(
    metric: SimilarityMetric,
    indexType: PgvectorIndexType,
  ): string {
    const prefix = indexType === "hnsw" ? "vector" : "vector";

    switch (metric) {
      case "euclidean":
        return `${prefix}_l2_ops`;
      case "dotProduct":
        return `${prefix}_ip_ops`;
      case "cosine":
      default:
        return `${prefix}_cosine_ops`;
    }
  }

  /**
   * Get distance expression and score conversion for queries
   */
  private getDistanceExpression(
    vectorColumn: string,
    queryVector: string,
    metric: SimilarityMetric,
  ): { distanceExpr: string; scoreExpr: string } {
    switch (metric) {
      case "euclidean":
        // L2 distance: lower is better
        return {
          distanceExpr: `${vectorColumn} <-> ${queryVector}`,
          scoreExpr: `1.0 / (1.0 + (${vectorColumn} <-> ${queryVector}))`,
        };
      case "dotProduct":
        // Inner product: <#> returns negative inner product
        // Higher inner product = more similar, so negate distance
        return {
          distanceExpr: `(${vectorColumn} <#> ${queryVector})`,
          scoreExpr: `-(${vectorColumn} <#> ${queryVector})`,
        };
      case "cosine":
      default:
        // Cosine distance: <=> returns 1 - cosine_similarity
        return {
          distanceExpr: `${vectorColumn} <=> ${queryVector}`,
          scoreExpr: `1.0 - (${vectorColumn} <=> ${queryVector})`,
        };
    }
  }

  /**
   * Convert similarity score to distance threshold
   */
  private scoreToDistance(score: number, metric: SimilarityMetric): number {
    switch (metric) {
      case "cosine":
        // Cosine: score = 1 - distance, so distance = 1 - score
        return 1 - score;
      case "euclidean":
        // Euclidean: score = 1 / (1 + distance), so distance = (1/score) - 1
        return score > 0 ? (1 / score) - 1 : Infinity;
      case "dotProduct":
        // Inner product: score = -distance, so distance = -score
        return -score;
      default:
        return 1 - score;
    }
  }

  /**
   * Parse vector string from PostgreSQL result
   * PostgreSQL returns vectors as strings like "[0.1,0.2,0.3]"
   */
  private parseVectorString(vectorStr: string): number[] {
    try {
      // Remove brackets and parse
      const cleaned = vectorStr.replace(/[\[\]]/g, "");
      return cleaned.split(",").map((s) => parseFloat(s.trim()));
    } catch {
      return [];
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
   * Translate a field filter to PostgreSQL WHERE clause
   */
  private translateFieldFilter(
    key: string,
    filter: FieldFilter,
    startIndex: number,
  ): { sql: string; param: unknown[]; nextIndex: number } {
    const conditions: string[] = [];
    const params: unknown[] = [];
    let paramIndex = startIndex;

    for (const [op, val] of Object.entries(filter)) {
      // Use JSONB operators for metadata field access
      const jsonPath = `metadata->>'${key}'`;
      const jsonPathNumeric = `(metadata->>'${key}')::numeric`;

      switch (op) {
        case "$eq":
          conditions.push(`${jsonPath} = $${paramIndex++}`);
          params.push(String(val));
          break;
        case "$ne":
          conditions.push(`${jsonPath} != $${paramIndex++}`);
          params.push(String(val));
          break;
        case "$gt":
          conditions.push(`${jsonPathNumeric} > $${paramIndex++}`);
          params.push(val);
          break;
        case "$gte":
          conditions.push(`${jsonPathNumeric} >= $${paramIndex++}`);
          params.push(val);
          break;
        case "$lt":
          conditions.push(`${jsonPathNumeric} < $${paramIndex++}`);
          params.push(val);
          break;
        case "$lte":
          conditions.push(`${jsonPathNumeric} <= $${paramIndex++}`);
          params.push(val);
          break;
        case "$in":
          if (Array.isArray(val)) {
            const placeholders = val.map(() => `$${paramIndex++}`).join(", ");
            conditions.push(`${jsonPath} IN (${placeholders})`);
            params.push(...val.map(String));
          }
          break;
        case "$nin":
          if (Array.isArray(val)) {
            const placeholders = val.map(() => `$${paramIndex++}`).join(", ");
            conditions.push(`${jsonPath} NOT IN (${placeholders})`);
            params.push(...val.map(String));
          }
          break;
        case "$exists":
          if (val) {
            conditions.push(`metadata ? '${key}'`);
          } else {
            conditions.push(`NOT (metadata ? '${key}')`);
          }
          break;
        case "$contains":
          conditions.push(`${jsonPath} ILIKE $${paramIndex++}`);
          params.push(`%${val}%`);
          break;
        case "$startsWith":
          conditions.push(`${jsonPath} ILIKE $${paramIndex++}`);
          params.push(`${val}%`);
          break;
        case "$endsWith":
          conditions.push(`${jsonPath} ILIKE $${paramIndex++}`);
          params.push(`%${val}`);
          break;
        default:
          // Unknown operator, treat as equality
          conditions.push(`${jsonPath} = $${paramIndex++}`);
          params.push(String(val));
      }
    }

    return {
      sql: conditions.length > 0 ? conditions.join(" AND ") : "1=1",
      param: params,
      nextIndex: paramIndex,
    };
  }
}
