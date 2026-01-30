/**
 * Azure AI Search Vector Store Implementation
 * Enterprise-grade search service with native vector support
 * @see https://learn.microsoft.com/en-us/azure/search/vector-search-overview
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
import { translateToAzureAiSearch } from "../filterTranslator.js";

/**
 * Azure AI Search document with vector field
 */
type AzureSearchDocument = {
  id: string;
  contentVector?: number[];
  metadata?: Record<string, unknown>;
  content?: string;
  [key: string]: unknown;
};

/**
 * Azure AI Search query response
 */
type AzureSearchResponse = {
  value: Array<{
    id: string;
    "@search.score"?: number;
    contentVector?: number[];
    metadata?: Record<string, unknown>;
    content?: string;
    [key: string]: unknown;
  }>;
  "@odata.count"?: number;
};

/**
 * Azure AI Search index definition
 */
type AzureIndexDefinition = {
  name: string;
  fields: Array<{
    name: string;
    type: string;
    searchable?: boolean;
    filterable?: boolean;
    retrievable?: boolean;
    sortable?: boolean;
    facetable?: boolean;
    key?: boolean;
    dimensions?: number;
    vectorSearchProfile?: string;
  }>;
  vectorSearch?: {
    algorithms: Array<{
      name: string;
      kind: string;
      hnswParameters?: {
        m?: number;
        efConstruction?: number;
        efSearch?: number;
        metric?: string;
      };
    }>;
    profiles: Array<{
      name: string;
      algorithm: string;
    }>;
  };
};

/**
 * Azure AI Search-specific configuration
 */
export type AzureAiSearchConfig = VectorStoreConfig & {
  /** Azure Search service endpoint (required) */
  endpoint: string;
  /** API key for authentication (required) */
  apiKey: string;
  /** API version (default: 2024-07-01) */
  apiVersion?: string;
  /** Vector field name (default: contentVector) */
  vectorFieldName?: string;
  /** Metadata field name (default: metadata) */
  metadataFieldName?: string;
  /** Content field name (default: content) */
  contentFieldName?: string;
  /** HNSW parameters for index creation */
  hnswParameters?: {
    m?: number;
    efConstruction?: number;
    efSearch?: number;
  };
};

/**
 * Azure AI Search Vector Store implementation
 */
export class AzureAiSearchStore extends BaseVectorStore<AzureAiSearchConfig> {
  private endpoint: string;
  private apiKey: string;
  private apiVersion: string;
  private vectorFieldName: string;
  private metadataFieldName: string;
  private contentFieldName: string;

  constructor(config: AzureAiSearchConfig) {
    super(config, "azure-ai-search" as VectorStoreName);
    this.endpoint = config.endpoint.replace(/\/$/, ""); // Remove trailing slash
    this.apiKey = config.apiKey;
    this.apiVersion = config.apiVersion || "2024-07-01";
    this.vectorFieldName = config.vectorFieldName || "contentVector";
    this.metadataFieldName = config.metadataFieldName || "metadata";
    this.contentFieldName = config.contentFieldName || "content";
  }

  /**
   * Make HTTP request to Azure Search REST API
   */
  private async request<T>(
    method: string,
    path: string,
    body?: unknown,
  ): Promise<T> {
    const url = `${this.endpoint}${path}?api-version=${this.apiVersion}`;
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      "api-key": this.apiKey,
    };

    const response = await fetch(url, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `Azure Search API error (${response.status}): ${errorText}`,
      );
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
      message.includes("too many requests") ||
      message.includes("service unavailable")
    );
  }

  /**
   * Initialize connection to Azure AI Search
   */
  async connect(): Promise<void> {
    if (this.initialized) {
      return;
    }

    try {
      // Test connection by listing indexes
      await this.listIndexes();
      this.initialized = true;
      this.logInfo("Connected successfully");
    } catch (error) {
      this.logError("Failed to connect", error);
      throw new Error(
        `Failed to connect to Azure AI Search: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Disconnect from Azure AI Search
   */
  async disconnect(): Promise<void> {
    this.initialized = false;
    this.logInfo("Disconnected");
  }

  /**
   * Create a new index with vector search capabilities
   */
  async createIndex(config: VectorIndexConfig): Promise<void> {
    this.ensureInitialized();

    const metric = this.mapMetric(config.metric || "cosine");
    const hnswParams = this.config.hnswParameters || {};

    const indexDefinition: AzureIndexDefinition = {
      name: config.name,
      fields: [
        {
          name: "id",
          type: "Edm.String",
          key: true,
          searchable: false,
          filterable: true,
          retrievable: true,
          sortable: false,
          facetable: false,
        },
        {
          name: this.vectorFieldName,
          type: "Collection(Edm.Single)",
          searchable: true,
          filterable: false,
          retrievable: true,
          sortable: false,
          facetable: false,
          dimensions: config.dimension,
          vectorSearchProfile: "default-profile",
        },
        {
          name: this.metadataFieldName,
          type: "Edm.ComplexType",
          searchable: false,
          filterable: true,
          retrievable: true,
        },
        {
          name: this.contentFieldName,
          type: "Edm.String",
          searchable: true,
          filterable: false,
          retrievable: true,
          sortable: false,
          facetable: false,
        },
      ],
      vectorSearch: {
        algorithms: [
          {
            name: "hnsw-algorithm",
            kind: "hnsw",
            hnswParameters: {
              m: hnswParams.m || 4,
              efConstruction: hnswParams.efConstruction || 400,
              efSearch: hnswParams.efSearch || 500,
              metric,
            },
          },
        ],
        profiles: [
          {
            name: "default-profile",
            algorithm: "hnsw-algorithm",
          },
        ],
      },
    };

    await this.withRetry(() =>
      this.request("PUT", `/indexes/${config.name}`, indexDefinition),
    );

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

    await this.withRetry(() => this.request("DELETE", `/indexes/${indexName}`));
    this.logInfo(`Index deleted: ${indexName}`);
  }

  /**
   * List all indexes
   */
  async listIndexes(): Promise<string[]> {
    this.ensureInitialized();

    const response = await this.withRetry(() =>
      this.request<{ value: Array<{ name: string }> }>("GET", "/indexes"),
    );
    return response.value?.map((i) => i.name) || [];
  }

  /**
   * Check if an index exists
   */
  async indexExists(indexName: string): Promise<boolean> {
    try {
      await this.request("GET", `/indexes/${indexName}`);
      return true;
    } catch (error) {
      if ((error as Error).message?.includes("404")) {
        return false;
      }
      throw error;
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

    const batchSize = options?.batchSize || 1000; // Azure allows up to 1000 per batch
    let totalUpserted = 0;

    // Convert records to Azure Search format
    const documents: AzureSearchDocument[] = records.map((record) => ({
      "@search.action": "mergeOrUpload",
      id: record.id,
      [this.vectorFieldName]: record.vector,
      [this.metadataFieldName]: record.metadata,
      [this.contentFieldName]: record.content,
    }));

    // Batch upsert
    for (let i = 0; i < documents.length; i += batchSize) {
      const batch = documents.slice(i, i + batchSize);
      await this.withRetry(() =>
        this.request("POST", `/indexes/${indexName}/docs/index`, {
          value: batch,
        }),
      );
      totalUpserted += batch.length;

      this.logDebug(`Upserted batch: ${totalUpserted}/${documents.length}`);
    }

    return { upsertedCount: totalUpserted };
  }

  /**
   * Query vectors using vector search
   */
  async query<TMetadata extends UnknownRecord = UnknownRecord>(
    indexName: string,
    options: VectorQueryOptions<TMetadata>,
  ): Promise<VectorQueryResult<TMetadata>[]> {
    this.ensureInitialized();

    const searchBody: Record<string, unknown> = {
      count: true,
      select: options.includeVectors
        ? `id,${this.vectorFieldName},${this.metadataFieldName},${this.contentFieldName}`
        : `id,${this.metadataFieldName},${this.contentFieldName}`,
      top: options.topK,
      vectorQueries: [
        {
          kind: "vector",
          vector: options.vector,
          fields: this.vectorFieldName,
          k: options.topK,
        },
      ],
    };

    if (options.filter) {
      searchBody.filter = translateToAzureAiSearch(options.filter);
    }

    const response = await this.withRetry(() =>
      this.request<AzureSearchResponse>(
        "POST",
        `/indexes/${indexName}/docs/search`,
        searchBody,
      ),
    );

    return (response.value || [])
      .filter(
        (doc) =>
          !options.minScore || (doc["@search.score"] ?? 0) >= options.minScore,
      )
      .map((doc) => ({
        id: doc.id,
        score: doc["@search.score"] ?? 0,
        vector: options.includeVectors
          ? (doc[this.vectorFieldName] as number[] | undefined)
          : undefined,
        metadata: doc[this.metadataFieldName] as TMetadata | undefined,
        content: doc[this.contentFieldName] as string | undefined,
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
      // Azure Search doesn't have a "delete all" - need to delete the index and recreate
      this.logInfo(
        "deleteAll is not directly supported by Azure AI Search. Consider recreating the index.",
      );
      return { deletedCount: undefined, acknowledged: true };
    }

    if (options.ids && options.ids.length > 0) {
      const documents = options.ids.map((id) => ({
        "@search.action": "delete",
        id,
      }));

      await this.withRetry(() =>
        this.request("POST", `/indexes/${indexName}/docs/index`, {
          value: documents,
        }),
      );
      return { deletedCount: options.ids.length, acknowledged: true };
    }

    if (options.filter) {
      // Azure Search doesn't support filter-based deletion directly
      // Need to search first, then delete by IDs
      const filterStr = translateToAzureAiSearch(options.filter);
      const searchResponse = await this.withRetry(() =>
        this.request<AzureSearchResponse>(
          "POST",
          `/indexes/${indexName}/docs/search`,
          {
            filter: filterStr,
            select: "id",
            top: 10000, // Max batch size
          },
        ),
      );

      if (searchResponse.value && searchResponse.value.length > 0) {
        const documents = searchResponse.value.map((doc) => ({
          "@search.action": "delete",
          id: doc.id,
        }));

        await this.withRetry(() =>
          this.request("POST", `/indexes/${indexName}/docs/index`, {
            value: documents,
          }),
        );
        return { deletedCount: documents.length, acknowledged: true };
      }
      return { deletedCount: 0, acknowledged: true };
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

    const document: AzureSearchDocument = {
      "@search.action": "merge",
      id,
    };

    if (update.vector) {
      document[this.vectorFieldName] = update.vector;
    }

    if (update.metadata) {
      document[this.metadataFieldName] = update.metadata as Record<
        string,
        unknown
      >;
    }

    await this.withRetry(() =>
      this.request("POST", `/indexes/${indexName}/docs/index`, {
        value: [document],
      }),
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
        documentCount?: number;
        storageSize?: number;
      }>("GET", `/indexes/${indexName}/stats`),
    );

    const indexDef = await this.withRetry(() =>
      this.request<AzureIndexDefinition>("GET", `/indexes/${indexName}`),
    );

    const vectorField = indexDef.fields?.find(
      (f) => f.name === this.vectorFieldName,
    );

    return {
      vectorCount: statsResponse.documentCount || 0,
      indexSize: statsResponse.storageSize,
      dimension: vectorField?.dimensions,
      metrics: {
        documentCount: statsResponse.documentCount,
        storageSize: statsResponse.storageSize,
      },
    };
  }

  /**
   * Translate filter to Azure AI Search format
   */
  protected translateFilter<TMetadata extends UnknownRecord>(
    filter: MetadataFilter<TMetadata>,
  ): unknown {
    return translateToAzureAiSearch(filter);
  }

  /**
   * Map similarity metric to Azure format
   */
  private mapMetric(metric: SimilarityMetric): string {
    switch (metric) {
      case "cosine":
        return "cosine";
      case "euclidean":
        return "euclidean";
      case "dotProduct":
        return "dotProduct";
      default:
        return "cosine";
    }
  }
}
