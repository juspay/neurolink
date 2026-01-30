/**
 * LibSQL Vector Store Implementation
 * SQLite-compatible database with vector search capabilities (Turso-compatible)
 * @see https://docs.turso.tech/features/ai-and-embeddings
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
import { translateToLibSQL } from "../filterTranslator.js";

// Types for LibSQL client (using dynamic import)
type LibSQLClient = {
  execute: (
    sql: string | { sql: string; args?: unknown[] },
  ) => Promise<LibSQLResultSet>;
  batch: (
    statements: Array<string | { sql: string; args?: unknown[] }>,
    mode?: "write" | "read" | "deferred",
  ) => Promise<LibSQLResultSet[]>;
  close: () => void;
};

type LibSQLResultSet = {
  columns: string[];
  rows: Array<Record<string, unknown>>;
  rowsAffected: number;
  lastInsertRowid?: bigint;
};

/**
 * LibSQL-specific configuration
 */
export type LibSQLConfig = VectorStoreConfig & {
  /** Database URL (file:path for local, libsql:// for Turso) */
  url: string;
  /** Auth token for Turso Cloud */
  authToken?: string;
  /** Encryption key for local databases */
  encryptionKey?: string;
  /** Sync URL for embedded replicas */
  syncUrl?: string;
  /** Sync interval in seconds */
  syncInterval?: number;
};

/**
 * LibSQL Vector Store implementation
 * Uses LibSQL's native vector search capabilities
 */
export class LibSQLStore extends BaseVectorStore<LibSQLConfig> {
  private client: LibSQLClient | null = null;
  private indexDimensions: Map<string, number> = new Map();
  private indexMetrics: Map<string, SimilarityMetric> = new Map();

  constructor(config: LibSQLConfig) {
    super(config, "libsql" as VectorStoreName);
  }

  /**
   * Initialize connection to LibSQL
   */
  async connect(): Promise<void> {
    if (this.initialized) {
      return;
    }

    try {
      // Dynamically import LibSQL client
      const { createClient } = await import("@libsql/client");

      const clientConfig: {
        url: string;
        authToken?: string;
        encryptionKey?: string;
        syncUrl?: string;
        syncInterval?: number;
      } = {
        url: this.config.url,
      };

      if (this.config.authToken) {
        clientConfig.authToken = this.config.authToken;
      }
      if (this.config.encryptionKey) {
        clientConfig.encryptionKey = this.config.encryptionKey;
      }
      if (this.config.syncUrl) {
        clientConfig.syncUrl = this.config.syncUrl;
      }
      if (this.config.syncInterval) {
        clientConfig.syncInterval = this.config.syncInterval;
      }

      this.client = createClient(clientConfig) as unknown as LibSQLClient;

      // Test connection
      await this.client.execute("SELECT 1");

      this.initialized = true;
      this.logInfo("Connected successfully", { url: this.config.url });
    } catch (error) {
      this.logError("Failed to connect", error);
      throw new Error(
        `Failed to connect to LibSQL: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Disconnect from LibSQL
   */
  async disconnect(): Promise<void> {
    if (this.client) {
      this.client.close();
      this.client = null;
    }
    this.indexDimensions.clear();
    this.indexMetrics.clear();
    this.initialized = false;
    this.logInfo("Disconnected");
  }

  /**
   * Create a new table (index) with vector column
   */
  async createIndex(config: VectorIndexConfig): Promise<void> {
    this.ensureInitialized();

    const tableName = this.sanitizeTableName(config.name);
    const metric = config.metric || "cosine";

    // Create table with vector column using F32_BLOB for vector storage
    // LibSQL uses F32_BLOB type for efficient vector storage
    const createTableSQL = `
      CREATE TABLE IF NOT EXISTS ${tableName} (
        id TEXT PRIMARY KEY,
        vector F32_BLOB(${config.dimension}),
        metadata TEXT,
        content TEXT
      )
    `;

    await this.client!.execute(createTableSQL);

    // Create vector index for similarity search
    // LibSQL supports cosine, euclidean (L2), and manhattan (L1) metrics
    const indexName = `${tableName}_vector_idx`;
    const metricType = this.mapMetricToLibSQL(metric);

    const createIndexSQL = `
      CREATE INDEX IF NOT EXISTS ${indexName}
      ON ${tableName}(libsql_vector_idx(vector, '${metricType}', 'compress_neighbors=float8', 'max_neighbors=50'))
    `;

    try {
      await this.client!.execute(createIndexSQL);
    } catch (error) {
      // Vector index might not be supported on all LibSQL versions
      this.logDebug(
        `Vector index creation skipped: ${error instanceof Error ? error.message : String(error)}`,
      );
    }

    // Store dimension and metric info
    this.indexDimensions.set(config.name, config.dimension);
    this.indexMetrics.set(config.name, metric);

    this.logInfo(`Table created: ${config.name}`, {
      dimension: config.dimension,
      metric,
    });
  }

  /**
   * Delete a table (index)
   */
  async deleteIndex(indexName: string): Promise<void> {
    this.ensureInitialized();

    const tableName = this.sanitizeTableName(indexName);
    await this.client!.execute(`DROP TABLE IF EXISTS ${tableName}`);

    this.indexDimensions.delete(indexName);
    this.indexMetrics.delete(indexName);
    this.logInfo(`Table deleted: ${indexName}`);
  }

  /**
   * List all tables
   */
  async listIndexes(): Promise<string[]> {
    this.ensureInitialized();

    const result = await this.client!.execute(
      "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE 'libsql_%'",
    );

    return result.rows.map((row) => row.name as string);
  }

  /**
   * Check if a table exists
   */
  async indexExists(indexName: string): Promise<boolean> {
    const indexes = await this.listIndexes();
    return indexes.includes(this.sanitizeTableName(indexName));
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

    const tableName = this.sanitizeTableName(indexName);
    const batchSize = options?.batchSize || 500;
    let totalUpserted = 0;

    for (let i = 0; i < records.length; i += batchSize) {
      const batch = records.slice(i, i + batchSize);

      // Build batch statements for upsert using INSERT OR REPLACE
      const statements = batch.map((record) => {
        const vectorBlob = this.vectorToBlob(record.vector);
        const metadataStr = JSON.stringify(record.metadata || {});
        const contentStr = record.content || "";

        return {
          sql: `INSERT OR REPLACE INTO ${tableName} (id, vector, metadata, content) VALUES (?, vector32(?), ?, ?)`,
          args: [record.id, vectorBlob, metadataStr, contentStr],
        };
      });

      await this.client!.batch(statements, "write");
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

    const tableName = this.sanitizeTableName(indexName);
    const metric = this.indexMetrics.get(indexName) || "cosine";
    const distanceFunc = this.getDistanceFunction(metric);

    // Build vector parameter
    const vectorBlob = this.vectorToBlob(options.vector);

    // Build SELECT clause
    const selectColumns = [
      "id",
      `${distanceFunc}(vector, vector32(?)) as distance`,
    ];
    if (options.includeVectors !== false) {
      selectColumns.push("vector");
    }
    if (options.includeMetadata !== false) {
      selectColumns.push("metadata", "content");
    }

    // Build WHERE clause
    let whereClause = "";
    const filterParams: unknown[] = [];
    if (options.filter) {
      const filterResult = translateToLibSQL(options.filter);
      if (filterResult.sql && filterResult.sql !== "TRUE") {
        whereClause = `WHERE ${filterResult.sql}`;
        filterParams.push(...filterResult.params);
      }
    }

    // Build and execute query using vector_top_k for efficient search
    // LibSQL supports vector_top_k for fast approximate nearest neighbor search
    const querySQL = `
      SELECT ${selectColumns.join(", ")}
      FROM ${tableName}
      ${whereClause}
      ORDER BY distance ASC
      LIMIT ?
    `;

    const result = await this.client!.execute({
      sql: querySQL,
      args: [vectorBlob, ...filterParams, options.topK],
    });

    const queryResults: VectorQueryResult<TMetadata>[] = [];

    for (const row of result.rows) {
      const distance = row.distance as number;
      const score = this.distanceToScore(distance, metric);

      if (options.minScore && score < options.minScore) {
        continue;
      }

      let metadata: TMetadata | undefined;
      try {
        metadata =
          typeof row.metadata === "string"
            ? JSON.parse(row.metadata)
            : (row.metadata as TMetadata);
      } catch {
        metadata = {} as TMetadata;
      }

      const queryResult: VectorQueryResult<TMetadata> = {
        id: row.id as string,
        score,
        metadata,
        content: row.content as string | undefined,
      };

      // Convert vector from blob if needed
      if (options.includeVectors && row.vector) {
        queryResult.vector = this.blobToVector(
          row.vector as ArrayBuffer | number[],
        );
      }

      queryResults.push(queryResult);
    }

    return queryResults;
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

    if (!update.vector && !update.metadata) {
      return;
    }

    const tableName = this.sanitizeTableName(indexName);
    const setClauses: string[] = [];
    const params: unknown[] = [];

    if (update.vector) {
      setClauses.push("vector = vector32(?)");
      params.push(this.vectorToBlob(update.vector));
    }

    if (update.metadata) {
      setClauses.push("metadata = ?");
      params.push(JSON.stringify(update.metadata));
    }

    params.push(id);

    await this.client!.execute({
      sql: `UPDATE ${tableName} SET ${setClauses.join(", ")} WHERE id = ?`,
      args: params,
    });

    this.logDebug(`Updated vector: ${id}`);
  }

  /**
   * Get table statistics
   */
  async getStats(indexName: string): Promise<VectorStoreStats> {
    this.ensureInitialized();

    const tableName = this.sanitizeTableName(indexName);
    const result = await this.client!.execute(
      `SELECT COUNT(*) as count FROM ${tableName}`,
    );

    return {
      vectorCount: Number(result.rows[0]?.count || 0),
      dimension: this.indexDimensions.get(indexName),
    };
  }

  /**
   * Delete vectors
   */
  async delete(
    indexName: string,
    options: VectorDeleteOptions,
  ): Promise<VectorDeleteResult> {
    this.ensureInitialized();

    const tableName = this.sanitizeTableName(indexName);

    if (options.ids && options.ids.length > 0) {
      const placeholders = options.ids.map(() => "?").join(", ");
      await this.client!.execute({
        sql: `DELETE FROM ${tableName} WHERE id IN (${placeholders})`,
        args: options.ids,
      });
      return { deletedCount: options.ids.length, acknowledged: true };
    }

    if (options.filter) {
      const filterResult = translateToLibSQL(options.filter);
      if (filterResult.sql && filterResult.sql !== "TRUE") {
        await this.client!.execute({
          sql: `DELETE FROM ${tableName} WHERE ${filterResult.sql}`,
          args: filterResult.params,
        });
      }
      return { deletedCount: undefined, acknowledged: true };
    }

    if (options.deleteAll) {
      await this.client!.execute(`DELETE FROM ${tableName}`);
      return { deletedCount: undefined, acknowledged: true };
    }

    return { deletedCount: 0, acknowledged: true };
  }

  /**
   * Translate filter to LibSQL format
   */
  protected translateFilter<TMetadata extends UnknownRecord>(
    filter: MetadataFilter<TMetadata>,
  ): unknown {
    return translateToLibSQL(filter);
  }

  /**
   * Sanitize table name to prevent SQL injection
   */
  private sanitizeTableName(name: string): string {
    return name.replace(/[^a-zA-Z0-9_]/g, "_");
  }

  /**
   * Map similarity metric to LibSQL vector index metric type
   */
  private mapMetricToLibSQL(metric: SimilarityMetric): string {
    switch (metric) {
      case "cosine":
        return "cosine";
      case "euclidean":
        return "l2";
      case "dotProduct":
        return "ip"; // inner product
      default:
        return "cosine";
    }
  }

  /**
   * Get distance function for similarity metric
   */
  private getDistanceFunction(metric: SimilarityMetric): string {
    switch (metric) {
      case "cosine":
        return "vector_distance_cos";
      case "euclidean":
        return "vector_distance_l2";
      case "dotProduct":
        return "vector_distance_ip"; // inner product (negated for distance)
      default:
        return "vector_distance_cos";
    }
  }

  /**
   * Convert vector array to blob format for LibSQL
   */
  private vectorToBlob(vector: number[]): string {
    // LibSQL's vector32() function accepts a JSON array string
    return JSON.stringify(vector);
  }

  /**
   * Convert blob to vector array
   */
  private blobToVector(blob: ArrayBuffer | number[]): number[] {
    if (Array.isArray(blob)) {
      return blob;
    }
    // Convert Float32Array from ArrayBuffer
    const float32Array = new Float32Array(blob);
    return Array.from(float32Array);
  }

  /**
   * Convert distance to similarity score
   */
  private distanceToScore(distance: number, metric: SimilarityMetric): number {
    switch (metric) {
      case "cosine":
        // Cosine distance = 1 - cosine similarity
        return 1 - distance;
      case "euclidean":
        // Convert L2 distance to similarity
        return 1 / (1 + distance);
      case "dotProduct":
        // Inner product distance is already a score (higher is better)
        return distance;
      default:
        return 1 - distance;
    }
  }
}
