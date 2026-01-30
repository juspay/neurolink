/**
 * DuckDB Vector Store Implementation
 * Analytical database with VSS (Vector Similarity Search) extension
 * @see https://duckdb.org/docs/extensions/vss
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
import { translateToDuckDB } from "../filterTranslator.js";

// Types for DuckDB client (using dynamic import)
type DuckDBConnection = {
  run: (sql: string, ...params: unknown[]) => Promise<void>;
  all: <T = Record<string, unknown>>(
    sql: string,
    ...params: unknown[]
  ) => Promise<T[]>;
  exec: (sql: string) => Promise<void>;
  close: () => Promise<void>;
};

type DuckDBDatabase = {
  connect: () => Promise<DuckDBConnection>;
  close: () => Promise<void>;
};

/**
 * DuckDB-specific configuration
 */
export type DuckDBConfig = VectorStoreConfig & {
  /** Path to DuckDB database file (use ":memory:" for in-memory) */
  path?: string;
  /** Enable read-only mode */
  readOnly?: boolean;
  /** Access mode: "automatic", "read_only", "read_write" */
  accessMode?: "automatic" | "read_only" | "read_write";
  /** Thread count for parallel operations */
  threads?: number;
  /** Maximum memory usage */
  maxMemory?: string;
};

/**
 * DuckDB Vector Store implementation
 * Uses DuckDB's VSS extension for vector similarity search
 */
export class DuckDBStore extends BaseVectorStore<DuckDBConfig> {
  private db: DuckDBDatabase | null = null;
  private connection: DuckDBConnection | null = null;
  private indexDimensions: Map<string, number> = new Map();
  private indexMetrics: Map<string, SimilarityMetric> = new Map();

  constructor(config: DuckDBConfig) {
    super(config, "duckdb" as VectorStoreName);
  }

  /**
   * Initialize connection to DuckDB
   */
  async connect(): Promise<void> {
    if (this.initialized) {
      return;
    }

    try {
      // Dynamically import DuckDB
      const duckdb = await import("duckdb-async");

      const dbPath = this.config.path || ":memory:";
      this.db = (await duckdb.Database.create(
        dbPath,
      )) as unknown as DuckDBDatabase;
      this.connection = await this.db.connect();

      // Install and load the VSS extension
      await this.connection.exec("INSTALL vss;");
      await this.connection.exec("LOAD vss;");

      // Configure DuckDB settings if provided
      if (this.config.threads) {
        await this.connection.exec(`SET threads TO ${this.config.threads};`);
      }
      if (this.config.maxMemory) {
        await this.connection.exec(
          `SET max_memory TO '${this.config.maxMemory}';`,
        );
      }

      this.initialized = true;
      this.logInfo("Connected successfully", { path: dbPath });
    } catch (error) {
      this.logError("Failed to connect", error);
      throw new Error(
        `Failed to connect to DuckDB: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Disconnect from DuckDB
   */
  async disconnect(): Promise<void> {
    if (this.connection) {
      await this.connection.close();
      this.connection = null;
    }
    if (this.db) {
      await this.db.close();
      this.db = null;
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

    // Create table with vector column using FLOAT array
    const createTableSQL = `
      CREATE TABLE IF NOT EXISTS ${tableName} (
        id VARCHAR PRIMARY KEY,
        vector FLOAT[${config.dimension}],
        metadata JSON,
        content VARCHAR
      )
    `;

    await this.connection!.exec(createTableSQL);

    // Create HNSW index for vector similarity search
    const indexName = `${tableName}_vector_idx`;
    const metricType = this.mapMetricToHNSW(metric);

    const createIndexSQL = `
      CREATE INDEX IF NOT EXISTS ${indexName}
      ON ${tableName}
      USING HNSW (vector)
      WITH (metric = '${metricType}')
    `;

    await this.connection!.exec(createIndexSQL);

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
    await this.connection!.exec(`DROP TABLE IF EXISTS ${tableName}`);

    this.indexDimensions.delete(indexName);
    this.indexMetrics.delete(indexName);
    this.logInfo(`Table deleted: ${indexName}`);
  }

  /**
   * List all tables
   */
  async listIndexes(): Promise<string[]> {
    this.ensureInitialized();

    const result = await this.connection!.all<{ table_name: string }>(
      "SELECT table_name FROM information_schema.tables WHERE table_schema = 'main'",
    );

    return result.map((row) => row.table_name);
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
    const batchSize = options?.batchSize || 1000;
    let totalUpserted = 0;

    for (let i = 0; i < records.length; i += batchSize) {
      const batch = records.slice(i, i + batchSize);

      // Build INSERT statement with ON CONFLICT for upsert
      const values = batch
        .map((record) => {
          const vectorStr = `[${record.vector.join(", ")}]`;
          const metadataStr = JSON.stringify(record.metadata || {}).replace(
            /'/g,
            "''",
          );
          const contentStr = (record.content || "").replace(/'/g, "''");
          return `('${record.id}', ${vectorStr}::FLOAT[${record.vector.length}], '${metadataStr}'::JSON, '${contentStr}')`;
        })
        .join(", ");

      const upsertSQL = `
        INSERT INTO ${tableName} (id, vector, metadata, content)
        VALUES ${values}
        ON CONFLICT (id) DO UPDATE SET
          vector = EXCLUDED.vector,
          metadata = EXCLUDED.metadata,
          content = EXCLUDED.content
      `;

      await this.connection!.exec(upsertSQL);
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

    // Build vector literal
    const vectorStr = `[${options.vector.join(", ")}]::FLOAT[${options.vector.length}]`;

    // Build SELECT clause
    const selectColumns = [
      "id",
      `${distanceFunc}(vector, ${vectorStr}) as distance`,
    ];
    if (options.includeVectors !== false) {
      selectColumns.push("vector");
    }
    if (options.includeMetadata !== false) {
      selectColumns.push("metadata", "content");
    }

    // Build WHERE clause
    let whereClause = "";
    if (options.filter) {
      const filterResult = translateToDuckDB(options.filter);
      if (filterResult.sql && filterResult.sql !== "TRUE") {
        whereClause = `WHERE ${filterResult.sql}`;
      }
    }

    // Build and execute query
    const querySQL = `
      SELECT ${selectColumns.join(", ")}
      FROM ${tableName}
      ${whereClause}
      ORDER BY distance ASC
      LIMIT ${options.topK}
    `;

    const results = await this.connection!.all<{
      id: string;
      distance: number;
      vector?: number[];
      metadata?: string;
      content?: string;
    }>(querySQL);

    const queryResults: VectorQueryResult<TMetadata>[] = [];

    for (const row of results) {
      // Convert distance to similarity score
      const score = this.distanceToScore(row.distance, metric);

      if (options.minScore && score < options.minScore) {
        continue;
      }

      let metadata: TMetadata | undefined;
      try {
        if (typeof row.metadata === "string" && row.metadata) {
          metadata = JSON.parse(row.metadata) as TMetadata;
        } else if (row.metadata) {
          metadata = row.metadata as unknown as TMetadata;
        }
      } catch {
        metadata = {} as TMetadata;
      }

      const result: VectorQueryResult<TMetadata> = {
        id: row.id,
        score,
        metadata,
        content: row.content,
      };

      if (options.includeVectors) {
        result.vector = row.vector;
      }

      queryResults.push(result);
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

    if (update.vector) {
      const vectorStr = `[${update.vector.join(", ")}]::FLOAT[${update.vector.length}]`;
      setClauses.push(`vector = ${vectorStr}`);
    }

    if (update.metadata) {
      const metadataStr = JSON.stringify(update.metadata).replace(/'/g, "''");
      setClauses.push(`metadata = '${metadataStr}'::JSON`);
    }

    const updateSQL = `
      UPDATE ${tableName}
      SET ${setClauses.join(", ")}
      WHERE id = '${id}'
    `;

    await this.connection!.exec(updateSQL);
    this.logDebug(`Updated vector: ${id}`);
  }

  /**
   * Get table statistics
   */
  async getStats(indexName: string): Promise<VectorStoreStats> {
    this.ensureInitialized();

    const tableName = this.sanitizeTableName(indexName);
    const result = await this.connection!.all<{ count: number }>(
      `SELECT COUNT(*) as count FROM ${tableName}`,
    );

    return {
      vectorCount: result[0]?.count || 0,
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
      const idList = options.ids.map((id) => `'${id}'`).join(", ");
      await this.connection!.exec(
        `DELETE FROM ${tableName} WHERE id IN (${idList})`,
      );
      return { deletedCount: options.ids.length, acknowledged: true };
    }

    if (options.filter) {
      const filterResult = translateToDuckDB(options.filter);
      if (filterResult.sql && filterResult.sql !== "TRUE") {
        await this.connection!.exec(
          `DELETE FROM ${tableName} WHERE ${filterResult.sql}`,
        );
      }
      return { deletedCount: undefined, acknowledged: true };
    }

    if (options.deleteAll) {
      await this.connection!.exec(`DELETE FROM ${tableName}`);
      return { deletedCount: undefined, acknowledged: true };
    }

    return { deletedCount: 0, acknowledged: true };
  }

  /**
   * Translate filter to DuckDB format
   */
  protected translateFilter<TMetadata extends UnknownRecord>(
    filter: MetadataFilter<TMetadata>,
  ): unknown {
    return translateToDuckDB(filter);
  }

  /**
   * Sanitize table name to prevent SQL injection
   */
  private sanitizeTableName(name: string): string {
    return name.replace(/[^a-zA-Z0-9_]/g, "_");
  }

  /**
   * Map similarity metric to HNSW index metric type
   */
  private mapMetricToHNSW(metric: SimilarityMetric): string {
    switch (metric) {
      case "cosine":
        return "cosine";
      case "euclidean":
        return "l2sq";
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
        return "array_cosine_distance";
      case "euclidean":
        return "array_distance";
      case "dotProduct":
        return "array_inner_product";
      default:
        return "array_cosine_distance";
    }
  }

  /**
   * Convert distance to similarity score
   */
  private distanceToScore(distance: number, metric: SimilarityMetric): number {
    switch (metric) {
      case "cosine":
        // Cosine distance = 1 - cosine similarity, so score = 1 - distance
        return 1 - distance;
      case "euclidean":
        // Convert L2 distance to similarity: 1 / (1 + distance)
        return 1 / (1 + distance);
      case "dotProduct":
        // For dot product, higher is better, negate for distance
        return distance;
      default:
        return 1 - distance;
    }
  }
}
