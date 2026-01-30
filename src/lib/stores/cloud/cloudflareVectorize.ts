/**
 * Cloudflare Vectorize Store Implementation
 * Edge-native vector database running on Cloudflare's global network
 * @see https://developers.cloudflare.com/vectorize/
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
import { translateToCloudflare } from "../filterTranslator.js";

// Types for Cloudflare Vectorize client
// Note: Cloudflare Vectorize is typically accessed via Workers binding or REST API
type VectorizeIndex = {
  insert: (vectors: VectorizeVector[]) => Promise<VectorizeInsertResult>;
  upsert: (vectors: VectorizeVector[]) => Promise<VectorizeUpsertResult>;
  query: (
    vector: number[],
    options: VectorizeQueryOptions,
  ) => Promise<VectorizeQueryResult>;
  getByIds: (ids: string[]) => Promise<VectorizeVector[]>;
  deleteByIds: (ids: string[]) => Promise<VectorizeDeleteResult>;
};

type VectorizeVector = {
  id: string;
  values: number[];
  metadata?: Record<string, VectorizeMetadataValue>;
  namespace?: string;
};

type VectorizeMetadataValue = string | number | boolean | string[];

type VectorizeInsertResult = {
  count: number;
  ids: string[];
};

type VectorizeUpsertResult = {
  count: number;
  ids: string[];
};

type VectorizeQueryOptions = {
  topK: number;
  filter?: VectorizeFilter;
  namespace?: string;
  returnValues?: boolean;
  returnMetadata?: "all" | "indexed" | "none";
};

type VectorizeFilter = Record<
  string,
  | VectorizeMetadataValue
  | { $eq?: VectorizeMetadataValue }
  | { $ne?: VectorizeMetadataValue }
  | { $in?: VectorizeMetadataValue[] }
>;

type VectorizeQueryResult = {
  matches: VectorizeMatch[];
  count: number;
};

type VectorizeMatch = {
  id: string;
  score: number;
  values?: number[];
  metadata?: Record<string, VectorizeMetadataValue>;
};

type VectorizeDeleteResult = {
  count: number;
  ids: string[];
};

type VectorizeIndexInfo = {
  name: string;
  dimensions: number;
  metric: string;
  vectorsCount: number;
};

/**
 * Cloudflare Vectorize configuration
 */
export type CloudflareVectorizeConfig = VectorStoreConfig & {
  /** Cloudflare Account ID (required) */
  accountId: string;
  /** Cloudflare API Token with Vectorize permissions (required) */
  apiToken: string;
  /** Index name (required) */
  indexName: string;
  /** Base URL for Cloudflare API (optional, defaults to production) */
  baseUrl?: string;
};

/**
 * Cloudflare Vectorize Store implementation
 */
export class CloudflareVectorizeStore extends BaseVectorStore<CloudflareVectorizeConfig> {
  private baseUrl: string;
  private headers: Record<string, string>;
  private indexInfo: VectorizeIndexInfo | null = null;

  constructor(config: CloudflareVectorizeConfig) {
    super(config, "cloudflare" as VectorStoreName);
    this.baseUrl =
      config.baseUrl ||
      `https://api.cloudflare.com/client/v4/accounts/${config.accountId}/vectorize/v2/indexes`;
    this.headers = {
      Authorization: `Bearer ${config.apiToken}`,
      "Content-Type": "application/json",
    };
  }

  /**
   * Execute an HTTP request with retry logic
   */
  private async request<T>(
    method: string,
    path: string,
    body?: unknown,
  ): Promise<T> {
    const maxRetries = this.config.maxRetries || 3;
    const baseDelay = 1000;
    let lastError: Error | undefined;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        const url = `${this.baseUrl}${path}`;
        const options: RequestInit = {
          method,
          headers: this.headers,
        };

        if (body) {
          options.body = JSON.stringify(body);
        }

        const response = await fetch(url, options);

        if (!response.ok) {
          const errorBody = await response.text();
          throw new Error(
            `Cloudflare API error (${response.status}): ${errorBody}`,
          );
        }

        const data = (await response.json()) as { result: T; success: boolean };
        if (!data.success) {
          throw new Error("Cloudflare API returned unsuccessful response");
        }

        return data.result;
      } catch (error) {
        lastError = error as Error;
        if (this.isRetryableError(error)) {
          const delay = baseDelay * 2 ** attempt;
          this.logDebug(
            `Retrying request in ${delay}ms (attempt ${attempt + 1}/${maxRetries})`,
          );
          await new Promise((resolve) => setTimeout(resolve, delay));
        } else {
          throw error;
        }
      }
    }
    throw lastError;
  }

  /**
   * Check if an error is retryable
   */
  private isRetryableError(error: unknown): boolean {
    const message = (error as Error)?.message?.toLowerCase() || "";
    return (
      message.includes("429") ||
      message.includes("503") ||
      message.includes("rate limit") ||
      message.includes("timeout")
    );
  }

  /**
   * Initialize connection to Cloudflare Vectorize
   */
  async connect(): Promise<void> {
    if (this.initialized) {
      return;
    }

    try {
      // Test connection by getting index info
      this.indexInfo = await this.request<VectorizeIndexInfo>(
        "GET",
        `/${this.config.indexName}`,
      );

      this.initialized = true;
      this.logInfo("Connected successfully", {
        indexName: this.config.indexName,
        dimensions: this.indexInfo.dimensions,
        vectorsCount: this.indexInfo.vectorsCount,
      });
    } catch (error) {
      this.logError("Failed to connect", error);
      throw new Error(
        `Failed to connect to Cloudflare Vectorize: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Disconnect from Cloudflare Vectorize
   */
  async disconnect(): Promise<void> {
    this.indexInfo = null;
    this.initialized = false;
    this.logInfo("Disconnected");
  }

  /**
   * Create a new index
   * Note: Cloudflare Vectorize indexes are created via wrangler CLI or API
   */
  async createIndex(config: VectorIndexConfig): Promise<void> {
    this.ensureInitialized();

    // Cloudflare Vectorize supports creating indexes via API
    const metric = this.mapMetric(config.metric || "cosine");

    await this.request("POST", "", {
      name: config.name,
      config: {
        dimensions: config.dimension,
        metric,
      },
    });

    this.logInfo(`Index created: ${config.name}`, {
      dimension: config.dimension,
      metric,
    });
  }

  /**
   * Delete an index
   */
  async deleteIndex(indexName: string): Promise<void> {
    this.ensureInitialized();

    await this.request("DELETE", `/${indexName}`);
    this.logInfo(`Index deleted: ${indexName}`);
  }

  /**
   * List all indexes
   */
  async listIndexes(): Promise<string[]> {
    this.ensureInitialized();

    const response = await this.request<Array<{ name: string }>>("GET", "");
    return response.map((index) => index.name);
  }

  /**
   * Check if an index exists
   */
  async indexExists(indexName: string): Promise<boolean> {
    try {
      const indexes = await this.listIndexes();
      return indexes.includes(indexName);
    } catch {
      return false;
    }
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

    const batchSize = options?.batchSize || 1000;
    const namespace = options?.namespace;
    let totalUpserted = 0;

    // Convert records to Cloudflare Vectorize format
    const vectors: VectorizeVector[] = records.map((record) => ({
      id: record.id,
      values: record.vector,
      metadata: this.convertMetadata({
        ...record.metadata,
        _content: record.content,
      }),
      namespace,
    }));

    // Batch upsert
    for (let i = 0; i < vectors.length; i += batchSize) {
      const batch = vectors.slice(i, i + batchSize);
      const result = await this.request<VectorizeUpsertResult>(
        "POST",
        `/${indexName}/upsert`,
        { vectors: batch },
      );
      totalUpserted += result.count;

      this.logDebug(`Upserted batch: ${totalUpserted}/${vectors.length}`);
    }

    return { upsertedCount: totalUpserted };
  }

  /**
   * Convert metadata to Cloudflare-compatible format
   */
  private convertMetadata(
    metadata?: UnknownRecord,
  ): Record<string, VectorizeMetadataValue> | undefined {
    if (!metadata) {return undefined;}

    const result: Record<string, VectorizeMetadataValue> = {};
    for (const [key, value] of Object.entries(metadata)) {
      if (
        typeof value === "string" ||
        typeof value === "number" ||
        typeof value === "boolean"
      ) {
        result[key] = value;
      } else if (
        Array.isArray(value) &&
        value.every((v) => typeof v === "string")
      ) {
        result[key] = value as string[];
      } else if (value !== null && value !== undefined) {
        // Convert other types to string
        result[key] = JSON.stringify(value);
      }
    }
    return result;
  }

  /**
   * Query vectors
   */
  async query<TMetadata extends UnknownRecord = UnknownRecord>(
    indexName: string,
    options: VectorQueryOptions<TMetadata>,
  ): Promise<VectorQueryResult<TMetadata>[]> {
    this.ensureInitialized();

    const queryOptions: VectorizeQueryOptions = {
      topK: options.topK,
      returnValues: options.includeVectors ?? false,
      returnMetadata: options.includeMetadata !== false ? "all" : "none",
      namespace: options.namespace,
    };

    if (options.filter) {
      queryOptions.filter = translateToCloudflare(
        options.filter,
      ) as VectorizeFilter;
    }

    const response = await this.request<VectorizeQueryResult>(
      "POST",
      `/${indexName}/query`,
      {
        vector: options.vector,
        ...queryOptions,
      },
    );

    return response.matches
      .filter((match) => !options.minScore || match.score >= options.minScore)
      .map((match) => ({
        id: match.id,
        score: match.score,
        vector: match.values,
        metadata: match.metadata as TMetadata,
        content: match.metadata?._content as string | undefined,
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

    if (options.deleteAll) {
      // Cloudflare doesn't have a direct "delete all" - need to delete by namespace or recreate
      this.logInfo(
        "Delete all not directly supported by Cloudflare Vectorize. Use namespace-based deletion.",
      );
      return { deletedCount: undefined, acknowledged: true };
    }

    if (options.ids && options.ids.length > 0) {
      const result = await this.request<VectorizeDeleteResult>(
        "POST",
        `/${indexName}/delete-by-ids`,
        { ids: options.ids },
      );
      return { deletedCount: result.count, acknowledged: true };
    }

    if (options.filter) {
      // Cloudflare doesn't support delete by filter directly
      // Need to query first and delete by IDs
      const queryResult = await this.query(indexName, {
        vector: new Array(this.indexInfo?.dimensions || 1536).fill(0),
        topK: 10000,
        filter: options.filter,
        namespace: options.namespace,
      });

      if (queryResult.length > 0) {
        const ids = queryResult.map((r) => r.id);
        const result = await this.request<VectorizeDeleteResult>(
          "POST",
          `/${indexName}/delete-by-ids`,
          { ids },
        );
        return { deletedCount: result.count, acknowledged: true };
      }
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
      return; // Nothing to update
    }

    // Cloudflare Vectorize uses upsert for updates
    // If only metadata is being updated, we need to fetch the existing vector first
    let vector = update.vector;
    let metadata = update.metadata;

    if (!vector) {
      // Fetch existing vector
      const existing = await this.request<VectorizeVector[]>(
        "POST",
        `/${indexName}/get-by-ids`,
        { ids: [id] },
      );

      if (existing.length === 0) {
        throw new Error(
          `Vector with id '${id}' not found in index '${indexName}'`,
        );
      }
      vector = existing[0].values;

      // Merge existing metadata with update if needed
      if (!metadata) {
        metadata = existing[0].metadata as TMetadata;
      }
    }

    // Upsert the updated vector
    await this.request<VectorizeUpsertResult>("POST", `/${indexName}/upsert`, {
      vectors: [
        {
          id,
          values: vector,
          metadata: this.convertMetadata(metadata as UnknownRecord),
        },
      ],
    });

    this.logDebug(`Updated vector: ${id}`);
  }

  /**
   * Get index statistics
   */
  async getStats(indexName: string): Promise<VectorStoreStats> {
    this.ensureInitialized();

    const info = await this.request<VectorizeIndexInfo>("GET", `/${indexName}`);
    this.indexInfo = info;

    return {
      vectorCount: info.vectorsCount,
      dimension: info.dimensions,
      metrics: info as unknown as UnknownRecord,
    };
  }

  /**
   * Translate filter to Cloudflare Vectorize format
   */
  protected translateFilter<TMetadata extends UnknownRecord>(
    filter: MetadataFilter<TMetadata>,
  ): unknown {
    return translateToCloudflare(filter);
  }

  /**
   * Map similarity metric to Cloudflare Vectorize format
   */
  private mapMetric(metric: SimilarityMetric): string {
    switch (metric) {
      case "cosine":
        return "cosine";
      case "euclidean":
        return "euclidean";
      case "dotProduct":
        return "dot-product";
      default:
        return "cosine";
    }
  }
}
