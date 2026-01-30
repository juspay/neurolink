/**
 * Lance Vector Store Implementation
 * High-performance columnar storage with native vector search, optimized for ML workloads
 * @see https://lancedb.github.io/lancedb/
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
import { translateToLance } from "../filterTranslator.js";

// Types for LanceDB client (using dynamic import)
type LanceConnection = {
  tableNames: () => Promise<string[]>;
  openTable: (name: string) => Promise<LanceTable>;
  createTable: (
    name: string,
    data: Array<Record<string, unknown>>,
    options?: { mode?: "create" | "overwrite" },
  ) => Promise<LanceTable>;
  dropTable: (name: string) => Promise<void>;
};

type LanceTable = {
  name: string;
  countRows: () => Promise<number>;
  add: (data: Array<Record<string, unknown>>) => Promise<void>;
  update: (options: {
    where?: string;
    values: Record<string, unknown>;
  }) => Promise<void>;
  delete: (predicate: string) => Promise<void>;
  search: (vector: number[]) => LanceQuery;
  filter: (predicate: string) => LanceQuery;
  schema: {
    fields: Array<{ name: string; type: { typeId: number } }>;
  };
};

type LanceQuery = {
  limit: (n: number) => LanceQuery;
  filter: (predicate: string) => LanceQuery;
  select: (columns: string[]) => LanceQuery;
  distanceType: (metric: string) => LanceQuery;
  toArray: () => Promise<Array<LanceSearchResult>>;
};

type LanceSearchResult = {
  id: string;
  vector?: number[];
  _distance?: number;
  [key: string]: unknown;
};

/**
 * Lance-specific configuration
 */
export type LanceConfig = VectorStoreConfig & {
  /** Path to Lance database directory (required) */
  uri: string;
  /** Storage options (S3, GCS, Azure Blob) */
  storageOptions?: Record<string, string>;
  /** Read consistency level */
  readConsistency?: "strong" | "eventual";
};

/**
 * Lance Vector Store implementation
 * Leverages Lance's columnar format for efficient vector operations
 */
export class LanceStore extends BaseVectorStore<LanceConfig> {
  private connection: LanceConnection | null = null;
  private tableCache: Map<string, LanceTable> = new Map();
  private tableDimensions: Map<string, number> = new Map();

  constructor(config: LanceConfig) {
    super(config, "lance" as VectorStoreName);
  }

  /**
   * Initialize connection to LanceDB
   */
  async connect(): Promise<void> {
    if (this.initialized) {
      return;
    }

    try {
      // Dynamically import LanceDB
      const lancedb = await import("@lancedb/lancedb");

      this.connection = (await lancedb.connect(
        this.config.uri,
        this.config.storageOptions
          ? { storageOptions: this.config.storageOptions }
          : undefined,
      )) as unknown as LanceConnection;

      this.initialized = true;
      this.logInfo("Connected successfully", { uri: this.config.uri });
    } catch (error) {
      this.logError("Failed to connect", error);
      throw new Error(
        `Failed to connect to LanceDB: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Disconnect from LanceDB
   */
  async disconnect(): Promise<void> {
    this.tableCache.clear();
    this.tableDimensions.clear();
    this.connection = null;
    this.initialized = false;
    this.logInfo("Disconnected");
  }

  /**
   * Create a new table (index)
   */
  async createIndex(config: VectorIndexConfig): Promise<void> {
    this.ensureInitialized();

    // Lance requires at least one row to infer schema
    // Create with a placeholder that will be deleted
    const placeholderData = [
      {
        id: "__placeholder__",
        vector: new Array(config.dimension).fill(0),
        _metadata: {},
        _content: "",
      },
    ];

    const table = await this.connection!.createTable(
      config.name,
      placeholderData,
      { mode: "create" },
    );

    // Delete the placeholder
    await table.delete("id = '__placeholder__'");

    // Cache table and dimension
    this.tableCache.set(config.name, table);
    this.tableDimensions.set(config.name, config.dimension);

    this.logInfo(`Table created: ${config.name}`, {
      dimension: config.dimension,
      metric: config.metric || "L2",
    });
  }

  /**
   * Delete a table (index)
   */
  async deleteIndex(indexName: string): Promise<void> {
    this.ensureInitialized();

    await this.connection!.dropTable(indexName);
    this.tableCache.delete(indexName);
    this.tableDimensions.delete(indexName);
    this.logInfo(`Table deleted: ${indexName}`);
  }

  /**
   * List all tables
   */
  async listIndexes(): Promise<string[]> {
    this.ensureInitialized();
    return await this.connection!.tableNames();
  }

  /**
   * Check if a table exists
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

    const table = await this.getTable(indexName);
    const batchSize = options?.batchSize || 1000;
    let totalUpserted = 0;

    // Convert records to Lance format
    const rows = records.map((record) => ({
      id: record.id,
      vector: record.vector,
      _metadata: JSON.stringify(record.metadata || {}),
      _content: record.content || "",
    }));

    // Lance doesn't have native upsert, so we need to delete existing IDs first
    const ids = records.map((r) => r.id);
    const idList = ids.map((id) => `'${id}'`).join(", ");

    try {
      await table.delete(`id IN (${idList})`);
    } catch {
      // Ignore errors if records don't exist
    }

    // Batch insert
    for (let i = 0; i < rows.length; i += batchSize) {
      const batch = rows.slice(i, i + batchSize);
      await table.add(batch);
      totalUpserted += batch.length;
      this.logDebug(`Upserted batch: ${totalUpserted}/${rows.length}`);
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

    const table = await this.getTable(indexName);

    // Build query
    let query = table
      .search(options.vector)
      .limit(options.topK)
      .distanceType(this.mapMetric(options.filter ? "cosine" : "L2"));

    // Apply filter if provided
    if (options.filter) {
      const filterStr = translateToLance(options.filter);
      if (filterStr) {
        query = query.filter(filterStr);
      }
    }

    // Select columns based on options
    const columns = ["id", "_distance"];
    if (options.includeVectors !== false) {
      columns.push("vector");
    }
    if (options.includeMetadata !== false) {
      columns.push("_metadata", "_content");
    }
    query = query.select(columns);

    const results = await query.toArray();
    const queryResults: VectorQueryResult<TMetadata>[] = [];

    for (const result of results) {
      // Convert distance to similarity score (1 / (1 + distance) for L2)
      const distance = result._distance || 0;
      const score = 1 / (1 + distance);

      // Skip results below minimum score threshold
      if (options.minScore && score < options.minScore) {
        continue;
      }

      let metadata: TMetadata | undefined;
      try {
        metadata =
          typeof result._metadata === "string"
            ? JSON.parse(result._metadata)
            : (result._metadata as TMetadata);
      } catch {
        metadata = {} as TMetadata;
      }

      const queryResult: VectorQueryResult<TMetadata> = {
        id: result.id,
        score,
        metadata,
        content: result._content as string | undefined,
      };

      if (options.includeVectors) {
        queryResult.vector = result.vector;
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

    const table = await this.getTable(indexName);

    // Build update values
    const values: Record<string, unknown> = {};
    if (update.vector) {
      values.vector = update.vector;
    }
    if (update.metadata) {
      values._metadata = JSON.stringify(update.metadata);
    }

    await table.update({
      where: `id = '${id}'`,
      values,
    });

    this.logDebug(`Updated vector: ${id}`);
  }

  /**
   * Get table statistics
   */
  async getStats(indexName: string): Promise<VectorStoreStats> {
    this.ensureInitialized();

    const table = await this.getTable(indexName);
    const count = await table.countRows();
    const dimension = this.tableDimensions.get(indexName);

    return {
      vectorCount: count,
      dimension,
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

    const table = await this.getTable(indexName);

    if (options.ids && options.ids.length > 0) {
      const idList = options.ids.map((id) => `'${id}'`).join(", ");
      await table.delete(`id IN (${idList})`);
      return { deletedCount: options.ids.length, acknowledged: true };
    }

    if (options.filter) {
      const filterStr = translateToLance(options.filter);
      if (filterStr) {
        await table.delete(filterStr);
      }
      return { deletedCount: undefined, acknowledged: true };
    }

    if (options.deleteAll) {
      await table.delete("TRUE");
      return { deletedCount: undefined, acknowledged: true };
    }

    return { deletedCount: 0, acknowledged: true };
  }

  /**
   * Translate filter to Lance format
   */
  protected translateFilter<TMetadata extends UnknownRecord>(
    filter: MetadataFilter<TMetadata>,
  ): unknown {
    return translateToLance(filter);
  }

  /**
   * Get or fetch table
   */
  private async getTable(indexName: string): Promise<LanceTable> {
    if (!this.tableCache.has(indexName)) {
      const table = await this.connection!.openTable(indexName);
      this.tableCache.set(indexName, table);

      // Try to infer dimension from schema
      const vectorField = table.schema.fields.find((f) => f.name === "vector");
      if (vectorField) {
        // Note: Lance schema doesn't directly expose fixed-size list length
        // Dimension would need to be queried from existing data
      }
    }
    return this.tableCache.get(indexName)!;
  }

  /**
   * Map similarity metric to Lance format
   */
  private mapMetric(metric?: SimilarityMetric | string): string {
    switch (metric) {
      case "cosine":
        return "cosine";
      case "euclidean":
      case "L2":
        return "L2";
      case "dotProduct":
        return "dot";
      default:
        return "L2";
    }
  }
}
