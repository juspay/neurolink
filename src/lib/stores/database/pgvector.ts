/**
 * pgvector Vector Store Implementation
 * PostgreSQL extension for vector similarity search
 * @see https://github.com/pgvector/pgvector
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
import { translateToPgvector } from "../filterTranslator.js";

// Types for pg client (using dynamic import)
type Pool = {
  connect: () => Promise<PoolClient>;
  query: (text: string, values?: unknown[]) => Promise<QueryResult>;
  end: () => Promise<void>;
};

type PoolClient = {
  query: (text: string, values?: unknown[]) => Promise<QueryResult>;
  release: () => void;
};

type QueryResult = {
  rows: Array<Record<string, unknown>>;
  rowCount: number | null;
};

type PoolConfig = {
  connectionString?: string;
  host?: string;
  port?: number;
  database?: string;
  user?: string;
  password?: string;
  ssl?: boolean | object;
  max?: number;
  idleTimeoutMillis?: number;
  connectionTimeoutMillis?: number;
};

/**
 * pgvector-specific configuration
 */
export type PgvectorConfig = VectorStoreConfig & {
  /** PostgreSQL connection string (e.g., postgresql://user:pass@host:5432/db) */
  connectionString?: string;
  /** PostgreSQL host */
  host?: string;
  /** PostgreSQL port (default: 5432) */
  port?: number;
  /** Database name */
  database?: string;
  /** Database user */
  user?: string;
  /** Database password */
  password?: string;
  /** SSL configuration */
  ssl?: boolean | object;
  /** Schema to use (default: public) */
  schema?: string;
  /** Connection pool size (default: 10) */
  poolSize?: number;
  /** Index type: ivfflat or hnsw (default: hnsw) */
  indexType?: "ivfflat" | "hnsw";
};

/**
 * pgvector Vector Store implementation
 */
export class PgvectorStore extends BaseVectorStore<PgvectorConfig> {
  private pool: Pool | null = null;
  private schema: string;
  private indexMetrics: Map<string, SimilarityMetric> = new Map();

  constructor(config: PgvectorConfig) {
    super(config, "pgvector" as VectorStoreName);
    // Sanitize schema to prevent SQL injection
    this.schema = this.sanitizeIdentifier(config.schema || "public");
  }

  /**
   * Initialize connection to PostgreSQL
   */
  async connect(): Promise<void> {
    if (this.initialized) {
      return;
    }

    try {
      // Dynamically import pg
      const { Pool: PgPool } = await import("pg");

      const poolConfig: PoolConfig = this.config.connectionString
        ? { connectionString: this.config.connectionString }
        : {
            host: this.config.host,
            port: this.config.port || 5432,
            database: this.config.database,
            user: this.config.user,
            password: this.config.password,
            ssl: this.config.ssl,
          };

      poolConfig.max = this.config.poolSize || 10;
      poolConfig.idleTimeoutMillis = 30000;
      poolConfig.connectionTimeoutMillis = 5000;

      this.pool = new PgPool(poolConfig) as unknown as Pool;

      // Test connection and ensure pgvector extension
      const client = await this.pool.connect();
      try {
        await client.query("CREATE EXTENSION IF NOT EXISTS vector");
        this.logInfo("pgvector extension enabled");
      } finally {
        client.release();
      }

      this.initialized = true;
      this.logInfo("Connected successfully");
    } catch (error) {
      this.logError("Failed to connect", error);
      throw new Error(
        `Failed to connect to PostgreSQL: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Disconnect from PostgreSQL
   */
  async disconnect(): Promise<void> {
    if (this.pool) {
      await this.pool.end();
      this.pool = null;
    }
    this.initialized = false;
    this.logInfo("Disconnected");
  }

  /**
   * Ensure the index metadata table exists for storing index configurations
   */
  private async ensureMetadataTable(): Promise<void> {
    await this.pool!.query(`
      CREATE TABLE IF NOT EXISTS ${this.schema}._neurolink_vector_metadata (
        index_name TEXT PRIMARY KEY,
        metric TEXT NOT NULL DEFAULT 'cosine',
        dimension INTEGER,
        index_type TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);
  }

  /**
   * Get the metric for an index from stored metadata or cache
   */
  private async getIndexMetric(indexName: string): Promise<SimilarityMetric> {
    // Check cache first
    const cached = this.indexMetrics.get(indexName);
    if (cached) {
      return cached;
    }

    // Query from metadata table
    try {
      const result = await this.pool!.query(
        `SELECT metric FROM ${this.schema}._neurolink_vector_metadata WHERE index_name = $1`,
        [indexName],
      );
      if (result.rows.length > 0) {
        const metric = result.rows[0].metric as SimilarityMetric;
        this.indexMetrics.set(indexName, metric);
        return metric;
      }
    } catch {
      // Metadata table might not exist for legacy indexes
    }

    // Default to cosine for backward compatibility
    return "cosine";
  }

  /**
   * Create a new vector table with index
   */
  async createIndex(config: VectorIndexConfig): Promise<void> {
    this.ensureInitialized();

    const tableName = this.sanitizeIdentifier(config.name);
    const metric: SimilarityMetric = config.metric || "cosine";
    const indexType = this.config.indexType || "hnsw";

    // Ensure metadata table exists
    await this.ensureMetadataTable();

    // Create table with vector column
    await this.pool!.query(`
      CREATE TABLE IF NOT EXISTS ${this.schema}.${tableName} (
        id TEXT PRIMARY KEY,
        embedding vector(${config.dimension}),
        content TEXT,
        metadata JSONB DEFAULT '{}',
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // Create vector index with appropriate operator class
    const indexOps = this.getOperatorClass(metric);

    if (indexType === "hnsw") {
      await this.pool!.query(`
        CREATE INDEX IF NOT EXISTS ${tableName}_embedding_idx
        ON ${this.schema}.${tableName}
        USING hnsw (embedding ${indexOps})
        WITH (m = 16, ef_construction = 64)
      `);
    } else {
      await this.pool!.query(`
        CREATE INDEX IF NOT EXISTS ${tableName}_embedding_idx
        ON ${this.schema}.${tableName}
        USING ivfflat (embedding ${indexOps})
        WITH (lists = 100)
      `);
    }

    // Create GIN index for metadata filtering
    await this.pool!.query(`
      CREATE INDEX IF NOT EXISTS ${tableName}_metadata_idx
      ON ${this.schema}.${tableName}
      USING GIN (metadata)
    `);

    // Store metric in metadata table for persistence
    await this.pool!.query(
      `
      INSERT INTO ${this.schema}._neurolink_vector_metadata (index_name, metric, dimension, index_type)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (index_name) DO UPDATE SET
        metric = EXCLUDED.metric,
        dimension = EXCLUDED.dimension,
        index_type = EXCLUDED.index_type
      `,
      [tableName, metric, config.dimension, indexType],
    );

    // Cache the metric
    this.indexMetrics.set(tableName, metric);

    this.logInfo(`Table and indexes created: ${tableName}`, {
      dimension: config.dimension,
      indexType,
      metric,
    });
  }

  /**
   * Delete a vector table
   */
  async deleteIndex(indexName: string): Promise<void> {
    this.ensureInitialized();

    const tableName = this.sanitizeIdentifier(indexName);
    await this.pool!.query(
      `DROP TABLE IF EXISTS ${this.schema}.${tableName} CASCADE`,
    );

    // Clean up metadata
    try {
      await this.pool!.query(
        `DELETE FROM ${this.schema}._neurolink_vector_metadata WHERE index_name = $1`,
        [tableName],
      );
    } catch {
      // Metadata table might not exist
    }
    this.indexMetrics.delete(tableName);

    this.logInfo(`Table deleted: ${tableName}`);
  }

  /**
   * List all vector tables
   */
  async listIndexes(): Promise<string[]> {
    this.ensureInitialized();

    const result = await this.pool!.query(
      `
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = $1
        AND table_type = 'BASE TABLE'
        AND EXISTS (
          SELECT 1
          FROM information_schema.columns
          WHERE table_schema = tables.table_schema
            AND table_name = tables.table_name
            AND udt_name = 'vector'
        )
    `,
      [this.schema],
    );

    return result.rows.map((row) => row.table_name as string);
  }

  /**
   * Check if a vector table exists
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

    const tableName = this.sanitizeIdentifier(indexName);
    const batchSize = options?.batchSize || 1000;
    let totalUpserted = 0;

    // Process in batches
    for (let i = 0; i < records.length; i += batchSize) {
      const batch = records.slice(i, i + batchSize);

      // Build UNNEST arrays for batch insert
      const ids: string[] = [];
      const embeddings: string[] = [];
      const contents: (string | null)[] = [];
      const metadatas: string[] = [];

      for (const record of batch) {
        ids.push(record.id);
        embeddings.push(`[${record.vector.join(",")}]`);
        contents.push(record.content || null);
        metadatas.push(JSON.stringify(record.metadata || {}));
      }

      await this.pool!.query(
        `
        INSERT INTO ${this.schema}.${tableName} (id, embedding, content, metadata, updated_at)
        SELECT * FROM UNNEST($1::text[], $2::vector[], $3::text[], $4::jsonb[], ARRAY_FILL(NOW(), ARRAY[${batch.length}])::timestamp[])
        ON CONFLICT (id) DO UPDATE SET
          embedding = EXCLUDED.embedding,
          content = EXCLUDED.content,
          metadata = EXCLUDED.metadata,
          updated_at = NOW()
      `,
        [ids, embeddings, contents, metadatas],
      );

      totalUpserted += batch.length;
      this.logDebug(`Upserted batch: ${totalUpserted}/${records.length}`);
    }

    return { upsertedCount: totalUpserted };
  }

  /**
   * Query vectors
   */
  async query<TMetadata extends UnknownRecord = UnknownRecord>(
    indexName: string,
    options: VectorQueryOptions<TMetadata>,
  ): Promise<VectorQueryResult<TMetadata>[]> {
    this.ensureInitialized();

    const tableName = this.sanitizeIdentifier(indexName);
    const metric = await this.getIndexMetric(tableName);
    const distanceOp = this.getDistanceOperator(metric);

    let whereClause = "";
    const params: unknown[] = [`[${options.vector.join(",")}]`, options.topK];
    const paramIndex = 3;

    if (options.filter) {
      const filterResult = translateToPgvector(options.filter, paramIndex);
      if (filterResult.sql && filterResult.sql !== "TRUE") {
        whereClause = `WHERE ${filterResult.sql}`;
        params.push(...filterResult.params);
      }
    }

    // Convert distance to similarity score
    // For cosine: similarity = 1 - distance
    // For inner product: similarity = -distance (since <#> returns negative inner product)
    // For L2: similarity = -distance (closer is better)
    let scoreExpression: string;
    if (metric === "cosine") {
      scoreExpression = `1 - (embedding ${distanceOp} $1)`;
    } else if (metric === "dotProduct") {
      scoreExpression = `-(embedding ${distanceOp} $1)`;
    } else {
      scoreExpression = `-(embedding ${distanceOp} $1)`;
    }

    const selectVector = options.includeVectors
      ? "embedding::text as vector,"
      : "";

    const query = `
      SELECT
        id,
        ${scoreExpression} as score,
        ${selectVector}
        content,
        metadata
      FROM ${this.schema}.${tableName}
      ${whereClause}
      ORDER BY embedding ${distanceOp} $1
      LIMIT $2
    `;

    const result = await this.pool!.query(query, params);

    return result.rows
      .filter(
        (row) => !options.minScore || (row.score as number) >= options.minScore,
      )
      .map((row) => ({
        id: row.id as string,
        score: row.score as number,
        vector: options.includeVectors
          ? this.parseVector(row.vector as string)
          : undefined,
        metadata: row.metadata as TMetadata,
        content: row.content as string | undefined,
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

    const tableName = this.sanitizeIdentifier(indexName);

    if (options.deleteAll) {
      const result = await this.pool!.query(
        `DELETE FROM ${this.schema}.${tableName}`,
      );
      return { deletedCount: result.rowCount || 0, acknowledged: true };
    }

    if (options.ids && options.ids.length > 0) {
      const result = await this.pool!.query(
        `DELETE FROM ${this.schema}.${tableName} WHERE id = ANY($1)`,
        [options.ids],
      );
      return { deletedCount: result.rowCount || 0, acknowledged: true };
    }

    if (options.filter) {
      const filterResult = translateToPgvector(options.filter);
      const result = await this.pool!.query(
        `DELETE FROM ${this.schema}.${tableName} WHERE ${filterResult.sql}`,
        filterResult.params,
      );
      return { deletedCount: result.rowCount || 0, acknowledged: true };
    }

    return { deletedCount: 0, acknowledged: true };
  }

  /**
   * Get table statistics
   */
  async getStats(indexName: string): Promise<VectorStoreStats> {
    this.ensureInitialized();

    const tableName = this.sanitizeIdentifier(indexName);

    const countResult = await this.pool!.query(
      `SELECT COUNT(*) as count FROM ${this.schema}.${tableName}`,
    );

    const dimensionResult = await this.pool!.query(
      `
      SELECT atttypmod - 4 as dimension
      FROM pg_attribute
      WHERE attrelid = $1::regclass
        AND attname = 'embedding'
    `,
      [`${this.schema}.${tableName}`],
    );

    return {
      vectorCount: parseInt(countResult.rows[0].count as string, 10),
      dimension: dimensionResult.rows[0]?.dimension as number | undefined,
    };
  }

  /**
   * Translate filter to pgvector format
   */
  protected translateFilter<TMetadata extends UnknownRecord>(
    filter: MetadataFilter<TMetadata>,
  ): unknown {
    return translateToPgvector(filter);
  }

  /**
   * Sanitize identifier for SQL safety
   */
  private sanitizeIdentifier(name: string): string {
    // Basic SQL injection prevention - allow only alphanumeric and underscore
    return name.replace(/[^a-zA-Z0-9_]/g, "_");
  }

  /**
   * Get operator class for index based on metric
   */
  private getOperatorClass(metric: SimilarityMetric): string {
    switch (metric) {
      case "cosine":
        return "vector_cosine_ops";
      case "euclidean":
        return "vector_l2_ops";
      case "dotProduct":
        return "vector_ip_ops";
      default:
        return "vector_cosine_ops";
    }
  }

  /**
   * Get distance operator based on metric
   */
  private getDistanceOperator(metric: SimilarityMetric): string {
    switch (metric) {
      case "cosine":
        return "<=>"; // Cosine distance
      case "euclidean":
        return "<->"; // L2 distance
      case "dotProduct":
        return "<#>"; // Inner product (negative)
      default:
        return "<=>";
    }
  }

  /**
   * Parse PostgreSQL vector format to number array
   */
  private parseVector(vectorStr: string): number[] {
    // Parse format: "[1,2,3]" or "{1,2,3}"
    return vectorStr
      .replace(/[[\]{}]/g, "")
      .split(",")
      .map(Number);
  }
}
