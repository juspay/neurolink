/**
 * Upstash Vector Store Implementation
 * Serverless vector database with Redis-like simplicity and excellent DX
 * @see https://upstash.com/docs/vector/overall/getstarted
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
import { translateToUpstash } from "../filterTranslator.js";

// Types for Upstash Vector client (using dynamic import)
type UpstashIndex = {
  upsert: (
    vectors: Array<UpstashVector>,
    options?: { namespace?: string },
  ) => Promise<void>;
  query: <TMetadata = Record<string, unknown>>(
    params: UpstashQueryParams,
    options?: { namespace?: string },
  ) => Promise<Array<UpstashQueryResult<TMetadata>>>;
  delete: (
    ids: string | string[],
    options?: { namespace?: string },
  ) => Promise<void>;
  reset: (options?: { namespace?: string }) => Promise<void>;
  info: () => Promise<UpstashIndexInfo>;
  fetch: <TMetadata = Record<string, unknown>>(
    ids: string | string[],
    options?: { includeVectors?: boolean; namespace?: string },
  ) => Promise<Array<UpstashFetchResult<TMetadata> | null>>;
  update: (params: {
    id: string;
    vector?: number[];
    metadata?: Record<string, unknown>;
  }) => Promise<void>;
};

type UpstashVector = {
  id: string;
  vector: number[];
  metadata?: Record<string, unknown>;
};

type UpstashQueryParams = {
  vector: number[];
  topK: number;
  includeMetadata?: boolean;
  includeVectors?: boolean;
  filter?: string | Record<string, unknown>;
};

type UpstashQueryResult<TMetadata = Record<string, unknown>> = {
  id: string;
  score: number;
  vector?: number[];
  metadata?: TMetadata;
};

type UpstashFetchResult<TMetadata = Record<string, unknown>> = {
  id: string;
  vector?: number[];
  metadata?: TMetadata;
};

type UpstashIndexInfo = {
  vectorCount: number;
  pendingVectorCount: number;
  indexSize: number;
  dimension: number;
  similarityFunction: string;
};

/**
 * Upstash-specific configuration
 */
export type UpstashConfig = VectorStoreConfig & {
  /** Upstash Vector REST URL (required) */
  url: string;
  /** Upstash Vector token (required) */
  token: string;
  /** Retry configuration */
  retryConfig?: {
    retries?: number;
    backoff?: (retryCount: number) => number;
  };
};

/**
 * Upstash Vector Store implementation
 * Note: Upstash Vector is index-less - each database is a single index
 */
export class UpstashStore extends BaseVectorStore<UpstashConfig> {
  private index: UpstashIndex | null = null;
  private indexInfo: UpstashIndexInfo | null = null;

  constructor(config: UpstashConfig) {
    super(config, "upstash" as VectorStoreName);
  }

  /**
   * Execute an operation with exponential backoff retry
   */
  private async withRetry<T>(
    operation: () => Promise<T>,
    maxRetries: number = 3,
    baseDelay: number = 1000,
  ): Promise<T> {
    let lastError: Error | undefined;
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error as Error;
        if (this.isRetryableError(error)) {
          const delay = baseDelay * 2 ** attempt;
          this.logDebug(
            `Retrying operation in ${delay}ms (attempt ${attempt + 1}/${maxRetries})`,
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
    const statusCode = (error as { status?: number })?.status;
    return (
      message.includes("rate limit") ||
      message.includes("429") ||
      message.includes("503") ||
      message.includes("timeout") ||
      statusCode === 429 ||
      statusCode === 503
    );
  }

  /**
   * Initialize connection to Upstash Vector
   */
  async connect(): Promise<void> {
    if (this.initialized) {
      return;
    }

    try {
      // Dynamically import Upstash Vector client
      const { Index } = await import("@upstash/vector");

      this.index = new Index({
        url: this.config.url,
        token: this.config.token,
      }) as unknown as UpstashIndex;

      // Test connection by getting index info
      this.indexInfo = await this.index.info();

      this.initialized = true;
      this.logInfo("Connected successfully", {
        dimension: this.indexInfo.dimension,
        vectorCount: this.indexInfo.vectorCount,
      });
    } catch (error) {
      this.logError("Failed to connect", error);
      throw new Error(
        `Failed to connect to Upstash Vector: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Disconnect from Upstash Vector
   */
  async disconnect(): Promise<void> {
    this.index = null;
    this.indexInfo = null;
    this.initialized = false;
    this.logInfo("Disconnected");
  }

  /**
   * Create a new index
   * Note: Upstash Vector indexes are created via the Upstash console/API
   * This method is a no-op but validates the dimension if provided
   */
  async createIndex(config: VectorIndexConfig): Promise<void> {
    this.ensureInitialized();

    // Upstash Vector doesn't support creating indexes programmatically
    // The index is created when you create the database in Upstash console
    // We just validate the dimension matches if indexInfo is available
    if (this.indexInfo && config.dimension !== this.indexInfo.dimension) {
      throw new Error(
        `Upstash Vector dimension mismatch: index has ${this.indexInfo.dimension} dimensions, ` +
          `but ${config.dimension} was requested. Upstash Vector indexes must be created via the Upstash console.`,
      );
    }

    this.logInfo(
      `Index validation passed for: ${config.name} (Upstash indexes are created via console)`,
      {
        dimension: config.dimension,
        metric: config.metric,
      },
    );
  }

  /**
   * Delete an index
   * Note: Upstash Vector indexes must be deleted via the console
   * This method resets all data in the current namespace
   */
  async deleteIndex(indexName: string): Promise<void> {
    this.ensureInitialized();

    // Upstash doesn't support deleting indexes programmatically
    // We can reset all data though
    await this.withRetry(() => this.index!.reset());
    this.logInfo(
      `Index data reset: ${indexName} (Upstash indexes must be deleted via console)`,
    );
  }

  /**
   * List all indexes
   * Note: Upstash Vector has a single index per database
   */
  async listIndexes(): Promise<string[]> {
    this.ensureInitialized();

    // Upstash Vector has a single implicit index per database
    // Return a placeholder name
    return ["default"];
  }

  /**
   * Check if an index exists
   * Note: For Upstash, the index always exists once connected
   */
  async indexExists(_indexName: string): Promise<boolean> {
    if (!this.initialized) {
      return false;
    }
    return true;
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

    const vectors: UpstashVector[] = records.map((record) => ({
      id: record.id,
      vector: record.vector,
      metadata: {
        ...record.metadata,
        _content: record.content,
      } as Record<string, unknown>,
    }));

    // Batch upsert
    for (let i = 0; i < vectors.length; i += batchSize) {
      const batch = vectors.slice(i, i + batchSize);
      await this.withRetry(() =>
        this.index!.upsert(batch, namespace ? { namespace } : undefined),
      );
      totalUpserted += batch.length;

      this.logDebug(
        `Upserted batch: ${totalUpserted}/${vectors.length} to ${indexName}`,
      );
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

    const queryParams: UpstashQueryParams = {
      vector: options.vector,
      topK: options.topK,
      includeMetadata: options.includeMetadata ?? true,
      includeVectors: options.includeVectors ?? false,
    };

    if (options.filter) {
      queryParams.filter = translateToUpstash(options.filter);
    }

    const response = await this.withRetry(() =>
      this.index!.query<TMetadata>(
        queryParams,
        options.namespace ? { namespace: options.namespace } : undefined,
      ),
    );

    return response
      .filter((result) => !options.minScore || result.score >= options.minScore)
      .map((result) => ({
        id: result.id,
        score: result.score,
        vector: result.vector,
        metadata: result.metadata,
        content: (result.metadata as Record<string, unknown>)?._content as
          | string
          | undefined,
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
      await this.withRetry(() =>
        this.index!.reset(
          options.namespace ? { namespace: options.namespace } : undefined,
        ),
      );
      return { deletedCount: undefined, acknowledged: true };
    }

    if (options.ids && options.ids.length > 0) {
      await this.withRetry(() =>
        this.index!.delete(
          options.ids!,
          options.namespace ? { namespace: options.namespace } : undefined,
        ),
      );
      return { deletedCount: options.ids.length, acknowledged: true };
    }

    if (options.filter) {
      // Upstash doesn't support delete by filter directly
      // We need to query first and then delete by IDs
      const queryResult = await this.query(indexName, {
        vector: new Array(this.indexInfo?.dimension || 1536).fill(0),
        topK: 10000, // Max limit
        filter: options.filter,
        namespace: options.namespace,
      });

      if (queryResult.length > 0) {
        const ids = queryResult.map((r) => r.id);
        await this.withRetry(() =>
          this.index!.delete(
            ids,
            options.namespace ? { namespace: options.namespace } : undefined,
          ),
        );
        return { deletedCount: ids.length, acknowledged: true };
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

    // Upstash supports partial updates via the update method
    await this.withRetry(() =>
      this.index!.update({
        id,
        vector: update.vector,
        metadata: update.metadata as Record<string, unknown>,
      }),
    );

    this.logDebug(`Updated vector: ${id} in ${indexName}`);
  }

  /**
   * Get index statistics
   */
  async getStats(indexName: string): Promise<VectorStoreStats> {
    this.ensureInitialized();

    const info = await this.withRetry(() => this.index!.info());
    this.indexInfo = info; // Cache the info

    return {
      vectorCount: info.vectorCount + info.pendingVectorCount,
      indexSize: info.indexSize,
      dimension: info.dimension,
      metrics: info as unknown as UnknownRecord,
    };
  }

  /**
   * Translate filter to Upstash format
   */
  protected translateFilter<TMetadata extends UnknownRecord>(
    filter: MetadataFilter<TMetadata>,
  ): unknown {
    return translateToUpstash(filter);
  }

  /**
   * Map similarity metric to Upstash format
   * Note: Upstash metric is set at index creation time via console
   */
  private mapMetric(metric: SimilarityMetric): string {
    switch (metric) {
      case "cosine":
        return "COSINE";
      case "euclidean":
        return "EUCLIDEAN";
      case "dotProduct":
        return "DOT_PRODUCT";
      default:
        return "COSINE";
    }
  }
}
