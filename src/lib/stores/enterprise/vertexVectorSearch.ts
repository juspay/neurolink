/**
 * Google Vertex AI Vector Search Implementation
 * Enterprise-grade managed vector database with low-latency serving
 * @see https://cloud.google.com/vertex-ai/docs/vector-search/overview
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
import { translateToVertexVectorSearch } from "../filterTranslator.js";

/**
 * Vertex Vector Search datapoint format (for upsert)
 */
type VertexDatapointInput = {
  datapoint_id: string;
  feature_vector: number[];
  restricts?: Array<{
    namespace: string;
    allow_list?: string[];
    deny_list?: string[];
  }>;
  numeric_restricts?: Array<{
    namespace: string;
    value_int?: number;
    value_float?: number;
    value_double?: number;
  }>;
  crowding_tag?: {
    crowding_attribute: string;
  };
};

/**
 * Vertex datapoint type (from response)
 */
type VertexDatapointOutput = {
  datapoint_id: string;
  feature_vector?: number[];
  restricts?: Array<{
    namespace: string;
    allow_list?: string[];
  }>;
  numeric_restricts?: Array<{
    namespace: string;
    value_int?: number;
    value_float?: number;
  }>;
};

/**
 * Vertex Vector Search query response
 */
type VertexQueryResponse = {
  nearestNeighbors?: Array<{
    id: string;
    neighbors: Array<{
      datapoint: VertexDatapointOutput;
      distance: number;
    }>;
  }>;
};

/**
 * Vertex Vector Search index statistics
 */
type VertexIndexStats = {
  vectorsCount?: string;
  shardsCount?: number;
};

/**
 * Google Vertex Vector Search-specific configuration
 */
export type VertexVectorSearchConfig = VectorStoreConfig & {
  /** GCP project ID (required) */
  projectId: string;
  /** GCP region (required, e.g., us-central1) */
  region: string;
  /** Index endpoint ID (required for queries) */
  indexEndpointId?: string;
  /** Deployed index ID (required for queries) */
  deployedIndexId?: string;
  /** Authentication - service account key JSON or path */
  credentials?: string | Record<string, unknown>;
  /** Custom API endpoint (optional) */
  apiEndpoint?: string;
};

/**
 * Google Vertex Vector Search Store implementation
 */
export class VertexVectorSearchStore extends BaseVectorStore<VertexVectorSearchConfig> {
  private projectId: string;
  private region: string;
  private accessToken: string | null = null;
  private tokenExpiry: number = 0;
  private indexEndpointId?: string;
  private deployedIndexId?: string;
  private apiEndpoint: string;

  constructor(config: VertexVectorSearchConfig) {
    super(config, "vertex-vector" as VectorStoreName);
    this.projectId = config.projectId;
    this.region = config.region;
    this.indexEndpointId = config.indexEndpointId;
    this.deployedIndexId = config.deployedIndexId;
    this.apiEndpoint =
      config.apiEndpoint || `${config.region}-aiplatform.googleapis.com`;
  }

  /**
   * Get OAuth2 access token using Google Auth Library
   */
  private async getAccessToken(): Promise<string> {
    // Check if we have a valid cached token
    if (this.accessToken && Date.now() < this.tokenExpiry - 60000) {
      return this.accessToken;
    }

    try {
      // Use Google Auth Library for authentication
      const { GoogleAuth } = await import("google-auth-library");

      const auth = new GoogleAuth({
        scopes: ["https://www.googleapis.com/auth/cloud-platform"],
        credentials:
          typeof this.config.credentials === "string"
            ? JSON.parse(this.config.credentials)
            : this.config.credentials,
      });

      const client = await auth.getClient();
      const tokenResponse = await client.getAccessToken();

      if (!tokenResponse.token) {
        throw new Error("Failed to obtain access token");
      }

      this.accessToken = tokenResponse.token;
      // Token typically expires in 3600 seconds
      this.tokenExpiry = Date.now() + 3500 * 1000;

      return this.accessToken;
    } catch (error) {
      this.logError("Failed to get access token", error);
      throw new Error(
        `Authentication failed: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Make HTTP request to Vertex AI REST API
   */
  private async request<T>(
    method: string,
    path: string,
    body?: unknown,
  ): Promise<T> {
    const token = await this.getAccessToken();
    const url = `https://${this.apiEndpoint}/v1${path}`;

    const headers: Record<string, string> = {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    };

    const response = await fetch(url, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Vertex AI API error (${response.status}): ${errorText}`);
    }

    // Handle 204 No Content responses
    if (response.status === 204) {
      return {} as T;
    }

    return response.json() as Promise<T>;
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
        if (this.isRetryableError(error)) {
          const delay = baseDelay * 2 ** attempt;
          this.logDebug(
            `Request failed, retrying in ${delay}ms (attempt ${attempt + 1}/${maxRetries})`,
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
      message.includes("quota exceeded") ||
      message.includes("resource exhausted")
    );
  }

  /**
   * Get the base path for index operations
   */
  private getIndexBasePath(): string {
    return `/projects/${this.projectId}/locations/${this.region}/indexes`;
  }

  /**
   * Get the base path for index endpoint operations
   */
  private getIndexEndpointBasePath(): string {
    return `/projects/${this.projectId}/locations/${this.region}/indexEndpoints`;
  }

  /**
   * Initialize connection to Vertex Vector Search
   */
  async connect(): Promise<void> {
    if (this.initialized) {
      return;
    }

    try {
      // Test connection by getting access token and listing indexes
      await this.getAccessToken();
      await this.listIndexes();
      this.initialized = true;
      this.logInfo("Connected successfully");
    } catch (error) {
      this.logError("Failed to connect", error);
      throw new Error(
        `Failed to connect to Vertex Vector Search: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Disconnect from Vertex Vector Search
   */
  async disconnect(): Promise<void> {
    this.accessToken = null;
    this.tokenExpiry = 0;
    this.initialized = false;
    this.logInfo("Disconnected");
  }

  /**
   * Create a new vector index
   * Note: Vertex AI index creation is a long-running operation
   */
  async createIndex(config: VectorIndexConfig): Promise<void> {
    this.ensureInitialized();

    const metric = this.mapMetric(config.metric || "cosine");
    const indexConfig = config.config || {};

    const indexDefinition = {
      displayName: config.name,
      description: `NeuroLink vector index: ${config.name}`,
      metadata: {
        config: {
          dimensions: config.dimension,
          approximateNeighborsCount:
            indexConfig.approximateNeighborsCount || 100,
          distanceMeasureType: metric,
          shardSize: indexConfig.shardSize || "SHARD_SIZE_SMALL",
          algorithmConfig: {
            treeAhConfig: {
              leafNodeEmbeddingCount:
                indexConfig.leafNodeEmbeddingCount || 1000,
              leafNodesToSearchPercent:
                indexConfig.leafNodesToSearchPercent || 10,
            },
          },
        },
        contentsDeltaUri: indexConfig.contentsDeltaUri,
        isCompleteOverwrite: false,
      },
    };

    const response = await this.withRetry(() =>
      this.request<{ name: string }>(
        "POST",
        this.getIndexBasePath(),
        indexDefinition,
      ),
    );

    this.logInfo(`Index creation initiated: ${config.name}`, {
      dimension: config.dimension,
      metric,
      operationName: response.name,
    });

    // Note: Index creation is a long-running operation in Vertex AI
    // The caller should poll for completion if needed
  }

  /**
   * Delete an index
   */
  async deleteIndex(indexName: string): Promise<void> {
    this.ensureInitialized();

    // First, find the index by display name
    const indexes = await this.listIndexesWithDetails();
    const index = indexes.find(
      (i: { displayName: string }) => i.displayName === indexName,
    );

    if (!index) {
      throw new Error(`Index not found: ${indexName}`);
    }

    await this.withRetry(() =>
      this.request("DELETE", `/${(index as { name: string }).name}`),
    );
    this.logInfo(`Index deleted: ${indexName}`);
  }

  /**
   * List all indexes with full details
   */
  private async listIndexesWithDetails(): Promise<
    Array<{ name: string; displayName: string }>
  > {
    const response = await this.withRetry(() =>
      this.request<{ indexes?: Array<{ name: string; displayName: string }> }>(
        "GET",
        this.getIndexBasePath(),
      ),
    );
    return response.indexes || [];
  }

  /**
   * List all indexes (display names)
   */
  async listIndexes(): Promise<string[]> {
    this.ensureInitialized();

    const indexes = await this.listIndexesWithDetails();
    return indexes.map((i) => i.displayName);
  }

  /**
   * Check if an index exists
   */
  async indexExists(indexName: string): Promise<boolean> {
    const indexes = await this.listIndexes();
    return indexes.includes(indexName);
  }

  /**
   * Upsert vectors using streaming update
   * Note: Vertex AI uses datapoints for vector storage
   */
  async upsert<TMetadata extends UnknownRecord = UnknownRecord>(
    indexName: string,
    records: VectorRecord<TMetadata>[],
    options?: VectorUpsertOptions,
  ): Promise<{ upsertedCount: number }> {
    this.ensureInitialized();

    // Find the index by display name
    const indexes = await this.listIndexesWithDetails();
    const index = indexes.find((i) => i.displayName === indexName);

    if (!index) {
      throw new Error(`Index not found: ${indexName}`);
    }

    const batchSize = options?.batchSize || 100;
    let totalUpserted = 0;

    // Convert records to Vertex datapoint format
    const datapoints: VertexDatapointInput[] = records.map((record) =>
      this.recordToDatapoint(record),
    );

    // Batch upsert
    for (let i = 0; i < datapoints.length; i += batchSize) {
      const batch = datapoints.slice(i, i + batchSize);

      await this.withRetry(() =>
        this.request("POST", `/${index.name}:upsertDatapoints`, {
          datapoints: batch,
        }),
      );

      totalUpserted += batch.length;
      this.logDebug(`Upserted batch: ${totalUpserted}/${datapoints.length}`);
    }

    return { upsertedCount: totalUpserted };
  }

  /**
   * Convert a VectorRecord to Vertex AI datapoint format
   */
  private recordToDatapoint<TMetadata extends UnknownRecord>(
    record: VectorRecord<TMetadata>,
  ): VertexDatapointInput {
    const datapoint: VertexDatapointInput = {
      datapoint_id: record.id,
      feature_vector: record.vector,
    };

    // Convert metadata to restricts format
    if (record.metadata) {
      const restricts: VertexDatapointInput["restricts"] = [];
      const numericRestricts: VertexDatapointInput["numeric_restricts"] = [];

      for (const [key, value] of Object.entries(record.metadata)) {
        if (typeof value === "string") {
          restricts.push({
            namespace: key,
            allow_list: [value],
          });
        } else if (typeof value === "number") {
          if (Number.isInteger(value)) {
            numericRestricts.push({
              namespace: key,
              value_int: value,
            });
          } else {
            numericRestricts.push({
              namespace: key,
              value_float: value,
            });
          }
        } else if (
          Array.isArray(value) &&
          value.every((v) => typeof v === "string")
        ) {
          restricts.push({
            namespace: key,
            allow_list: value as string[],
          });
        }
      }

      if (restricts.length > 0) {
        datapoint.restricts = restricts;
      }
      if (numericRestricts.length > 0) {
        datapoint.numeric_restricts = numericRestricts;
      }
    }

    return datapoint;
  }

  /**
   * Query vectors using find neighbors
   */
  async query<TMetadata extends UnknownRecord = UnknownRecord>(
    indexName: string,
    options: VectorQueryOptions<TMetadata>,
  ): Promise<VectorQueryResult<TMetadata>[]> {
    this.ensureInitialized();

    if (!this.indexEndpointId || !this.deployedIndexId) {
      throw new Error(
        "indexEndpointId and deployedIndexId are required for querying. " +
          "Deploy the index to an endpoint first.",
      );
    }

    const queryRequest: Record<string, unknown> = {
      deployed_index_id: this.deployedIndexId,
      queries: [
        {
          datapoint: {
            datapoint_id: "query",
            feature_vector: options.vector,
          },
          neighbor_count: options.topK,
        },
      ],
      return_full_datapoint: options.includeVectors || options.includeMetadata,
    };

    // Add filter restrictions if provided
    if (options.filter) {
      const restrictions = translateToVertexVectorSearch(options.filter);
      if (restrictions) {
        (queryRequest.queries as Array<Record<string, unknown>>)[0].restricts =
          restrictions;
      }
    }

    const response = await this.withRetry(() =>
      this.request<VertexQueryResponse>(
        "POST",
        `${this.getIndexEndpointBasePath()}/${this.indexEndpointId}:findNeighbors`,
        queryRequest,
      ),
    );

    const neighbors = response.nearestNeighbors?.[0]?.neighbors || [];

    return neighbors
      .filter(
        (neighbor) =>
          !options.minScore ||
          this.distanceToScore(neighbor.distance) >= options.minScore,
      )
      .map((neighbor) => ({
        id: neighbor.datapoint.datapoint_id,
        score: this.distanceToScore(neighbor.distance),
        vector: options.includeVectors
          ? neighbor.datapoint.feature_vector
          : undefined,
        metadata: this.datapointToMetadata<TMetadata>(neighbor.datapoint),
      }));
  }

  /**
   * Convert distance to similarity score (0-1)
   * Vertex AI returns squared L2 distance
   */
  private distanceToScore(distance: number): number {
    // Convert squared L2 distance to similarity score
    // Score = 1 / (1 + distance)
    return 1 / (1 + distance);
  }

  /**
   * Convert Vertex datapoint restricts to metadata
   */
  private datapointToMetadata<TMetadata extends UnknownRecord>(
    datapoint: VertexDatapointOutput,
  ): TMetadata | undefined {
    const metadata: Record<string, unknown> = {};

    if (datapoint.restricts) {
      for (const restrict of datapoint.restricts) {
        if (restrict.allow_list && restrict.allow_list.length === 1) {
          metadata[restrict.namespace] = restrict.allow_list[0];
        } else if (restrict.allow_list) {
          metadata[restrict.namespace] = restrict.allow_list;
        }
      }
    }

    if (datapoint.numeric_restricts) {
      for (const restrict of datapoint.numeric_restricts) {
        if (restrict.value_int !== undefined) {
          metadata[restrict.namespace] = restrict.value_int;
        } else if (restrict.value_float !== undefined) {
          metadata[restrict.namespace] = restrict.value_float;
        }
      }
    }

    return Object.keys(metadata).length > 0
      ? (metadata as TMetadata)
      : undefined;
  }

  /**
   * Delete vectors by IDs
   */
  async delete(
    indexName: string,
    options: VectorDeleteOptions,
  ): Promise<VectorDeleteResult> {
    this.ensureInitialized();

    // Find the index by display name
    const indexes = await this.listIndexesWithDetails();
    const index = indexes.find((i) => i.displayName === indexName);

    if (!index) {
      throw new Error(`Index not found: ${indexName}`);
    }

    if (options.deleteAll) {
      this.logInfo(
        "deleteAll is not directly supported by Vertex Vector Search. " +
          "Consider recreating the index.",
      );
      return { deletedCount: undefined, acknowledged: true };
    }

    if (options.ids && options.ids.length > 0) {
      await this.withRetry(() =>
        this.request("POST", `/${index.name}:removeDatapoints`, {
          datapoint_ids: options.ids,
        }),
      );
      return { deletedCount: options.ids.length, acknowledged: true };
    }

    if (options.filter) {
      // Vertex AI doesn't support filter-based deletion
      // Would need to query first, then delete by IDs
      this.logInfo(
        "Filter-based deletion requires querying first. " +
          "Consider using IDs directly.",
      );
      return { deletedCount: undefined, acknowledged: false };
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

    // Find the index by display name
    const indexes = await this.listIndexesWithDetails();
    const index = indexes.find((i) => i.displayName === indexName);

    if (!index) {
      throw new Error(`Index not found: ${indexName}`);
    }

    // Vertex AI uses upsert for updates
    const record: VectorRecord<TMetadata> = {
      id,
      vector: update.vector || [],
      metadata: update.metadata,
    };

    // If no vector provided, we can't update (Vertex requires the full datapoint)
    if (!update.vector) {
      throw new Error(
        "Vertex Vector Search requires the vector to be provided for updates",
      );
    }

    const datapoint = this.recordToDatapoint(record);

    await this.withRetry(() =>
      this.request("POST", `/${index.name}:upsertDatapoints`, {
        datapoints: [datapoint],
      }),
    );

    this.logDebug(`Updated vector: ${id}`);
  }

  /**
   * Get index statistics
   */
  async getStats(indexName: string): Promise<VectorStoreStats> {
    this.ensureInitialized();

    // Find the index by display name
    const indexes = await this.listIndexesWithDetails();
    const index = indexes.find((i) => i.displayName === indexName);

    if (!index) {
      throw new Error(`Index not found: ${indexName}`);
    }

    const indexDetails = await this.withRetry(() =>
      this.request<{
        metadata?: {
          config?: {
            dimensions?: number;
          };
        };
        indexStats?: VertexIndexStats;
      }>("GET", `/${index.name}`),
    );

    return {
      vectorCount: indexDetails.indexStats?.vectorsCount
        ? parseInt(indexDetails.indexStats.vectorsCount, 10)
        : 0,
      dimension: indexDetails.metadata?.config?.dimensions,
      metrics: {
        shardsCount: indexDetails.indexStats?.shardsCount,
      },
    };
  }

  /**
   * Translate filter to Vertex Vector Search format
   */
  protected translateFilter<TMetadata extends UnknownRecord>(
    filter: MetadataFilter<TMetadata>,
  ): unknown {
    return translateToVertexVectorSearch(filter);
  }

  /**
   * Map similarity metric to Vertex format
   */
  private mapMetric(metric: SimilarityMetric): string {
    switch (metric) {
      case "cosine":
        return "COSINE_DISTANCE";
      case "euclidean":
        return "SQUARED_L2_DISTANCE";
      case "dotProduct":
        return "DOT_PRODUCT_DISTANCE";
      default:
        return "COSINE_DISTANCE";
    }
  }
}
