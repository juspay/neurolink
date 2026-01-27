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

// Constants for edge case handling
const MAX_BATCH_SIZE = 10000; // PostgreSQL practical limit for UNNEST arrays
const MAX_VECTOR_DIMENSION = 16000; // pgvector maximum dimension
const MIN_VECTOR_DIMENSION = 1;
const MAX_METADATA_SIZE_BYTES = 1024 * 1024; // 1MB practical limit for JSONB
const MAX_INDEX_NAME_LENGTH = 63; // PostgreSQL identifier limit
const DEFAULT_CONNECTION_TIMEOUT_MS = 10000;

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
  /** Connection timeout in milliseconds (default: 10000) */
  connectionTimeoutMillis?: number;
};

/**
 * pgvector Vector Store implementation
 */
export class PgvectorStore extends BaseVectorStore<PgvectorConfig> {
  private pool: Pool | null = null;
  private schema: string;
  private indexMetrics: Map<string, SimilarityMetric> = new Map();
  private indexDimensions: Map<string, number> = new Map();

  constructor(config: PgvectorConfig) {
    super(config, "pgvector" as VectorStoreName);
    // Sanitize schema to prevent SQL injection
    this.schema = this.sanitizeIdentifier(config.schema || "public");
  }

  /**
   * Validate index name for PostgreSQL constraints
   */
  private validateIndexName(name: string): void {
    if (!name || name.trim().length === 0) {
      throw new Error("Index name cannot be empty");
    }
    if (name.length > MAX_INDEX_NAME_LENGTH) {
      throw new Error(
        `Index name exceeds maximum length of ${MAX_INDEX_NAME_LENGTH} characters: "${name.slice(0, 20)}..."`,
      );
    }
    // Check for reserved names
    if (name.startsWith("_neurolink_")) {
      throw new Error(
        `Index name cannot start with "_neurolink_" (reserved for internal use)`,
      );
    }
  }

  /**
   * Validate vector dimension
   */
  private validateVectorDimension(dimension: number, context: string): void {
    if (!Number.isInteger(dimension)) {
      throw new Error(
        `${context}: dimension must be an integer, got ${dimension}`,
      );
    }
    if (dimension < MIN_VECTOR_DIMENSION) {
      throw new Error(
        `${context}: dimension must be at least ${MIN_VECTOR_DIMENSION}, got ${dimension}`,
      );
    }
    if (dimension > MAX_VECTOR_DIMENSION) {
      throw new Error(
        `${context}: dimension exceeds pgvector maximum of ${MAX_VECTOR_DIMENSION}, got ${dimension}`,
      );
    }
  }

  /**
   * Validate a single vector
   */
  private validateVector(
    vector: number[],
    expectedDimension?: number,
    context: string = "Vector",
  ): void {
    if (!Array.isArray(vector)) {
      throw new Error(`${context}: must be an array`);
    }
    if (vector.length === 0) {
      throw new Error(`${context}: cannot be empty`);
    }
    this.validateVectorDimension(vector.length, context);

    // Check for invalid values
    for (let i = 0; i < vector.length; i++) {
      if (typeof vector[i] !== "number" || !Number.isFinite(vector[i])) {
        throw new Error(
          `${context}: contains invalid value at index ${i}: ${vector[i]}`,
        );
      }
    }

    if (
      expectedDimension !== undefined &&
      vector.length !== expectedDimension
    ) {
      throw new Error(
        `${context}: dimension mismatch - expected ${expectedDimension}, got ${vector.length}`,
      );
    }
  }

  /**
   * Validate metadata size
   */
  private validateMetadataSize(metadata: unknown, id: string): void {
    if (!metadata) {return;}
    const size = JSON.stringify(metadata).length;
    if (size > MAX_METADATA_SIZE_BYTES) {
      throw new Error(
        `Metadata for record "${id}" exceeds maximum size of ${MAX_METADATA_SIZE_BYTES} bytes (got ${size} bytes)`,
      );
    }
  }

  /**
   * Get the expected dimension for an index (cached)
   */
  private async getIndexDimension(
    indexName: string,
  ): Promise<number | undefined> {
    const cached = this.indexDimensions.get(indexName);
    if (cached !== undefined) {
      return cached;
    }

    try {
      const result = await this.pool!.query(
        `
        SELECT atttypmod - 4 as dimension
        FROM pg_attribute
        WHERE attrelid = $1::regclass
          AND attname = 'embedding'
        `,
        [`${this.schema}.${this.sanitizeIdentifier(indexName)}`],
      );
      if (result.rows.length > 0 && result.rows[0].dimension) {
        const dimension = result.rows[0].dimension as number;
        this.indexDimensions.set(indexName, dimension);
        return dimension;
      }
    } catch {
      // Index might not exist yet
    }
    return undefined;
  }

  /**
   * Initialize connection to PostgreSQL
   */
  async connect(): Promise<void> {
    if (this.initialized) {
      return;
    }

    // Validate configuration
    if (!this.config.connectionString && !this.config.host) {
      throw new Error(
        "pgvector: Either connectionString or host must be provided",
      );
    }

    let client: PoolClient | null = null;
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
      poolConfig.connectionTimeoutMillis =
        this.config.connectionTimeoutMillis || DEFAULT_CONNECTION_TIMEOUT_MS;

      this.pool = new PgPool(poolConfig) as unknown as Pool;

      // Test connection and ensure pgvector extension
      client = await this.pool.connect();
      try {
        await client.query("CREATE EXTENSION IF NOT EXISTS vector");
        this.logInfo("pgvector extension enabled");
      } finally {
        client.release();
        client = null;
      }

      this.initialized = true;
      this.logInfo("Connected successfully");
    } catch (error) {
      // Clean up on failure
      if (client) {
        try {
          client.release();
        } catch {
          // Ignore cleanup errors
        }
      }
      if (this.pool) {
        try {
          await this.pool.end();
        } catch {
          // Ignore cleanup errors
        }
        this.pool = null;
      }

      this.logError("Failed to connect", error);

      // Provide helpful error messages
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      if (errorMessage.includes("ECONNREFUSED")) {
        throw new Error(
          `pgvector: Connection refused. Ensure PostgreSQL is running at ${this.config.host || "specified host"}:${this.config.port || 5432}`,
        );
      }
      if (errorMessage.includes("timeout")) {
        const timeoutMs =
          this.config.connectionTimeoutMillis || DEFAULT_CONNECTION_TIMEOUT_MS;
        throw new Error(
          `pgvector: Connection timed out after ${timeoutMs}ms. Check network connectivity and firewall settings.`,
        );
      }
      if (errorMessage.includes("authentication")) {
        throw new Error(
          `pgvector: Authentication failed. Verify username and password.`,
        );
      }
      if (errorMessage.includes("does not exist")) {
        throw new Error(
          `pgvector: Database "${this.config.database}" does not exist. Create it first.`,
        );
      }
      throw new Error(`pgvector: Failed to connect - ${errorMessage}`);
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

    // Validate inputs
    this.validateIndexName(config.name);
    this.validateVectorDimension(config.dimension, "createIndex");

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

    // Cache the metric and dimension
    this.indexMetrics.set(tableName, metric);
    this.indexDimensions.set(tableName, config.dimension);

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

    if (!indexName || indexName.trim().length === 0) {
      throw new Error("Index name cannot be empty");
    }

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
    this.indexDimensions.delete(tableName);

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

    // Handle empty records array
    if (!records || records.length === 0) {
      this.logDebug("Upsert called with empty records array, skipping");
      return { upsertedCount: 0 };
    }

    const tableName = this.sanitizeIdentifier(indexName);

    // Validate batch size
    const requestedBatchSize = options?.batchSize || 1000;
    const batchSize = Math.min(requestedBatchSize, MAX_BATCH_SIZE);
    if (requestedBatchSize > MAX_BATCH_SIZE) {
      this.logDebug(
        `Batch size ${requestedBatchSize} exceeds maximum ${MAX_BATCH_SIZE}, using ${batchSize}`,
      );
    }

    // Get expected dimension for validation
    const expectedDimension = await this.getIndexDimension(indexName);

    // Validate all records upfront
    const firstVectorDim = records[0].vector.length;
    for (let i = 0; i < records.length; i++) {
      const record = records[i];

      // Validate ID
      if (!record.id || record.id.trim().length === 0) {
        throw new Error(`Record at index ${i} has empty or missing ID`);
      }

      // Validate vector
      this.validateVector(
        record.vector,
        expectedDimension || firstVectorDim,
        `Record "${record.id}"`,
      );

      // Validate metadata size
      this.validateMetadataSize(record.metadata, record.id);
    }

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

      try {
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
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : String(error);

        // Provide helpful error messages
        if (errorMessage.includes("different vector dimensions")) {
          throw new Error(
            `pgvector: Vector dimension mismatch. Table "${indexName}" expects vectors of a specific dimension. Check that all vectors have the correct dimension.`,
          );
        }
        if (
          errorMessage.includes("relation") &&
          errorMessage.includes("does not exist")
        ) {
          throw new Error(
            `pgvector: Index "${indexName}" does not exist. Create it first with createIndex().`,
          );
        }
        throw new Error(
          `pgvector: Failed to upsert batch starting at index ${i} - ${errorMessage}`,
        );
      }
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

    // Validate query vector
    if (!options.vector || options.vector.length === 0) {
      throw new Error("Query vector cannot be empty");
    }

    // Validate topK
    if (!options.topK || options.topK < 1) {
      throw new Error("topK must be a positive integer");
    }
    if (!Number.isInteger(options.topK)) {
      throw new Error("topK must be an integer");
    }

    // Get expected dimension and validate
    const expectedDimension = await this.getIndexDimension(indexName);
    this.validateVector(options.vector, expectedDimension, "Query vector");

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

    try {
      const result = await this.pool!.query(query, params);

      return result.rows
        .filter(
          (row) =>
            !options.minScore || (row.score as number) >= options.minScore,
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
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);

      if (errorMessage.includes("different vector dimensions")) {
        throw new Error(
          `pgvector: Query vector dimension mismatch. Index "${indexName}" expects a different dimension.`,
        );
      }
      if (
        errorMessage.includes("relation") &&
        errorMessage.includes("does not exist")
      ) {
        throw new Error(
          `pgvector: Index "${indexName}" does not exist. Create it first with createIndex().`,
        );
      }
      throw new Error(`pgvector: Query failed - ${errorMessage}`);
    }
  }

  /**
   * Delete vectors
   */
  async delete(
    indexName: string,
    options: VectorDeleteOptions,
  ): Promise<VectorDeleteResult> {
    this.ensureInitialized();

    if (!indexName || indexName.trim().length === 0) {
      throw new Error("Index name cannot be empty");
    }

    const tableName = this.sanitizeIdentifier(indexName);

    try {
      if (options.deleteAll) {
        const result = await this.pool!.query(
          `DELETE FROM ${this.schema}.${tableName}`,
        );
        return { deletedCount: result.rowCount || 0, acknowledged: true };
      }

      if (options.ids && options.ids.length > 0) {
        // Validate IDs
        for (const id of options.ids) {
          if (!id || (typeof id === "string" && id.trim().length === 0)) {
            throw new Error("Delete IDs cannot contain empty values");
          }
        }

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
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);

      if (
        errorMessage.includes("relation") &&
        errorMessage.includes("does not exist")
      ) {
        throw new Error(`pgvector: Index "${indexName}" does not exist.`);
      }
      throw new Error(`pgvector: Delete failed - ${errorMessage}`);
    }
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

    // Validate ID
    if (!id || id.trim().length === 0) {
      throw new Error("Vector ID cannot be empty");
    }

    if (!update.vector && !update.metadata) {
      this.logDebug("updateVector called with no updates, skipping");
      return; // Nothing to update
    }

    // Validate vector if provided
    if (update.vector) {
      const expectedDimension = await this.getIndexDimension(indexName);
      this.validateVector(
        update.vector,
        expectedDimension,
        `Update vector for "${id}"`,
      );
    }

    // Validate metadata if provided
    if (update.metadata) {
      this.validateMetadataSize(update.metadata, id);
    }

    const tableName = this.sanitizeIdentifier(indexName);
    const setClauses: string[] = [];
    const params: unknown[] = [];
    let paramIndex = 1;

    if (update.vector) {
      setClauses.push(`embedding = $${paramIndex}::vector`);
      params.push(`[${update.vector.join(",")}]`);
      paramIndex++;
    }

    if (update.metadata) {
      setClauses.push(`metadata = $${paramIndex}::jsonb`);
      params.push(JSON.stringify(update.metadata));
      paramIndex++;
    }

    // Always update the updated_at timestamp
    setClauses.push("updated_at = NOW()");

    params.push(id);

    try {
      const result = await this.pool!.query(
        `UPDATE ${this.schema}.${tableName} SET ${setClauses.join(", ")} WHERE id = $${paramIndex}`,
        params,
      );

      if (result.rowCount === 0) {
        throw new Error(
          `Vector with id '${id}' not found in index '${indexName}'`,
        );
      }

      this.logDebug(`Updated vector: ${id}`);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);

      if (errorMessage.includes("different vector dimensions")) {
        throw new Error(
          `pgvector: Vector dimension mismatch when updating "${id}". Index "${indexName}" expects a different dimension.`,
        );
      }
      if (errorMessage.includes("not found")) {
        throw error; // Re-throw our own error
      }
      throw new Error(
        `pgvector: Failed to update vector "${id}" - ${errorMessage}`,
      );
    }
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
