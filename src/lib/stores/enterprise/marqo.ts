/**
 * Marqo Vector Store Implementation
 * End-to-end vector search engine with built-in embedding generation
 * @see https://docs.marqo.ai/
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
import { translateToMarqo } from "../filterTranslator.js";

/**
 * Marqo HTTP response types
 */
type MarqoIndexSettings = {
  indexName: string;
  numberOfShards?: number;
  numberOfReplicas?: number;
  type?: "structured" | "unstructured";
  model?: string;
  normalizeEmbeddings?: boolean;
  textPreprocessing?: {
    splitLength?: number;
    splitOverlap?: number;
    splitMethod?: string;
  };
  imagePreprocessing?: {
    patchMethod?: string | null;
  };
  vectorNumericType?: "float" | "bfloat16";
  annParameters?: {
    spaceType?: string;
    parameters?: {
      efConstruction?: number;
      m?: number;
    };
  };
  allFields?: Array<{
    name: string;
    type: string;
    features?: string[];
  }>;
  tensorFields?: string[];
};

type MarqoCreateIndexResponse = {
  acknowledged: boolean;
  index: string;
};

type MarqoSearchResponse = {
  hits: Array<MarqoHit>;
  limit: number;
  offset: number;
  query: string;
  processingTimeMs: number;
};

type MarqoHit = {
  _id: string;
  _score: number;
  _highlights?: Record<string, unknown>;
  [key: string]: unknown;
};

type MarqoAddDocumentsResponse = {
  errors: boolean;
  items: Array<{
    _id: string;
    status: number;
    result?: string;
    error?: string;
  }>;
  processingTimeMs: number;
};

type MarqoDeleteDocumentsResponse = {
  index_name: string;
  status: string;
  deleted: number;
};

type MarqoGetDocumentResponse = {
  _id: string;
  _found: boolean;
  [key: string]: unknown;
};

type MarqoIndexStatsResponse = {
  numberOfDocuments: number;
  numberOfVectors: number;
  backend: {
    memoryUsedPercentage?: number;
    storageUsedPercentage?: number;
  };
};

type MarqoListIndexesResponse = {
  results: Array<{
    indexName: string;
    numberOfDocuments?: number;
  }>;
};

/**
 * Marqo-specific configuration
 */
export type MarqoConfig = VectorStoreConfig & {
  /** Marqo endpoint URL (required) */
  endpoint: string;
  /** API key for Marqo Cloud (optional for self-hosted) */
  apiKey?: string;
  /** Default model for embedding generation (default: "hf/e5-base-v2") */
  defaultModel?: string;
  /** Normalize embeddings (default: true) */
  normalizeEmbeddings?: boolean;
  /** HTTP request timeout in milliseconds */
  requestTimeout?: number;
  /** Number of shards for new indexes (default: 1) */
  numberOfShards?: number;
  /** Number of replicas for new indexes (default: 0) */
  numberOfReplicas?: number;
};

/**
 * Marqo Vector Store implementation
 */
export class MarqoStore extends BaseVectorStore<MarqoConfig> {
  private readonly defaultModel: string;
  private readonly normalizeEmbeddings: boolean;
  private readonly requestTimeout: number;
  private readonly numberOfShards: number;
  private readonly numberOfReplicas: number;

  constructor(config: MarqoConfig) {
    super(config, "marqo" as VectorStoreName);
    this.defaultModel = config.defaultModel || "hf/e5-base-v2";
    this.normalizeEmbeddings = config.normalizeEmbeddings ?? true;
    this.requestTimeout = config.requestTimeout || 30000;
    this.numberOfShards = config.numberOfShards || 1;
    this.numberOfReplicas = config.numberOfReplicas || 0;
  }

  /**
   * Build headers for Marqo API requests
   */
  private buildHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };

    if (this.config.apiKey) {
      headers["x-api-key"] = this.config.apiKey;
    }

    return headers;
  }

  /**
   * Make HTTP request to Marqo
   */
  private async makeRequest<T>(
    path: string,
    options: {
      method?: string;
      body?: unknown;
      timeout?: number;
    } = {},
  ): Promise<T> {
    const { method = "GET", body, timeout = this.requestTimeout } = options;

    const url = `${this.config.endpoint}${path}`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch(url, {
        method,
        headers: this.buildHeaders(),
        body: body ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Marqo API error (${response.status}): ${errorText}`);
      }

      const contentType = response.headers.get("content-type");
      if (contentType?.includes("application/json")) {
        return (await response.json()) as T;
      }

      return {} as T;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  /**
   * Initialize connection to Marqo
   */
  async connect(): Promise<void> {
    if (this.initialized) {
      return;
    }

    try {
      // Test connection by listing indexes
      await this.makeRequest<MarqoListIndexesResponse>("/indexes");

      this.initialized = true;
      this.logInfo("Connected successfully", {
        endpoint: this.config.endpoint,
      });
    } catch (error) {
      this.logError("Failed to connect", error);
      throw new Error(
        `Failed to connect to Marqo: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Disconnect from Marqo
   */
  async disconnect(): Promise<void> {
    this.initialized = false;
    this.logInfo("Disconnected");
  }

  /**
   * Create a new index
   */
  async createIndex(config: VectorIndexConfig): Promise<void> {
    this.ensureInitialized();

    const spaceType = this.mapMetric(config.metric || "cosine");

    const indexSettings: MarqoIndexSettings = {
      indexName: config.name,
      type: "structured",
      numberOfShards: this.numberOfShards,
      numberOfReplicas: this.numberOfReplicas,
      model: this.defaultModel,
      normalizeEmbeddings: this.normalizeEmbeddings,
      annParameters: {
        spaceType,
        parameters: {
          efConstruction: 512,
          m: 16,
        },
      },
      allFields: [
        {
          name: "embedding",
          type: "custom_vector",
          features: ["lexical_search"],
        },
        {
          name: "content",
          type: "text",
          features: ["lexical_search"],
        },
        {
          name: "metadata",
          type: "map<text, text>",
          features: ["filter"],
        },
        {
          name: "namespace",
          type: "text",
          features: ["filter"],
        },
        {
          name: "created_at",
          type: "long",
          features: ["filter"],
        },
        {
          name: "updated_at",
          type: "long",
          features: ["filter"],
        },
      ],
      tensorFields: ["embedding"],
    };

    // Add dimension-specific configuration
    if (config.dimension) {
      // Marqo infers dimension from the model, but we can validate
      this.logDebug(
        `Creating index with expected dimension: ${config.dimension}`,
      );
    }

    await this.makeRequest<MarqoCreateIndexResponse>(
      `/indexes/${config.name}`,
      {
        method: "POST",
        body: indexSettings,
      },
    );

    this.logInfo(`Index created: ${config.name}`, {
      dimension: config.dimension,
      metric: config.metric || "cosine",
      model: this.defaultModel,
    });

    // Wait for index to be ready
    await this.waitForIndexReady(config.name);
  }

  /**
   * Delete an index
   */
  async deleteIndex(indexName: string): Promise<void> {
    this.ensureInitialized();

    await this.makeRequest(`/indexes/${indexName}`, {
      method: "DELETE",
    });

    this.logInfo(`Index deleted: ${indexName}`);
  }

  /**
   * List all indexes
   */
  async listIndexes(): Promise<string[]> {
    this.ensureInitialized();

    const response =
      await this.makeRequest<MarqoListIndexesResponse>("/indexes");
    return response.results.map((idx) => idx.indexName);
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

    const batchSize = options?.batchSize || 64; // Marqo recommends smaller batches
    let totalUpserted = 0;
    let errorCount = 0;

    // Process in batches
    for (let i = 0; i < records.length; i += batchSize) {
      const batch = records.slice(i, i + batchSize);

      // Transform records to Marqo document format
      const documents = batch.map((record) => ({
        _id: record.id,
        embedding: {
          vector: record.vector,
          content: record.content || "",
        },
        content: record.content || "",
        metadata: this.serializeMetadata(record.metadata),
        namespace: options?.namespace || "default",
        created_at: Date.now(),
        updated_at: Date.now(),
      }));

      const response = await this.makeRequest<MarqoAddDocumentsResponse>(
        `/indexes/${indexName}/documents`,
        {
          method: "POST",
          body: {
            documents,
            tensorFields: ["embedding"],
          },
        },
      );

      // Count successful upserts
      const successCount = response.items.filter(
        (item) => item.status === 200 || item.status === 201,
      ).length;
      totalUpserted += successCount;
      errorCount += response.items.length - successCount;

      this.logDebug(
        `Upserted batch: ${totalUpserted}/${records.length} (errors: ${errorCount})`,
      );
    }

    if (errorCount > 0) {
      this.logInfo(`Upsert completed with ${errorCount} errors`);
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

    // Build search request
    const searchBody: Record<string, unknown> = {
      q: {
        embedding: {
          vector: options.vector,
          weight: 1.0,
        },
      },
      limit: options.topK,
      showHighlights: false,
      attributesToRetrieve: ["*"],
      searchMethod: "TENSOR",
    };

    // Add filter if provided
    if (options.filter) {
      searchBody.filter = translateToMarqo(options.filter);
    }

    // Add namespace filter
    if (options.namespace) {
      const namespaceFilter = `namespace:(${options.namespace})`;
      searchBody.filter = searchBody.filter
        ? `(${searchBody.filter}) AND ${namespaceFilter}`
        : namespaceFilter;
    }

    // Add score threshold
    if (options.minScore) {
      searchBody.scoreModifiers = {
        multiplyScoreBy: [
          {
            fieldName: "_score",
            weight: 1.0,
          },
        ],
      };
    }

    const response = await this.makeRequest<MarqoSearchResponse>(
      `/indexes/${indexName}/search`,
      {
        method: "POST",
        body: searchBody,
      },
    );

    // Transform results
    return response.hits
      .filter((hit) => !options.minScore || hit._score >= options.minScore)
      .map((hit) => ({
        id: hit._id,
        score: hit._score,
        vector: options.includeVectors
          ? (hit.embedding as { vector?: number[] })?.vector || undefined
          : undefined,
        metadata: this.deserializeMetadata(
          hit.metadata as Record<string, string>,
        ) as TMetadata,
        content: hit.content as string | undefined,
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
      // Delete by filter matching all documents
      await this.makeRequest<MarqoDeleteDocumentsResponse>(
        `/indexes/${indexName}/documents/delete-batch`,
        {
          method: "POST",
          body: {
            filter: "*",
          },
        },
      );
      return { deletedCount: undefined, acknowledged: true };
    }

    if (options.ids && options.ids.length > 0) {
      const response = await this.makeRequest<MarqoDeleteDocumentsResponse>(
        `/indexes/${indexName}/documents/delete-batch`,
        {
          method: "POST",
          body: {
            documentIds: options.ids,
          },
        },
      );
      return { deletedCount: response.deleted, acknowledged: true };
    }

    if (options.filter) {
      const filterString = translateToMarqo(options.filter);
      const response = await this.makeRequest<MarqoDeleteDocumentsResponse>(
        `/indexes/${indexName}/documents/delete-batch`,
        {
          method: "POST",
          body: {
            filter: filterString,
          },
        },
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
      return;
    }

    // Get existing document
    const existing = await this.makeRequest<MarqoGetDocumentResponse>(
      `/indexes/${indexName}/documents/${id}`,
    );

    if (!existing._found) {
      throw new Error(
        `Vector with id '${id}' not found in index '${indexName}'`,
      );
    }

    // Build updated document
    const updatedDoc: Record<string, unknown> = {
      _id: id,
      content: existing.content,
      namespace: existing.namespace,
      created_at: existing.created_at,
      updated_at: Date.now(),
    };

    if (update.vector) {
      updatedDoc.embedding = {
        vector: update.vector,
        content: existing.content || "",
      };
    } else {
      updatedDoc.embedding = existing.embedding;
    }

    if (update.metadata) {
      updatedDoc.metadata = this.serializeMetadata({
        ...(this.deserializeMetadata(
          existing.metadata as Record<string, string>,
        ) as object),
        ...update.metadata,
      });
    } else {
      updatedDoc.metadata = existing.metadata;
    }

    // Upsert the updated document
    await this.makeRequest<MarqoAddDocumentsResponse>(
      `/indexes/${indexName}/documents`,
      {
        method: "POST",
        body: {
          documents: [updatedDoc],
          tensorFields: ["embedding"],
        },
      },
    );

    this.logDebug(`Updated vector: ${id}`);
  }

  /**
   * Get index statistics
   */
  async getStats(indexName: string): Promise<VectorStoreStats> {
    this.ensureInitialized();

    const response = await this.makeRequest<MarqoIndexStatsResponse>(
      `/indexes/${indexName}/stats`,
    );

    return {
      vectorCount: response.numberOfDocuments,
      metrics: {
        numberOfVectors: response.numberOfVectors,
        memoryUsedPercentage: response.backend.memoryUsedPercentage,
        storageUsedPercentage: response.backend.storageUsedPercentage,
      },
    };
  }

  /**
   * Translate filter to Marqo format
   */
  protected translateFilter<TMetadata extends UnknownRecord>(
    filter: MetadataFilter<TMetadata>,
  ): unknown {
    return translateToMarqo(filter);
  }

  /**
   * Map similarity metric to Marqo format
   */
  private mapMetric(metric: SimilarityMetric): string {
    switch (metric) {
      case "cosine":
        return "cosinesimil";
      case "euclidean":
        return "euclidean";
      case "dotProduct":
        return "dotproduct";
      default:
        return "cosinesimil";
    }
  }

  /**
   * Wait for index to be ready
   */
  private async waitForIndexReady(
    indexName: string,
    maxWaitMs: number = 30000,
  ): Promise<void> {
    const startTime = Date.now();
    const pollInterval = 1000;

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

    this.logInfo(
      `Index ${indexName} readiness check timed out after ${maxWaitMs}ms, proceeding anyway`,
    );
  }

  /**
   * Serialize metadata to string values for Marqo
   */
  private serializeMetadata(
    metadata?: UnknownRecord,
  ): Record<string, string> | undefined {
    if (!metadata) {return undefined;}

    const serialized: Record<string, string> = {};
    for (const [key, value] of Object.entries(metadata)) {
      if (value !== undefined && value !== null) {
        serialized[key] =
          typeof value === "object" ? JSON.stringify(value) : String(value);
      }
    }
    return serialized;
  }

  /**
   * Deserialize metadata from string values
   */
  private deserializeMetadata(
    metadata?: Record<string, string>,
  ): UnknownRecord | undefined {
    if (!metadata) {return undefined;}

    const deserialized: UnknownRecord = {};
    for (const [key, value] of Object.entries(metadata)) {
      try {
        // Try to parse JSON
        deserialized[key] = JSON.parse(value);
      } catch {
        // Keep as string if not JSON
        deserialized[key] = value;
      }
    }
    return deserialized;
  }
}
