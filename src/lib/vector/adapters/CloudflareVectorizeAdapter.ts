/**
 * Cloudflare Vectorize Vector Store Adapter
 * Implements vector similarity search using Cloudflare Vectorize API
 *
 * Cloudflare Vectorize is a globally distributed vector database built on
 * Cloudflare's network, designed for low-latency similarity search.
 *
 * @see https://developers.cloudflare.com/vectorize/
 */

import type { UnknownRecord } from "../../types/common.js";
import { logger } from "../../utils/logger.js";
import { BaseVectorStore } from "../BaseVectorStore.js";
import type {
  VectorStoreConfig,
  VectorStoreName,
  VectorRecord,
  VectorQueryResult,
  VectorIndexConfig,
  VectorQueryOptions,
  VectorUpsertOptions,
  VectorDeleteOptions,
  VectorStoreStats,
  MetadataFilter,
  FieldFilter,
  SimilarityMetric,
} from "../types.js";

/**
 * Cloudflare Vectorize specific configuration
 */
export type CloudflareVectorizeConfig = VectorStoreConfig & {
  /** Cloudflare account ID */
  accountId: string;
  /** Cloudflare API token with Vectorize permissions */
  apiToken: string;
  /** Base URL for the API (optional, defaults to api.cloudflare.com) */
  baseUrl?: string;
  /** Request timeout in milliseconds (default: 30000) */
  requestTimeout?: number;
  /** Maximum retries for failed requests (default: 3) */
  maxRetries?: number;
  /** Retry delay in milliseconds (default: 1000) */
  retryDelay?: number;
};

/**
 * Cloudflare Vectorize index configuration from API
 */
interface CloudflareIndexInfo {
  id: string;
  name: string;
  description?: string;
  config: {
    dimensions: number;
    metric: "cosine" | "euclidean" | "dot-product";
  };
  created_on: string;
  modified_on: string;
}

/**
 * Cloudflare Vectorize vector format
 */
interface CloudflareVector {
  id: string;
  values: number[];
  metadata?: Record<string, unknown>;
  namespace?: string;
}

/**
 * Cloudflare Vectorize query match
 */
interface CloudflareQueryMatch {
  id: string;
  score: number;
  values?: number[];
  metadata?: Record<string, unknown>;
}

/**
 * Cloudflare API response wrapper
 */
interface CloudflareApiResponse<T> {
  success: boolean;
  errors: Array<{ code: number; message: string }>;
  messages: string[];
  result: T;
}

/**
 * Cloudflare Vectorize Vector Store Adapter
 *
 * Features:
 * - REST API integration with Cloudflare Vectorize
 * - Support for cosine, euclidean, and dot-product metrics
 * - Namespace support for data isolation
 * - Metadata filtering with Cloudflare filter syntax
 * - Automatic batching (1000 vectors per upsert)
 * - Retry logic with exponential backoff
 *
 * Requirements:
 * - Cloudflare account with Vectorize enabled
 * - API token with Vectorize read/write permissions
 */
export class CloudflareVectorizeAdapter extends BaseVectorStore<CloudflareVectorizeConfig> {
  private readonly baseUrl: string;
  private readonly accountId: string;
  private readonly apiToken: string;
  private readonly requestTimeout: number;
  private readonly maxRetries: number;
  private readonly retryDelay: number;

  /** Maximum vectors per upsert batch (Cloudflare limit) */
  private static readonly MAX_UPSERT_BATCH_SIZE = 1000;

  constructor(config: CloudflareVectorizeConfig) {
    super(config, "cloudflare" as VectorStoreName);

    this.accountId = config.accountId;
    this.apiToken = config.apiToken;
    this.baseUrl =
      config.baseUrl || "https://api.cloudflare.com/client/v4/accounts";
    this.requestTimeout = config.requestTimeout || 30000;
    this.maxRetries = config.maxRetries || 3;
    this.retryDelay = config.retryDelay || 1000;
  }

  /**
   * Initialize connection to Cloudflare Vectorize
   * Validates credentials by listing indexes
   */
  async connect(): Promise<void> {
    if (this.initialized) {
      logger.debug("Cloudflare Vectorize already connected");
      return;
    }

    try {
      // Validate connection by listing indexes
      await this.listIndexes();
      this.initialized = true;
      logger.debug("Cloudflare Vectorize connected successfully", {
        accountId: this.accountId.substring(0, 8) + "...",
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to connect to Cloudflare Vectorize: ${message}`);
    }
  }

  /**
   * Disconnect from Cloudflare Vectorize
   * Note: REST API doesn't require explicit disconnection
   */
  async disconnect(): Promise<void> {
    this.initialized = false;
    logger.debug("Cloudflare Vectorize disconnected");
  }

  /**
   * Create a new Vectorize index
   */
  async createIndex(config: VectorIndexConfig): Promise<void> {
    this.ensureInitialized();

    const { name, dimension, metric = "cosine" } = config;

    try {
      const cfMetric = this.toCloudflareMetric(metric);

      const body = {
        name,
        config: {
          dimensions: dimension,
          metric: cfMetric,
        },
        description: (config.config?.description as string) || undefined,
      };

      await this.request<CloudflareIndexInfo>(
        `/vectorize/v2/indexes`,
        "POST",
        body,
      );

      logger.debug(`Created Cloudflare Vectorize index: ${name}`, {
        dimension,
        metric: cfMetric,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(
        `Failed to create Cloudflare Vectorize index ${name}: ${message}`,
      );
    }
  }

  /**
   * Delete a Vectorize index
   */
  async deleteIndex(indexName: string): Promise<void> {
    this.ensureInitialized();

    try {
      await this.request(`/vectorize/v2/indexes/${indexName}`, "DELETE");
      logger.debug(`Deleted Cloudflare Vectorize index: ${indexName}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(
        `Failed to delete Cloudflare Vectorize index ${indexName}: ${message}`,
      );
    }
  }

  /**
   * List all Vectorize indexes
   */
  async listIndexes(): Promise<string[]> {
    // Note: For listIndexes we don't require initialization since connect() uses it
    try {
      const response = await this.request<CloudflareIndexInfo[]>(
        `/vectorize/v2/indexes`,
        "GET",
      );

      return (response || []).map((index) => index.name);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(
        `Failed to list Cloudflare Vectorize indexes: ${message}`,
      );
    }
  }

  /**
   * Check if an index exists
   */
  async indexExists(indexName: string): Promise<boolean> {
    this.ensureInitialized();

    try {
      await this.request<CloudflareIndexInfo>(
        `/vectorize/v2/indexes/${indexName}`,
        "GET",
      );
      return true;
    } catch (error) {
      // 404 means index doesn't exist
      if (error instanceof Error) {
        const statusCode = (error as Error & { statusCode?: number }).statusCode;
        if (
          statusCode === 404 ||
          error.message.toLowerCase().includes("not found")
        ) {
          return false;
        }
      }
      throw error;
    }
  }

  /**
   * Upsert vectors into the index
   * Automatically batches to respect Cloudflare's 1000 vector limit
   */
  async upsert<TMetadata extends UnknownRecord = UnknownRecord>(
    indexName: string,
    records: VectorRecord<TMetadata>[],
    options?: VectorUpsertOptions,
  ): Promise<{ upsertedCount: number }> {
    this.ensureInitialized();

    if (records.length === 0) {
      return { upsertedCount: 0 };
    }

    // Validate dimensions
    this.validateDimensions(records.map((r) => r.vector));

    const namespace = options?.namespace;

    try {
      let totalUpserted = 0;
      const batchSize = CloudflareVectorizeAdapter.MAX_UPSERT_BATCH_SIZE;

      // Process in batches of 1000
      for (let i = 0; i < records.length; i += batchSize) {
        const batch = records.slice(i, i + batchSize);

        const vectors: CloudflareVector[] = batch.map((record) => ({
          id: record.id,
          values: record.vector,
          metadata: record.metadata as Record<string, unknown> | undefined,
          namespace: record.namespace || namespace,
        }));

        const body = { vectors };

        const response = await this.request<{
          mutation_id: string;
          inserted_count: number;
          mutated_count: number;
        }>(`/vectorize/v2/indexes/${indexName}/upsert`, "POST", body);

        totalUpserted += response.mutated_count || response.inserted_count || batch.length;

        logger.debug(
          `Cloudflare Vectorize batch upsert: ${totalUpserted}/${records.length}`,
          { indexName },
        );
      }

      return { upsertedCount: totalUpserted };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(
        `Failed to upsert vectors to Cloudflare Vectorize: ${message}`,
      );
    }
  }

  /**
   * Query vectors by similarity
   */
  async query<TMetadata extends UnknownRecord = UnknownRecord>(
    indexName: string,
    options: VectorQueryOptions<TMetadata>,
  ): Promise<VectorQueryResult<TMetadata>[]> {
    this.ensureInitialized();

    const {
      vector,
      topK,
      filter,
      includeVectors = false,
      includeMetadata = true,
      namespace,
    } = options;

    try {
      const body: Record<string, unknown> = {
        vector,
        topK,
        returnValues: includeVectors,
        returnMetadata: includeMetadata ? "all" : "none",
      };

      // Add namespace filter if specified
      if (namespace) {
        body.namespace = namespace;
      }

      // Add metadata filter if specified
      if (filter) {
        body.filter = this.translateFilter(filter);
      }

      const response = await this.request<{
        matches: CloudflareQueryMatch[];
        count: number;
      }>(`/vectorize/v2/indexes/${indexName}/query`, "POST", body);

      const results: VectorQueryResult<TMetadata>[] = (
        response.matches || []
      ).map((match) => {
        const result: VectorQueryResult<TMetadata> = {
          id: match.id,
          score: match.score,
        };

        if (includeVectors && match.values) {
          result.vector = match.values;
        }

        if (includeMetadata && match.metadata) {
          result.metadata = match.metadata as TMetadata;
        }

        return result;
      });

      // Apply minimum score filter (client-side)
      if (options.minScore !== undefined) {
        return results.filter((r) => r.score >= options.minScore!);
      }

      return results;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(
        `Failed to query Cloudflare Vectorize index ${indexName}: ${message}`,
      );
    }
  }

  /**
   * Delete vectors from the index
   */
  async delete(
    indexName: string,
    options: VectorDeleteOptions,
  ): Promise<{ deletedCount: number }> {
    this.ensureInitialized();

    const { ids, namespace, deleteAll } = options;

    try {
      if (deleteAll) {
        // Cloudflare doesn't have a direct "delete all" API
        // We need to delete the index and recreate it, or use a namespace
        if (namespace) {
          // Delete all vectors in namespace by getting IDs first
          // This is a workaround since Cloudflare doesn't support deleteAll with namespace
          logger.warn(
            "Cloudflare Vectorize deleteAll with namespace not directly supported",
          );
        }
        throw new Error(
          "deleteAll is not supported. Delete and recreate the index instead.",
        );
      }

      if (!ids || ids.length === 0) {
        return { deletedCount: 0 };
      }

      // Cloudflare delete endpoint
      const body: Record<string, unknown> = { ids };
      if (namespace) {
        body.namespace = namespace;
      }

      const response = await this.request<{
        mutation_id: string;
        deleted_count: number;
      }>(`/vectorize/v2/indexes/${indexName}/delete-by-ids`, "POST", body);

      const deletedCount = response.deleted_count || ids.length;

      logger.debug(`Deleted ${deletedCount} vectors from ${indexName}`);
      return { deletedCount };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(
        `Failed to delete vectors from Cloudflare Vectorize: ${message}`,
      );
    }
  }

  /**
   * Get index statistics
   */
  async getStats(indexName: string): Promise<VectorStoreStats> {
    this.ensureInitialized();

    try {
      const indexInfo = await this.request<CloudflareIndexInfo>(
        `/vectorize/v2/indexes/${indexName}`,
        "GET",
      );

      // Cloudflare Vectorize provides limited stats through the index info endpoint
      // For detailed stats, you might need to use the describe endpoint
      return {
        vectorCount: 0, // Cloudflare doesn't expose this directly in basic API
        dimension: indexInfo.config.dimensions,
        metrics: {
          metric: this.fromCloudflareMetric(indexInfo.config.metric),
          createdOn: indexInfo.created_on,
          modifiedOn: indexInfo.modified_on,
        },
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(
        `Failed to get stats for Cloudflare Vectorize index ${indexName}: ${message}`,
      );
    }
  }

  /**
   * Translate abstract filter to Cloudflare Vectorize filter format
   * Cloudflare uses a specific JSON filter format
   */
  protected translateFilter<TMetadata extends UnknownRecord>(
    filter: MetadataFilter<TMetadata>,
  ): Record<string, unknown> {
    const result: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(filter)) {
      if (key === "$and" && Array.isArray(value)) {
        result["$and"] = value.map((f) =>
          this.translateFilter(f as MetadataFilter),
        );
      } else if (key === "$or" && Array.isArray(value)) {
        result["$or"] = value.map((f) =>
          this.translateFilter(f as MetadataFilter),
        );
      } else if (
        key === "$not" &&
        typeof value === "object" &&
        value !== null
      ) {
        // Cloudflare uses $ne for not equal
        const notFilter = this.translateFilter(value as MetadataFilter);
        // Wrap in negation
        for (const [notKey, notValue] of Object.entries(notFilter)) {
          if (typeof notValue === "object" && notValue !== null) {
            result[notKey] = { $ne: notValue };
          } else {
            result[notKey] = { $ne: notValue };
          }
        }
      } else if (this.isFieldFilter(value)) {
        result[key] = this.translateFieldFilter(value as FieldFilter);
      } else {
        // Simple equality
        result[key] = { $eq: value };
      }
    }

    return result;
  }

  // ===================
  // PRIVATE HELPER METHODS
  // ===================

  /**
   * Make HTTP request to Cloudflare API
   */
  private async request<T>(
    path: string,
    method: "GET" | "POST" | "DELETE" | "PUT" | "PATCH",
    body?: unknown,
  ): Promise<T> {
    const url = `${this.baseUrl}/${this.accountId}${path}`;

    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(
          () => controller.abort(),
          this.requestTimeout,
        );

        const fetchOptions: RequestInit = {
          method,
          headers: {
            Authorization: `Bearer ${this.apiToken}`,
            "Content-Type": "application/json",
          },
          signal: controller.signal,
        };

        if (body && (method === "POST" || method === "PUT" || method === "PATCH")) {
          fetchOptions.body = JSON.stringify(body);
        }

        const response = await fetch(url, fetchOptions);
        clearTimeout(timeoutId);

        const data = (await response.json()) as CloudflareApiResponse<T>;

        if (!response.ok || !data.success) {
          const errorMessage =
            data.errors?.[0]?.message || `HTTP ${response.status}`;
          // Create error with status code info for retry logic
          const error = new Error(errorMessage);
          (error as Error & { statusCode?: number }).statusCode = response.status;
          throw error;
        }

        return data.result;
      } catch (error) {
        lastError =
          error instanceof Error ? error : new Error(String(error));

        // Don't retry on 4xx errors (except 429 rate limit)
        const statusCode = (lastError as Error & { statusCode?: number }).statusCode;
        if (statusCode && statusCode >= 400 && statusCode < 500 && statusCode !== 429) {
          throw lastError;
        }

        // Retry with exponential backoff
        if (attempt < this.maxRetries) {
          const delay = this.retryDelay * Math.pow(2, attempt);
          logger.debug(
            `Cloudflare Vectorize request failed, retrying in ${delay}ms`,
            { attempt: attempt + 1, error: lastError.message },
          );
          await this.sleep(delay);
        }
      }
    }

    throw lastError || new Error("Request failed after retries");
  }

  /**
   * Sleep for specified milliseconds
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Convert NeuroLink metric to Cloudflare metric
   */
  private toCloudflareMetric(
    metric: SimilarityMetric,
  ): "cosine" | "euclidean" | "dot-product" {
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

  /**
   * Convert Cloudflare metric to NeuroLink metric
   */
  private fromCloudflareMetric(
    metric: "cosine" | "euclidean" | "dot-product",
  ): SimilarityMetric {
    switch (metric) {
      case "cosine":
        return "cosine";
      case "euclidean":
        return "euclidean";
      case "dot-product":
        return "dotProduct";
      default:
        return "cosine";
    }
  }

  /**
   * Check if value is a field filter
   */
  private isFieldFilter(value: unknown): boolean {
    if (typeof value !== "object" || value === null) return false;
    const keys = Object.keys(value);
    return keys.some((k) => k.startsWith("$"));
  }

  /**
   * Translate field filter to Cloudflare format
   */
  private translateFieldFilter(filter: FieldFilter): Record<string, unknown> {
    const result: Record<string, unknown> = {};

    for (const [op, val] of Object.entries(filter)) {
      switch (op) {
        case "$eq":
          result["$eq"] = val;
          break;
        case "$ne":
          result["$ne"] = val;
          break;
        case "$gt":
          result["$gt"] = val;
          break;
        case "$gte":
          result["$gte"] = val;
          break;
        case "$lt":
          result["$lt"] = val;
          break;
        case "$lte":
          result["$lte"] = val;
          break;
        case "$in":
          result["$in"] = val;
          break;
        case "$nin":
          result["$nin"] = val;
          break;
        case "$exists":
          // Cloudflare may not support $exists directly
          // Use workaround with $ne null
          if (val) {
            result["$ne"] = null;
          } else {
            result["$eq"] = null;
          }
          break;
        case "$contains":
          // Cloudflare doesn't support string contains natively
          // This will need to be handled differently
          logger.warn("$contains filter not natively supported by Cloudflare Vectorize");
          result["$eq"] = val; // Fallback to equality
          break;
        case "$startsWith":
          // Not natively supported
          logger.warn("$startsWith filter not natively supported by Cloudflare Vectorize");
          result["$eq"] = val; // Fallback
          break;
        case "$endsWith":
          // Not natively supported
          logger.warn("$endsWith filter not natively supported by Cloudflare Vectorize");
          result["$eq"] = val; // Fallback
          break;
        default:
          // Unknown operator, pass through
          result[op] = val;
      }
    }

    return result;
  }
}
