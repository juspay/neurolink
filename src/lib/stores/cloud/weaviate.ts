/**
 * Weaviate Vector Store Implementation
 * Open-source vector database with powerful hybrid search capabilities
 * @see https://weaviate.io/developers/weaviate
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
import { translateToWeaviate } from "../filterTranslator.js";

// Weaviate client types for dynamic import
type WeaviateClient = {
  schema: {
    classGetter: () => { do: () => Promise<WeaviateClass[]> };
    classCreator: () => {
      withClass: (cls: WeaviateClass) => { do: () => Promise<void> };
    };
    classDeleter: () => {
      withClassName: (name: string) => { do: () => Promise<void> };
    };
    exists: (className: string) => Promise<boolean>;
  };
  data: {
    creator: () => WeaviateDataCreator;
    deleter: () => WeaviateDataDeleter;
    getterById: () => {
      withClassName: (name: string) => {
        withId: (id: string) => { do: () => Promise<WeaviateObject | null> };
      };
    };
    updater: () => WeaviateDataUpdater;
  };
  batch: {
    objectsBatcher: () => WeaviateBatcher;
  };
  graphql: {
    aggregate: () => WeaviateAggregator;
    get: () => WeaviateGetter;
  };
};

type WeaviateClass = {
  class: string;
  description?: string;
  vectorIndexType?: string;
  vectorIndexConfig?: {
    distance?: string;
    ef?: number;
    efConstruction?: number;
    maxConnections?: number;
  };
  properties?: Array<{
    name: string;
    dataType: string[];
    description?: string;
  }>;
};

type WeaviateObject = {
  id: string;
  class: string;
  properties: Record<string, unknown>;
  vector?: number[];
};

type WeaviateDataCreator = {
  withClassName: (name: string) => WeaviateDataCreator;
  withProperties: (props: Record<string, unknown>) => WeaviateDataCreator;
  withVector: (vector: number[]) => WeaviateDataCreator;
  withId: (id: string) => WeaviateDataCreator;
  do: () => Promise<{ id: string }>;
};

type WeaviateDataDeleter = {
  withClassName: (name: string) => WeaviateDataDeleter;
  withId: (id: string) => WeaviateDataDeleter;
  withWhere: (where: Record<string, unknown>) => WeaviateDataDeleter;
  do: () => Promise<void>;
};

type WeaviateDataUpdater = {
  withClassName: (name: string) => WeaviateDataUpdater;
  withId: (id: string) => WeaviateDataUpdater;
  withProperties: (props: Record<string, unknown>) => WeaviateDataUpdater;
  withVector: (vector: number[]) => WeaviateDataUpdater;
  do: () => Promise<void>;
};

type WeaviateBatcher = {
  withObject: (obj: {
    class: string;
    id: string;
    properties: Record<string, unknown>;
    vector?: number[];
  }) => WeaviateBatcher;
  do: () => Promise<
    Array<{ result?: { errors?: { error?: Array<{ message: string }> } } }>
  >;
};

type WeaviateAggregator = {
  withClassName: (name: string) => WeaviateAggregator;
  withFields: (fields: string) => WeaviateAggregator;
  do: () => Promise<{
    data: { Aggregate: Record<string, Array<{ meta: { count: number } }>> };
  }>;
};

type WeaviateGetter = {
  withClassName: (name: string) => WeaviateGetter;
  withFields: (fields: string) => WeaviateGetter;
  withNearVector: (opts: {
    vector: number[];
    certainty?: number;
  }) => WeaviateGetter;
  withWhere: (where: Record<string, unknown>) => WeaviateGetter;
  withLimit: (limit: number) => WeaviateGetter;
  do: () => Promise<{
    data: { Get: Record<string, Array<WeaviateQueryResult>> };
  }>;
};

type WeaviateQueryResult = {
  _additional: {
    id: string;
    certainty?: number;
    distance?: number;
    vector?: number[];
  };
  [key: string]: unknown;
};

/**
 * Weaviate-specific configuration
 */
export type WeaviateConfig = VectorStoreConfig & {
  /** Weaviate host URL (required) */
  host: string;
  /** Weaviate API key (optional, for Weaviate Cloud) */
  apiKey?: string;
  /** HTTP/HTTPS scheme */
  scheme?: "http" | "https";
  /** Additional headers */
  headers?: Record<string, string>;
};

/**
 * Weaviate Vector Store implementation
 */
export class WeaviateStore extends BaseVectorStore<WeaviateConfig> {
  private client: WeaviateClient | null = null;

  constructor(config: WeaviateConfig) {
    super(config, "weaviate" as VectorStoreName);
  }

  /**
   * Initialize connection to Weaviate
   */
  async connect(): Promise<void> {
    if (this.initialized) {
      return;
    }

    try {
      // Dynamically import Weaviate client
      // @ts-expect-error - Optional dependency, may not be installed
      const weaviate = await import("weaviate-ts-client");

      const scheme = this.config.scheme || "https";
      const host = this.config.host.replace(/^https?:\/\//, "");

      const clientConfig: {
        scheme: string;
        host: string;
        apiKey?: { apiKey: string };
        headers?: Record<string, string>;
      } = {
        scheme,
        host,
      };

      if (this.config.apiKey) {
        clientConfig.apiKey = { apiKey: this.config.apiKey };
      }

      if (this.config.headers) {
        clientConfig.headers = this.config.headers;
      }

      this.client = weaviate.default.client(
        clientConfig,
      ) as unknown as WeaviateClient;

      this.initialized = true;
      this.logInfo("Connected successfully");
    } catch (error) {
      this.logError("Failed to connect", error);
      throw new Error(
        `Failed to connect to Weaviate: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Disconnect from Weaviate
   */
  async disconnect(): Promise<void> {
    this.client = null;
    this.initialized = false;
    this.logInfo("Disconnected");
  }

  /**
   * Create a new class (index)
   */
  async createIndex(config: VectorIndexConfig): Promise<void> {
    this.ensureInitialized();

    const className = this.normalizeClassName(config.name);
    const distance = this.mapMetric(config.metric || "cosine");

    const classConfig: WeaviateClass = {
      class: className,
      description: `Vector index ${config.name} with dimension ${config.dimension}`,
      vectorIndexType: "hnsw",
      vectorIndexConfig: {
        distance,
        ef: 100,
        efConstruction: 128,
        maxConnections: 64,
        ...((config.config as Record<string, unknown>) || {}),
      },
      properties: [
        {
          name: "content",
          dataType: ["text"],
          description: "Original text content",
        },
        {
          name: "_metadata",
          dataType: ["text"],
          description: "JSON-encoded metadata",
        },
      ],
    };

    await this.client!.schema.classCreator().withClass(classConfig).do();

    this.logInfo(`Index created: ${className}`, {
      dimension: config.dimension,
      metric: config.metric,
    });
  }

  /**
   * Delete a class (index)
   */
  async deleteIndex(indexName: string): Promise<void> {
    this.ensureInitialized();

    const className = this.normalizeClassName(indexName);
    await this.client!.schema.classDeleter().withClassName(className).do();
    this.logInfo(`Index deleted: ${className}`);
  }

  /**
   * List all classes (indexes)
   */
  async listIndexes(): Promise<string[]> {
    this.ensureInitialized();

    const response = await this.client!.schema.classGetter().do();
    return response.map((cls) => cls.class);
  }

  /**
   * Check if a class exists
   */
  async indexExists(indexName: string): Promise<boolean> {
    this.ensureInitialized();

    const className = this.normalizeClassName(indexName);
    return await this.client!.schema.exists(className);
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

    const className = this.normalizeClassName(indexName);
    const batchSize = options?.batchSize || 100;
    let totalUpserted = 0;

    // Process in batches
    for (let i = 0; i < records.length; i += batchSize) {
      const batch = records.slice(i, i + batchSize);
      let batcher = this.client!.batch.objectsBatcher();

      for (const record of batch) {
        const properties: Record<string, unknown> = {
          content: record.content || "",
          _metadata: JSON.stringify(record.metadata || {}),
        };

        // Add any metadata fields as top-level properties for filtering
        if (record.metadata) {
          for (const [key, value] of Object.entries(record.metadata)) {
            if (
              typeof value === "string" ||
              typeof value === "number" ||
              typeof value === "boolean"
            ) {
              properties[key] = value;
            }
          }
        }

        batcher = batcher.withObject({
          class: className,
          id: this.toWeaviateUUID(record.id),
          properties,
          vector: record.vector,
        });
      }

      const results = await batcher.do();

      // Count successful inserts
      for (const result of results) {
        if (!result.result?.errors?.error?.length) {
          totalUpserted++;
        }
      }

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

    const className = this.normalizeClassName(indexName);

    // Build field list
    const fields = options.includeVectors
      ? "_additional { id certainty distance vector } content _metadata"
      : "_additional { id certainty distance } content _metadata";

    let getter = this.client!.graphql.get()
      .withClassName(className)
      .withFields(fields)
      .withNearVector({
        vector: options.vector,
        certainty: options.minScore,
      })
      .withLimit(options.topK);

    // Apply filter if provided
    if (options.filter) {
      getter = getter.withWhere(translateToWeaviate(options.filter));
    }

    const response = await getter.do();
    const results = response.data?.Get?.[className] || [];

    return results.map((result) => {
      // Parse metadata from JSON string
      let metadata: TMetadata = {} as TMetadata;
      try {
        if (result._metadata) {
          metadata = JSON.parse(result._metadata as string) as TMetadata;
        }
      } catch {
        // Fall back to empty metadata
      }

      return {
        id: this.fromWeaviateUUID(result._additional.id),
        score:
          result._additional.certainty ??
          1 - (result._additional.distance ?? 0),
        vector: options.includeVectors ? result._additional.vector : undefined,
        metadata: options.includeMetadata !== false ? metadata : undefined,
        content: result.content as string | undefined,
      };
    });
  }

  /**
   * Delete vectors
   */
  async delete(
    indexName: string,
    options: VectorDeleteOptions,
  ): Promise<VectorDeleteResult> {
    this.ensureInitialized();

    const className = this.normalizeClassName(indexName);
    let deletedCount = 0;

    if (options.deleteAll) {
      // Delete all by recreating the class (Weaviate doesn't have bulk delete)
      const exists = await this.indexExists(indexName);
      if (exists) {
        // Get existing class config
        const classes = await this.client!.schema.classGetter().do();
        const existingClass = classes.find((c) => c.class === className);

        await this.deleteIndex(indexName);

        if (existingClass) {
          await this.client!.schema.classCreator()
            .withClass(existingClass)
            .do();
        }
      }
      return { deletedCount: undefined, acknowledged: true };
    }

    if (options.ids && options.ids.length > 0) {
      for (const id of options.ids) {
        try {
          await this.client!.data.deleter()
            .withClassName(className)
            .withId(this.toWeaviateUUID(id))
            .do();
          deletedCount++;
        } catch {
          // Item may not exist
        }
      }
      return { deletedCount, acknowledged: true };
    }

    if (options.filter) {
      // Weaviate batch delete with filter
      const where = translateToWeaviate(options.filter);
      await this.client!.data.deleter()
        .withClassName(className)
        .withWhere(where)
        .do();
      return { deletedCount: undefined, acknowledged: true };
    }

    return { deletedCount: 0, acknowledged: true };
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

    const className = this.normalizeClassName(indexName);
    const weaviateId = this.toWeaviateUUID(id);

    // Build update properties
    const properties: Record<string, unknown> = {};

    if (update.metadata) {
      properties._metadata = JSON.stringify(update.metadata);
      // Also update top-level filter fields
      for (const [key, value] of Object.entries(update.metadata)) {
        if (
          typeof value === "string" ||
          typeof value === "number" ||
          typeof value === "boolean"
        ) {
          properties[key] = value;
        }
      }
    }

    let updater = this.client!.data.updater()
      .withClassName(className)
      .withId(weaviateId);

    if (Object.keys(properties).length > 0) {
      updater = updater.withProperties(properties);
    }

    if (update.vector) {
      updater = updater.withVector(update.vector);
    }

    await updater.do();
    this.logDebug(`Updated vector: ${id}`);
  }

  /**
   * Get index statistics
   */
  async getStats(indexName: string): Promise<VectorStoreStats> {
    this.ensureInitialized();

    const className = this.normalizeClassName(indexName);

    const response = await this.client!.graphql.aggregate()
      .withClassName(className)
      .withFields("meta { count }")
      .do();

    const aggregation = response.data?.Aggregate?.[className]?.[0];
    const count = aggregation?.meta?.count || 0;

    return {
      vectorCount: count,
      metrics: { className },
    };
  }

  /**
   * Translate filter to Weaviate format
   */
  protected translateFilter<TMetadata extends UnknownRecord>(
    filter: MetadataFilter<TMetadata>,
  ): unknown {
    return translateToWeaviate(filter);
  }

  /**
   * Map similarity metric to Weaviate distance metric
   */
  private mapMetric(metric: SimilarityMetric): string {
    switch (metric) {
      case "cosine":
        return "cosine";
      case "euclidean":
        return "l2-squared";
      case "dotProduct":
        return "dot";
      default:
        return "cosine";
    }
  }

  /**
   * Normalize class name to Weaviate convention (PascalCase, starts with uppercase)
   */
  private normalizeClassName(name: string): string {
    // Weaviate class names must start with uppercase and be alphanumeric
    const normalized = name
      .replace(/[^a-zA-Z0-9]/g, "_")
      .split("_")
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
      .join("");

    return normalized || "Index";
  }

  /**
   * Convert custom ID to Weaviate UUID format
   */
  private toWeaviateUUID(id: string): string {
    // If already a valid UUID, return as-is
    if (
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)
    ) {
      return id;
    }

    // Generate deterministic UUID from custom ID
    const hash = this.hashString(id);
    return `${hash.slice(0, 8)}-${hash.slice(8, 12)}-4${hash.slice(13, 16)}-a${hash.slice(17, 20)}-${hash.slice(20, 32)}`;
  }

  /**
   * Convert Weaviate UUID back to original format
   * (Note: this returns the UUID if we can't determine the original ID)
   */
  private fromWeaviateUUID(uuid: string): string {
    return uuid;
  }

  /**
   * Generate a deterministic hash from a string
   */
  private hashString(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash;
    }

    // Convert to hex and pad
    const hex = Math.abs(hash).toString(16).padStart(32, "0");
    return hex.slice(0, 32);
  }
}
