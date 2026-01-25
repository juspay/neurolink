/**
 * Pinecone Vector Store Implementation
 * Market leader in managed vector databases with excellent DX
 * @see https://docs.pinecone.io/
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
import { translateToPinecone } from "../filterTranslator.js";

// We'll use dynamic import for the Pinecone client to make it optional
type PineconeClient = {
  listIndexes: () => Promise<{ indexes?: Array<{ name: string }> }>;
  createIndex: (params: {
    name: string;
    dimension: number;
    metric: string;
    spec: Record<string, unknown>;
  }) => Promise<void>;
  deleteIndex: (name: string) => Promise<void>;
  Index: (name: string) => PineconeIndex;
};

type PineconeIndex = {
  namespace: (ns: string) => PineconeNamespace;
  upsert: (vectors: Array<PineconeVector>) => Promise<void>;
  query: (params: PineconeQueryParams) => Promise<PineconeQueryResponse>;
  deleteMany: (
    params: string[] | { filter: Record<string, unknown> },
  ) => Promise<void>;
  deleteAll: () => Promise<void>;
  describeIndexStats: () => Promise<PineconeIndexStats>;
};

type PineconeNamespace = {
  upsert: (vectors: Array<PineconeVector>) => Promise<void>;
  query: (params: PineconeQueryParams) => Promise<PineconeQueryResponse>;
  deleteMany: (
    params: string[] | { filter: Record<string, unknown> },
  ) => Promise<void>;
  deleteAll: () => Promise<void>;
};

type PineconeVector = {
  id: string;
  values: number[];
  metadata?: Record<string, unknown>;
};

type PineconeQueryParams = {
  vector: number[];
  topK: number;
  includeMetadata?: boolean;
  includeValues?: boolean;
  filter?: Record<string, unknown>;
};

type PineconeQueryResponse = {
  matches?: Array<{
    id: string;
    score?: number;
    values?: number[];
    metadata?: Record<string, unknown>;
  }>;
};

type PineconeIndexStats = {
  totalRecordCount?: number;
  dimension?: number;
  namespaces?: Record<string, { recordCount: number }>;
};

/**
 * Pinecone-specific configuration
 */
export type PineconeConfig = VectorStoreConfig & {
  /** Pinecone API key (required) */
  apiKey: string;
  /** Optional controller host URL for dedicated deployments */
  controllerHostUrl?: string;
  /** Serverless configuration for index creation */
  serverless?: {
    cloud: "aws" | "gcp" | "azure";
    region: string;
  };
};

/**
 * Pinecone Vector Store implementation
 */
export class PineconeStore extends BaseVectorStore<PineconeConfig> {
  private client: PineconeClient | null = null;
  private indexes: Map<string, PineconeIndex> = new Map();

  constructor(config: PineconeConfig) {
    super(config, "pinecone" as VectorStoreName);
  }

  /**
   * Execute an operation with exponential backoff retry for rate limits
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
        if (this.isRateLimitError(error)) {
          const delay = baseDelay * 2 ** attempt;
          this.logDebug(
            `Rate limited, retrying in ${delay}ms (attempt ${attempt + 1}/${maxRetries})`,
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
   * Check if an error is a rate limit error
   */
  private isRateLimitError(error: unknown): boolean {
    const message = (error as Error)?.message?.toLowerCase() || "";
    const statusCode = (error as { status?: number })?.status;
    return (
      message.includes("rate limit") ||
      message.includes("429") ||
      message.includes("too many requests") ||
      statusCode === 429
    );
  }

  /**
   * Initialize connection to Pinecone
   */
  async connect(): Promise<void> {
    if (this.initialized) {
      return;
    }

    try {
      // Dynamically import Pinecone client
      const { Pinecone } = await import("@pinecone-database/pinecone");

      this.client = new Pinecone({
        apiKey: this.config.apiKey,
      }) as unknown as PineconeClient;

      this.initialized = true;
      this.logInfo("Connected successfully");
    } catch (error) {
      this.logError("Failed to connect", error);
      throw new Error(
        `Failed to connect to Pinecone: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Disconnect from Pinecone
   */
  async disconnect(): Promise<void> {
    this.indexes.clear();
    this.client = null;
    this.initialized = false;
    this.logInfo("Disconnected");
  }

  /**
   * Create a new index
   */
  async createIndex(config: VectorIndexConfig): Promise<void> {
    this.ensureInitialized();

    const metric = this.mapMetric(config.metric || "cosine");
    const serverlessConfig = this.config.serverless || {
      cloud: "aws" as const,
      region: "us-east-1",
    };

    await this.client!.createIndex({
      name: config.name,
      dimension: config.dimension,
      metric,
      spec: {
        serverless: serverlessConfig,
        ...(config.config || {}),
      },
    });

    this.logInfo(`Index created: ${config.name}`, {
      dimension: config.dimension,
      metric,
    });

    // Wait for index to be ready
    await this.waitForIndexReady(config.name);
  }

  /**
   * Delete an index
   */
  async deleteIndex(indexName: string): Promise<void> {
    this.ensureInitialized();

    await this.client!.deleteIndex(indexName);
    this.indexes.delete(indexName);
    this.logInfo(`Index deleted: ${indexName}`);
  }

  /**
   * List all indexes
   */
  async listIndexes(): Promise<string[]> {
    this.ensureInitialized();

    const response = await this.client!.listIndexes();
    return response.indexes?.map((i) => i.name) || [];
  }

  /**
   * Check if an index exists
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

    const index = this.getIndex(indexName);
    const namespace = options?.namespace;
    const batchSize = options?.batchSize || 100;

    const vectors: PineconeVector[] = records.map((record) => ({
      id: record.id,
      values: record.vector,
      metadata: record.metadata as Record<string, unknown>,
    }));

    const target = namespace ? index.namespace(namespace) : index;

    // Batch upsert in chunks of batchSize (Pinecone limit is 100)
    let totalUpserted = 0;
    for (let i = 0; i < vectors.length; i += batchSize) {
      const batch = vectors.slice(i, i + batchSize);
      await this.withRetry(() => target.upsert(batch));
      totalUpserted += batch.length;

      this.logDebug(`Upserted batch: ${totalUpserted}/${vectors.length}`);
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

    const index = this.getIndex(indexName);
    const target = options.namespace
      ? index.namespace(options.namespace)
      : index;

    const queryParams: PineconeQueryParams = {
      vector: options.vector,
      topK: options.topK,
      includeMetadata: options.includeMetadata ?? true,
      includeValues: options.includeVectors ?? false,
    };

    if (options.filter) {
      queryParams.filter = translateToPinecone(options.filter);
    }

    const response = await this.withRetry(() => target.query(queryParams));

    return (response.matches || [])
      .filter(
        (match) => !options.minScore || (match.score ?? 0) >= options.minScore,
      )
      .map((match) => ({
        id: match.id,
        score: match.score ?? 0,
        vector: match.values,
        metadata: match.metadata as TMetadata,
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

    const index = this.getIndex(indexName);
    const target = options.namespace
      ? index.namespace(options.namespace)
      : index;

    if (options.deleteAll) {
      await this.withRetry(() => target.deleteAll());
      return { deletedCount: undefined, acknowledged: true }; // Pinecone doesn't return count
    }

    if (options.ids && options.ids.length > 0) {
      await this.withRetry(() => target.deleteMany(options.ids!));
      return { deletedCount: options.ids.length, acknowledged: true };
    }

    if (options.filter) {
      await this.withRetry(() =>
        target.deleteMany({
          filter: translateToPinecone(options.filter!),
        }),
      );
      return { deletedCount: undefined, acknowledged: true }; // Pinecone doesn't return count for filter deletes
    }

    return { deletedCount: 0, acknowledged: true };
  }

  /**
   * Get index statistics
   */
  async getStats(indexName: string): Promise<VectorStoreStats> {
    this.ensureInitialized();

    const index = this.getIndex(indexName);
    const stats = await index.describeIndexStats();

    return {
      vectorCount: stats.totalRecordCount || 0,
      dimension: stats.dimension,
      namespaceCount: stats.namespaces
        ? Object.keys(stats.namespaces).length
        : 0,
      metrics: stats as UnknownRecord,
    };
  }

  /**
   * Translate filter to Pinecone format
   */
  protected translateFilter<TMetadata extends UnknownRecord>(
    filter: MetadataFilter<TMetadata>,
  ): unknown {
    return translateToPinecone(filter);
  }

  /**
   * Get or create index reference
   */
  private getIndex(indexName: string): PineconeIndex {
    if (!this.indexes.has(indexName)) {
      this.indexes.set(indexName, this.client!.Index(indexName));
    }
    return this.indexes.get(indexName)!;
  }

  /**
   * Map similarity metric to Pinecone format
   */
  private mapMetric(metric: SimilarityMetric): string {
    switch (metric) {
      case "cosine":
        return "cosine";
      case "euclidean":
        return "euclidean";
      case "dotProduct":
        return "dotproduct";
      default:
        return "cosine";
    }
  }

  /**
   * Wait for index to be ready
   */
  private async waitForIndexReady(
    indexName: string,
    maxWaitMs: number = 60000,
  ): Promise<void> {
    const startTime = Date.now();
    const pollInterval = 2000;

    while (Date.now() - startTime < maxWaitMs) {
      try {
        const indexes = await this.listIndexes();
        if (indexes.includes(indexName)) {
          this.logDebug(`Index ${indexName} is ready`);
          return;
        }
      } catch {
        // Index not ready yet
      }
      await new Promise((resolve) => setTimeout(resolve, pollInterval));
    }

    throw new Error(
      `Index ${indexName} did not become ready within ${maxWaitMs}ms`,
    );
  }
}
