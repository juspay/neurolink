/**
 * PGVector Store
 *
 * Vector store implementation using PostgreSQL with the pgvector extension.
 * Provides efficient vector similarity search within PostgreSQL databases.
 *
 * @module memory/vectorStores/pgvectorStore
 * @since 9.0.0
 */

import type {
  CollectionConfig,
  PGVectorConfig,
  VectorDeleteFilter,
  VectorEntry,
  VectorSearchQuery,
  VectorSearchResult,
  MemoryVectorStore,
  VectorStoreStats,
} from "../../types/index.js";
import { logger } from "../../utils/logger.js";

import type { MemoryPgClient } from "../../types/index.js";

/**
 * Distance operator mapping for different metrics
 */
const DISTANCE_OPERATORS = {
  cosine: "<=>",
  euclidean: "<->",
  dotProduct: "<#>",
} as const;

/**
 * PGVector Store using PostgreSQL with pgvector extension
 *
 * Features:
 * - Native PostgreSQL integration
 * - IVFFLAT or HNSW indexing for efficient search
 * - SQL-based filtering with standard WHERE clauses
 * - Transactional operations
 *
 * Prerequisites:
 * - PostgreSQL 15+ with pgvector extension
 * - pg npm package
 */
export class PGVectorStore implements MemoryVectorStore {
  private client: MemoryPgClient | null = null;
  private config: PGVectorConfig;
  private collectionConfig?: CollectionConfig;
  private tableName: string;
  private schemaName: string;
  private isInitialized = false;

  constructor(config: PGVectorConfig) {
    this.config = config;
    this.tableName = config.tableName ?? "neurolink_vectors";
    this.schemaName = config.schemaName ?? "public";
  }

  /**
   * Get the fully qualified table name
   */
  private get fullTableName(): string {
    return `"${this.schemaName}"."${this.tableName}"`;
  }

  /**
   * Initialize the PostgreSQL connection
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    try {
      // Dynamic import to avoid bundling issues
      // @ts-expect-error - pg module may not be installed in all environments
      const pg = await import("pg");
      const { Client } =
        (pg as { default?: { Client: unknown }; Client?: unknown }).default ||
        pg;

      this.client = new Client({
        connectionString: this.config.connectionString,
      }) as MemoryPgClient;

      await this.client.connect();

      // Ensure pgvector extension is enabled
      await this.client.query("CREATE EXTENSION IF NOT EXISTS vector");

      this.isInitialized = true;

      logger.info("[PGVectorStore] Connected to PostgreSQL", {
        tableName: this.fullTableName,
      });
    } catch (error) {
      logger.error("[PGVectorStore] Failed to connect to PostgreSQL", {
        error: error instanceof Error ? error.message : String(error),
      });
      throw new Error(
        `PostgreSQL connection failed: ${error instanceof Error ? error.message : String(error)}. ` +
          "Ensure PostgreSQL is running with pgvector extension installed.",
        { cause: error },
      );
    }
  }

  /**
   * Create or ensure collection (table) exists
   */
  async ensureCollection(config: CollectionConfig): Promise<void> {
    this.collectionConfig = config;

    if (!this.client) {
      throw new Error(
        "PostgreSQL client not initialized. Call initialize() first.",
      );
    }

    // Create schema if it doesn't exist
    if (this.schemaName !== "public") {
      await this.client.query(
        `CREATE SCHEMA IF NOT EXISTS "${this.schemaName}"`,
      );
    }

    // Create table with vector column and metadata
    await this.client.query(`
      CREATE TABLE IF NOT EXISTS ${this.fullTableName} (
        id TEXT PRIMARY KEY,
        vector vector(${config.dimensions}),
        message_id TEXT,
        thread_id TEXT,
        resource_id TEXT,
        role TEXT,
        timestamp TEXT,
        content_preview TEXT,
        metadata JSONB DEFAULT '{}'::jsonb,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    // Create indexes for filtering
    await this.createIndexIfNotExists(
      `idx_${this.tableName}_thread_id`,
      `CREATE INDEX IF NOT EXISTS idx_${this.tableName}_thread_id ON ${this.fullTableName} (thread_id)`,
    );

    await this.createIndexIfNotExists(
      `idx_${this.tableName}_resource_id`,
      `CREATE INDEX IF NOT EXISTS idx_${this.tableName}_resource_id ON ${this.fullTableName} (resource_id)`,
    );

    await this.createIndexIfNotExists(
      `idx_${this.tableName}_role`,
      `CREATE INDEX IF NOT EXISTS idx_${this.tableName}_role ON ${this.fullTableName} (role)`,
    );

    // Create vector index based on configuration
    const indexType = this.config.indexType ?? "hnsw";
    const _distanceOp =
      DISTANCE_OPERATORS[config.metric] ?? DISTANCE_OPERATORS.cosine;
    const opsClass = this.getOpsClass(config.metric);

    if (indexType === "hnsw") {
      await this.createIndexIfNotExists(
        `idx_${this.tableName}_vector_hnsw`,
        `CREATE INDEX IF NOT EXISTS idx_${this.tableName}_vector_hnsw
         ON ${this.fullTableName}
         USING hnsw (vector ${opsClass})
         WITH (m = 16, ef_construction = 64)`,
      );
    } else {
      // IVFFLAT index
      await this.createIndexIfNotExists(
        `idx_${this.tableName}_vector_ivfflat`,
        `CREATE INDEX IF NOT EXISTS idx_${this.tableName}_vector_ivfflat
         ON ${this.fullTableName}
         USING ivfflat (vector ${opsClass})
         WITH (lists = 100)`,
      );
    }

    logger.info("[PGVectorStore] Created/verified table and indexes", {
      tableName: this.fullTableName,
      dimensions: config.dimensions,
      metric: config.metric,
      indexType,
    });
  }

  /**
   * Get the operator class for the distance metric
   */
  private getOpsClass(metric: CollectionConfig["metric"]): string {
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
   * Create an index if it doesn't exist
   */
  private async createIndexIfNotExists(
    indexName: string,
    createStatement: string,
  ): Promise<void> {
    try {
      await this.client!.query(createStatement);
    } catch (error) {
      // Index may already exist with different parameters
      logger.debug("[PGVectorStore] Index creation note", {
        indexName,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Upsert vectors into the store
   */
  async upsert(vectors: VectorEntry[]): Promise<void> {
    if (!this.client) {
      throw new Error(
        "PostgreSQL client not initialized. Call initialize() first.",
      );
    }

    if (vectors.length === 0) {
      return;
    }

    // Use a single INSERT with ON CONFLICT for upsert
    const values: unknown[] = [];
    const placeholders: string[] = [];

    for (let i = 0; i < vectors.length; i++) {
      const entry = vectors[i];
      const offset = i * 8;

      // Format vector as PostgreSQL array string
      const vectorStr = `[${entry.vector.join(",")}]`;

      placeholders.push(
        `($${offset + 1}, $${offset + 2}::vector, $${offset + 3}, $${offset + 4}, $${offset + 5}, $${offset + 6}, $${offset + 7}, $${offset + 8})`,
      );

      values.push(
        entry.id,
        vectorStr,
        entry.metadata.messageId,
        entry.metadata.threadId,
        entry.metadata.resourceId ?? null,
        entry.metadata.role,
        entry.metadata.timestamp,
        entry.metadata.contentPreview ?? null,
      );
    }

    const query = `
      INSERT INTO ${this.fullTableName}
        (id, vector, message_id, thread_id, resource_id, role, timestamp, content_preview)
      VALUES ${placeholders.join(", ")}
      ON CONFLICT (id) DO UPDATE SET
        vector = EXCLUDED.vector,
        message_id = EXCLUDED.message_id,
        thread_id = EXCLUDED.thread_id,
        resource_id = EXCLUDED.resource_id,
        role = EXCLUDED.role,
        timestamp = EXCLUDED.timestamp,
        content_preview = EXCLUDED.content_preview
    `;

    await this.client.query(query, values);

    logger.debug("[PGVectorStore] Upserted vectors", {
      count: vectors.length,
      tableName: this.fullTableName,
    });
  }

  /**
   * Search for similar vectors
   */
  async search(query: VectorSearchQuery): Promise<VectorSearchResult[]> {
    if (!this.client) {
      throw new Error(
        "PostgreSQL client not initialized. Call initialize() first.",
      );
    }

    const metric = this.collectionConfig?.metric ?? "cosine";
    const distanceOp = DISTANCE_OPERATORS[metric] ?? DISTANCE_OPERATORS.cosine;

    // Format query vector
    const vectorStr = `[${query.vector.join(",")}]`;

    // Build WHERE clause
    const conditions: string[] = [];
    const params: unknown[] = [vectorStr, query.topK];
    let paramIndex = 3;

    if (query.filter?.threadId) {
      const threadIds = Array.isArray(query.filter.threadId)
        ? query.filter.threadId
        : [query.filter.threadId];
      conditions.push(`thread_id = ANY($${paramIndex})`);
      params.push(threadIds);
      paramIndex++;
    }

    if (query.filter?.resourceId) {
      conditions.push(`resource_id = $${paramIndex}`);
      params.push(query.filter.resourceId);
      paramIndex++;
    }

    if (query.filter?.role) {
      const roles = Array.isArray(query.filter.role)
        ? query.filter.role
        : [query.filter.role];
      conditions.push(`role = ANY($${paramIndex})`);
      params.push(roles);
      paramIndex++;
    }

    if (query.filter?.timestampRange?.start) {
      conditions.push(`timestamp >= $${paramIndex}`);
      params.push(query.filter.timestampRange.start);
      paramIndex++;
    }

    if (query.filter?.timestampRange?.end) {
      conditions.push(`timestamp <= $${paramIndex}`);
      params.push(query.filter.timestampRange.end);
    }

    const whereClause =
      conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

    // Build similarity expression based on metric
    let similarityExpr: string;
    if (metric === "cosine") {
      // Convert cosine distance to similarity: 1 - distance
      similarityExpr = `1 - (vector ${distanceOp} $1::vector)`;
    } else if (metric === "dotProduct") {
      // Inner product is already a similarity (higher is better)
      similarityExpr = `-(vector ${distanceOp} $1::vector)`;
    } else {
      // Euclidean: convert distance to similarity
      similarityExpr = `1 / (1 + (vector ${distanceOp} $1::vector))`;
    }

    const queryText = `
      SELECT
        id,
        message_id,
        thread_id,
        resource_id,
        role,
        timestamp,
        content_preview,
        ${similarityExpr} as similarity
      FROM ${this.fullTableName}
      ${whereClause}
      ORDER BY vector ${distanceOp} $1::vector
      LIMIT $2
    `;

    const result = await this.client.query<{
      id: string;
      message_id: string;
      thread_id: string;
      resource_id: string | null;
      role: string;
      timestamp: string;
      content_preview: string | null;
      similarity: number;
    }>(queryText, params);

    const searchResults: VectorSearchResult[] = result.rows
      .filter((row) => {
        // Apply threshold filter if specified
        if (query.threshold !== undefined && row.similarity < query.threshold) {
          return false;
        }
        return true;
      })
      .map((row) => ({
        id: row.id,
        score: row.similarity,
        metadata: {
          messageId: row.message_id,
          threadId: row.thread_id,
          resourceId: row.resource_id ?? undefined,
          role: row.role,
          timestamp: row.timestamp,
          contentPreview: row.content_preview ?? undefined,
        },
      }));

    logger.debug("[PGVectorStore] Search completed", {
      topK: query.topK,
      threshold: query.threshold,
      returned: searchResults.length,
    });

    return searchResults;
  }

  /**
   * Delete vectors by filter
   */
  async delete(filter: VectorDeleteFilter): Promise<number> {
    if (!this.client) {
      throw new Error(
        "PostgreSQL client not initialized. Call initialize() first.",
      );
    }

    let deleted = 0;

    // Delete by IDs
    if (filter.ids && filter.ids.length > 0) {
      const result = await this.client.query(
        `DELETE FROM ${this.fullTableName} WHERE id = ANY($1)`,
        [filter.ids],
      );
      deleted += result.rowCount;
    }

    // Delete by threadId
    if (filter.threadId) {
      const result = await this.client.query(
        `DELETE FROM ${this.fullTableName} WHERE thread_id = $1`,
        [filter.threadId],
      );
      deleted += result.rowCount;
    }

    // Delete by resourceId
    if (filter.resourceId) {
      const result = await this.client.query(
        `DELETE FROM ${this.fullTableName} WHERE resource_id = $1`,
        [filter.resourceId],
      );
      deleted += result.rowCount;
    }

    logger.debug("[PGVectorStore] Deleted vectors", {
      filter,
      deleted,
    });

    return deleted;
  }

  /**
   * Get collection statistics
   */
  async getStats(): Promise<VectorStoreStats> {
    if (!this.client) {
      throw new Error(
        "PostgreSQL client not initialized. Call initialize() first.",
      );
    }

    try {
      const result = await this.client.query<{ count: string }>(
        `SELECT COUNT(*) as count FROM ${this.fullTableName}`,
      );

      return {
        vectorCount: parseInt(result.rows[0]?.count ?? "0", 10),
        dimensions: this.collectionConfig?.dimensions ?? 0,
      };
    } catch (error) {
      logger.warn("[PGVectorStore] Failed to get stats", {
        error: error instanceof Error ? error.message : String(error),
      });
      return {
        vectorCount: 0,
        dimensions: this.collectionConfig?.dimensions ?? 0,
      };
    }
  }

  /**
   * Close the PostgreSQL connection
   */
  async close(): Promise<void> {
    if (this.client) {
      await this.client.end();
      this.client = null;
      this.isInitialized = false;
    }
    logger.debug("[PGVectorStore] Closed connection");
  }
}
