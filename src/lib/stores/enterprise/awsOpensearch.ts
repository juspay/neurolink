/**
 * AWS OpenSearch Vector Store Implementation
 * Enterprise-grade managed search with k-NN plugin for vector search
 * @see https://docs.aws.amazon.com/opensearch-service/latest/developerguide/knn.html
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
import { translateToAwsOpensearch } from "../filterTranslator.js";

/**
 * OpenSearch document with vector field
 */
type OpenSearchDocument = {
  _id?: string;
  _source?: {
    vector?: number[];
    metadata?: Record<string, unknown>;
    content?: string;
    [key: string]: unknown;
  };
};

/**
 * OpenSearch search response
 */
type OpenSearchSearchResponse = {
  hits: {
    total: {
      value: number;
    };
    hits: Array<{
      _id: string;
      _score: number;
      _source: {
        vector?: number[];
        metadata?: Record<string, unknown>;
        content?: string;
        [key: string]: unknown;
      };
    }>;
  };
};

/**
 * OpenSearch index mapping
 */
type OpenSearchIndexMapping = {
  settings: {
    index: {
      knn: boolean;
      "knn.algo_param.ef_search"?: number;
    };
    number_of_shards?: number;
    number_of_replicas?: number;
  };
  mappings: {
    properties: Record<string, unknown>;
  };
};

/**
 * OpenSearch bulk response
 */
type OpenSearchBulkResponse = {
  took: number;
  errors: boolean;
  items: Array<{
    index?: {
      _id: string;
      status: number;
      error?: {
        reason: string;
      };
    };
    delete?: {
      _id: string;
      status: number;
    };
  }>;
};

/**
 * AWS OpenSearch-specific configuration
 */
export type AwsOpensearchConfig = VectorStoreConfig & {
  /** OpenSearch endpoint URL (required) */
  endpoint: string;
  /** AWS region (required for AWS Signature) */
  region?: string;
  /** AWS access key ID (optional if using IAM roles) */
  accessKeyId?: string;
  /** AWS secret access key (optional if using IAM roles) */
  secretAccessKey?: string;
  /** AWS session token for temporary credentials */
  sessionToken?: string;
  /** Use AWS Signature v4 authentication (default: true if region is provided) */
  useAwsAuth?: boolean;
  /** Basic auth username (alternative to AWS auth) */
  username?: string;
  /** Basic auth password (alternative to AWS auth) */
  password?: string;
  /** Vector field name (default: vector) */
  vectorFieldName?: string;
  /** Metadata field name (default: metadata) */
  metadataFieldName?: string;
  /** Content field name (default: content) */
  contentFieldName?: string;
  /** k-NN algorithm (default: hnsw) */
  knnAlgorithm?: "hnsw" | "ivf" | "ivfpq";
  /** HNSW parameters */
  hnswParameters?: {
    m?: number;
    efConstruction?: number;
    efSearch?: number;
  };
};

/**
 * AWS OpenSearch Vector Store implementation
 */
export class AwsOpensearchStore extends BaseVectorStore<AwsOpensearchConfig> {
  private endpoint: string;
  private vectorFieldName: string;
  private metadataFieldName: string;
  private contentFieldName: string;
  private authHeader: string | null = null;

  constructor(config: AwsOpensearchConfig) {
    super(config, "aws-opensearch" as VectorStoreName);
    this.endpoint = config.endpoint.replace(/\/$/, ""); // Remove trailing slash
    this.vectorFieldName = config.vectorFieldName || "vector";
    this.metadataFieldName = config.metadataFieldName || "metadata";
    this.contentFieldName = config.contentFieldName || "content";
  }

  /**
   * Get authorization header based on config
   */
  private async getAuthHeader(): Promise<string | null> {
    if (this.authHeader) {
      return this.authHeader;
    }

    // Basic auth
    if (this.config.username && this.config.password) {
      const credentials = Buffer.from(
        `${this.config.username}:${this.config.password}`,
      ).toString("base64");
      this.authHeader = `Basic ${credentials}`;
      return this.authHeader;
    }

    // AWS Signature v4
    if (this.config.useAwsAuth !== false && this.config.region) {
      // For AWS auth, we'll sign each request individually
      // Return null to indicate per-request signing is needed
      return null;
    }

    return null;
  }

  /**
   * Sign a request with AWS Signature v4
   */
  private async signRequest(
    method: string,
    url: string,
    body?: string,
  ): Promise<Record<string, string>> {
    if (!this.config.region) {
      return {};
    }

    try {
      // Use AWS SDK v3 for signing
      const { SignatureV4 } = await import("@smithy/signature-v4");
      const { Sha256 } = await import("@aws-crypto/sha256-js");
      const { defaultProvider } = await import(
        "@aws-sdk/credential-provider-node"
      );

      const parsedUrl = new URL(url);

      const signer = new SignatureV4({
        credentials:
          this.config.accessKeyId && this.config.secretAccessKey
            ? {
                accessKeyId: this.config.accessKeyId,
                secretAccessKey: this.config.secretAccessKey,
                sessionToken: this.config.sessionToken,
              }
            : await defaultProvider()(),
        region: this.config.region,
        service: "es", // OpenSearch uses 'es' service name
        sha256: Sha256,
      });

      const signedRequest = await signer.sign({
        method,
        protocol: parsedUrl.protocol,
        hostname: parsedUrl.hostname,
        port: parsedUrl.port ? parseInt(parsedUrl.port, 10) : undefined,
        path: parsedUrl.pathname + parsedUrl.search,
        headers: {
          host: parsedUrl.hostname,
          "Content-Type": "application/json",
        },
        body: body || undefined,
      });

      return signedRequest.headers as Record<string, string>;
    } catch (error) {
      this.logDebug("AWS signing not available, using basic auth", { error });
      return {};
    }
  }

  /**
   * Make HTTP request to OpenSearch
   */
  private async request<T>(
    method: string,
    path: string,
    body?: unknown,
  ): Promise<T> {
    const url = `${this.endpoint}${path}`;
    const bodyStr = body ? JSON.stringify(body) : undefined;

    let headers: Record<string, string> = {
      "Content-Type": "application/json",
    };

    // Get auth headers
    const authHeader = await this.getAuthHeader();
    if (authHeader) {
      headers["Authorization"] = authHeader;
    } else if (this.config.region) {
      // AWS Signature v4
      const signedHeaders = await this.signRequest(method, url, bodyStr);
      headers = { ...headers, ...signedHeaders };
    }

    const response = await fetch(url, {
      method,
      headers,
      body: bodyStr,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `OpenSearch API error (${response.status}): ${errorText}`,
      );
    }

    // Handle 204 No Content responses
    if (response.status === 204) {
      return {} as T;
    }

    return response.json() as Promise<T>;
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
      message.includes("502") ||
      message.includes("timeout") ||
      message.includes("econnreset") ||
      message.includes("circuit_breaking_exception")
    );
  }

  /**
   * Initialize connection to OpenSearch
   */
  async connect(): Promise<void> {
    if (this.initialized) {
      return;
    }

    try {
      // Test connection by checking cluster health
      await this.withRetry(() =>
        this.request<{ status: string }>("GET", "/_cluster/health"),
      );
      this.initialized = true;
      this.logInfo("Connected successfully");
    } catch (error) {
      this.logError("Failed to connect", error);
      throw new Error(
        `Failed to connect to OpenSearch: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Disconnect from OpenSearch
   */
  async disconnect(): Promise<void> {
    this.authHeader = null;
    this.initialized = false;
    this.logInfo("Disconnected");
  }

  /**
   * Create a new index with k-NN mappings
   */
  async createIndex(config: VectorIndexConfig): Promise<void> {
    this.ensureInitialized();

    const metric = this.mapMetric(config.metric || "cosine");
    const hnswParams = this.config.hnswParameters || {};
    const algorithm = this.config.knnAlgorithm || "hnsw";

    const indexMapping: OpenSearchIndexMapping = {
      settings: {
        index: {
          knn: true,
          "knn.algo_param.ef_search": hnswParams.efSearch || 512,
        },
        number_of_shards: 1,
        number_of_replicas: 1,
      },
      mappings: {
        properties: {
          [this.vectorFieldName]: {
            type: "knn_vector",
            dimension: config.dimension,
            method: {
              name: algorithm,
              space_type: metric,
              engine: "nmslib",
              parameters: {
                ef_construction: hnswParams.efConstruction || 512,
                m: hnswParams.m || 16,
              },
            },
          },
          [this.metadataFieldName]: {
            type: "object",
            enabled: true,
          },
          [this.contentFieldName]: {
            type: "text",
          },
        },
      },
    };

    await this.withRetry(() =>
      this.request("PUT", `/${config.name}`, indexMapping),
    );

    this.logInfo(`Index created: ${config.name}`, {
      dimension: config.dimension,
      metric,
      algorithm,
    });
  }

  /**
   * Delete an index
   */
  async deleteIndex(indexName: string): Promise<void> {
    this.ensureInitialized();

    await this.withRetry(() => this.request("DELETE", `/${indexName}`));
    this.logInfo(`Index deleted: ${indexName}`);
  }

  /**
   * List all indexes
   */
  async listIndexes(): Promise<string[]> {
    this.ensureInitialized();

    const response = await this.withRetry(() =>
      this.request<Record<string, unknown>>("GET", "/_cat/indices?format=json"),
    );

    if (Array.isArray(response)) {
      return response
        .map((idx: { index?: string }) => idx.index)
        .filter(
          (name): name is string =>
            typeof name === "string" && !name.startsWith("."),
        );
    }

    return [];
  }

  /**
   * Check if an index exists
   */
  async indexExists(indexName: string): Promise<boolean> {
    try {
      await this.request("HEAD", `/${indexName}`);
      return true;
    } catch (error) {
      if ((error as Error).message?.includes("404")) {
        return false;
      }
      throw error;
    }
  }

  /**
   * Upsert vectors using bulk API
   */
  async upsert<TMetadata extends UnknownRecord = UnknownRecord>(
    indexName: string,
    records: VectorRecord<TMetadata>[],
    options?: VectorUpsertOptions,
  ): Promise<{ upsertedCount: number }> {
    this.ensureInitialized();

    const batchSize = options?.batchSize || 500;
    let totalUpserted = 0;

    // Process in batches
    for (let i = 0; i < records.length; i += batchSize) {
      const batch = records.slice(i, i + batchSize);

      // Build bulk request body
      const bulkBody = batch.flatMap((record) => [
        { index: { _index: indexName, _id: record.id } },
        {
          [this.vectorFieldName]: record.vector,
          [this.metadataFieldName]: record.metadata,
          [this.contentFieldName]: record.content,
        },
      ]);

      // OpenSearch bulk API expects newline-delimited JSON
      const bulkBodyStr =
        bulkBody.map((item) => JSON.stringify(item)).join("\n") + "\n";

      const response = await this.withRetry(async () => {
        const url = `${this.endpoint}/_bulk`;
        const authHeader = await this.getAuthHeader();

        let headers: Record<string, string> = {
          "Content-Type": "application/x-ndjson",
        };

        if (authHeader) {
          headers["Authorization"] = authHeader;
        } else if (this.config.region) {
          const signedHeaders = await this.signRequest(
            "POST",
            url,
            bulkBodyStr,
          );
          headers = { ...headers, ...signedHeaders };
        }

        const res = await fetch(url, {
          method: "POST",
          headers,
          body: bulkBodyStr,
        });

        if (!res.ok) {
          const errorText = await res.text();
          throw new Error(
            `OpenSearch bulk API error (${res.status}): ${errorText}`,
          );
        }

        return res.json() as Promise<OpenSearchBulkResponse>;
      });

      if (response.errors) {
        const failedItems = response.items.filter((item) => item.index?.error);
        this.logError(`Bulk upsert had ${failedItems.length} errors`, {
          errors: failedItems.slice(0, 5),
        });
      }

      const successCount = response.items.filter(
        (item) => item.index && !item.index.error,
      ).length;
      totalUpserted += successCount;

      this.logDebug(`Upserted batch: ${totalUpserted}/${records.length}`);
    }

    // Refresh index to make documents searchable immediately
    await this.withRetry(() => this.request("POST", `/${indexName}/_refresh`));

    return { upsertedCount: totalUpserted };
  }

  /**
   * Query vectors using k-NN search
   */
  async query<TMetadata extends UnknownRecord = UnknownRecord>(
    indexName: string,
    options: VectorQueryOptions<TMetadata>,
  ): Promise<VectorQueryResult<TMetadata>[]> {
    this.ensureInitialized();

    const searchBody: Record<string, unknown> = {
      size: options.topK,
      _source: {
        includes: options.includeVectors
          ? [
              this.vectorFieldName,
              this.metadataFieldName,
              this.contentFieldName,
            ]
          : [this.metadataFieldName, this.contentFieldName],
      },
      query: {
        knn: {
          [this.vectorFieldName]: {
            vector: options.vector,
            k: options.topK,
          },
        },
      },
    };

    // Add filter if provided
    if (options.filter) {
      const filterQuery = translateToAwsOpensearch(options.filter);
      searchBody.query = {
        bool: {
          must: [searchBody.query],
          filter: filterQuery,
        },
      };
    }

    // Add minimum score threshold
    if (options.minScore) {
      searchBody.min_score = options.minScore;
    }

    const response = await this.withRetry(() =>
      this.request<OpenSearchSearchResponse>(
        "POST",
        `/${indexName}/_search`,
        searchBody,
      ),
    );

    return (response.hits?.hits || []).map((hit) => ({
      id: hit._id,
      score: hit._score,
      vector: options.includeVectors
        ? (hit._source?.[this.vectorFieldName] as number[] | undefined)
        : undefined,
      metadata: hit._source?.[this.metadataFieldName] as TMetadata | undefined,
      content: hit._source?.[this.contentFieldName] as string | undefined,
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
      // Delete all documents in the index
      await this.withRetry(() =>
        this.request("POST", `/${indexName}/_delete_by_query`, {
          query: { match_all: {} },
        }),
      );
      return { deletedCount: undefined, acknowledged: true };
    }

    if (options.ids && options.ids.length > 0) {
      // Build bulk delete request
      const bulkBody = options.ids.flatMap((id) => [
        { delete: { _index: indexName, _id: id } },
      ]);

      const bulkBodyStr =
        bulkBody.map((item) => JSON.stringify(item)).join("\n") + "\n";

      const response = await this.withRetry(async () => {
        const url = `${this.endpoint}/_bulk`;
        const authHeader = await this.getAuthHeader();

        let headers: Record<string, string> = {
          "Content-Type": "application/x-ndjson",
        };

        if (authHeader) {
          headers["Authorization"] = authHeader;
        } else if (this.config.region) {
          const signedHeaders = await this.signRequest(
            "POST",
            url,
            bulkBodyStr,
          );
          headers = { ...headers, ...signedHeaders };
        }

        const res = await fetch(url, {
          method: "POST",
          headers,
          body: bulkBodyStr,
        });

        if (!res.ok) {
          const errorText = await res.text();
          throw new Error(
            `OpenSearch bulk API error (${res.status}): ${errorText}`,
          );
        }

        return res.json() as Promise<OpenSearchBulkResponse>;
      });

      const deletedCount = response.items.filter(
        (item) => item.delete && item.delete.status === 200,
      ).length;

      return { deletedCount, acknowledged: true };
    }

    if (options.filter) {
      const filterQuery = translateToAwsOpensearch(options.filter);
      const response = await this.withRetry(() =>
        this.request<{ deleted: number }>(
          "POST",
          `/${indexName}/_delete_by_query`,
          { query: filterQuery },
        ),
      );
      return { deletedCount: response.deleted, acknowledged: true };
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

    const doc: Record<string, unknown> = {};

    if (update.vector) {
      doc[this.vectorFieldName] = update.vector;
    }

    if (update.metadata) {
      doc[this.metadataFieldName] = update.metadata;
    }

    await this.withRetry(() =>
      this.request("POST", `/${indexName}/_update/${id}`, { doc }),
    );

    this.logDebug(`Updated vector: ${id}`);
  }

  /**
   * Get index statistics
   */
  async getStats(indexName: string): Promise<VectorStoreStats> {
    this.ensureInitialized();

    const statsResponse = await this.withRetry(() =>
      this.request<{
        _all?: {
          primaries?: {
            docs?: {
              count?: number;
            };
            store?: {
              size_in_bytes?: number;
            };
          };
        };
        indices?: Record<
          string,
          {
            primaries?: {
              docs?: { count?: number };
              store?: { size_in_bytes?: number };
            };
          }
        >;
      }>("GET", `/${indexName}/_stats`),
    );

    const indexStats = statsResponse.indices?.[indexName]?.primaries;

    // Get mapping to find dimension
    const mappingResponse = await this.withRetry(() =>
      this.request<
        Record<string, { mappings?: { properties?: Record<string, unknown> } }>
      >("GET", `/${indexName}/_mapping`),
    );

    const vectorMapping = mappingResponse[indexName]?.mappings?.properties?.[
      this.vectorFieldName
    ] as { dimension?: number } | undefined;

    return {
      vectorCount: indexStats?.docs?.count || 0,
      indexSize: indexStats?.store?.size_in_bytes,
      dimension: vectorMapping?.dimension,
      metrics: {
        docsCount: indexStats?.docs?.count,
        storeSizeBytes: indexStats?.store?.size_in_bytes,
      },
    };
  }

  /**
   * Translate filter to OpenSearch format
   */
  protected translateFilter<TMetadata extends UnknownRecord>(
    filter: MetadataFilter<TMetadata>,
  ): unknown {
    return translateToAwsOpensearch(filter);
  }

  /**
   * Map similarity metric to OpenSearch k-NN space type
   */
  private mapMetric(metric: SimilarityMetric): string {
    switch (metric) {
      case "cosine":
        return "cosinesimil";
      case "euclidean":
        return "l2";
      case "dotProduct":
        return "innerproduct";
      default:
        return "cosinesimil";
    }
  }
}
