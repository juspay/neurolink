/**
 * Vespa Vector Store Implementation
 * High-performance enterprise search platform with advanced vector capabilities
 * @see https://docs.vespa.ai/en/nearest-neighbor-search.html
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
import { translateToVespa } from "../filterTranslator.js";

/**
 * Vespa HTTP response types
 */
type VespaFeedResponse = {
  pathId: string;
  id: string;
};

type VespaQueryResponse = {
  root: {
    id: string;
    relevance: number;
    children?: Array<VespaHit>;
    fields?: {
      totalCount?: number;
    };
  };
};

type VespaHit = {
  id: string;
  relevance: number;
  source: string;
  fields: Record<string, unknown>;
};

type VespaVisitResponse = {
  documents: Array<{
    id: string;
    fields: Record<string, unknown>;
  }>;
  continuation?: string;
};

type VespaApplicationResponse = {
  name: string;
  schemas?: Array<{ name: string }>;
};

/**
 * Vespa-specific configuration
 */
export type VespaConfig = VectorStoreConfig & {
  /** Vespa endpoint URL (required) */
  endpoint: string;
  /** Application name (required) */
  applicationName: string;
  /** Certificate path for mTLS (optional for cloud deployments) */
  certPath?: string;
  /** Key path for mTLS (optional for cloud deployments) */
  keyPath?: string;
  /** CA certificate path (optional) */
  caCertPath?: string;
  /** API key for Vespa Cloud (optional) */
  apiKey?: string;
  /** Document namespace (default: "default") */
  namespace?: string;
  /** Vector field name in schema (default: "embedding") */
  vectorFieldName?: string;
  /** Content type (default: "neurolink_vectors") */
  contentType?: string;
  /** HTTP request timeout in milliseconds */
  requestTimeout?: number;
};

/**
 * Vespa Vector Store implementation
 */
export class VespaStore extends BaseVectorStore<VespaConfig> {
  private readonly namespace: string;
  private readonly vectorFieldName: string;
  private readonly contentType: string;
  private readonly requestTimeout: number;
  private indexes: Map<string, VectorIndexConfig> = new Map();

  constructor(config: VespaConfig) {
    super(config, "vespa" as VectorStoreName);
    this.namespace = config.namespace || "default";
    this.vectorFieldName = config.vectorFieldName || "embedding";
    this.contentType = config.contentType || "neurolink_vectors";
    this.requestTimeout = config.requestTimeout || 30000;
  }

  /**
   * Build headers for Vespa API requests
   */
  private buildHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };

    if (this.config.apiKey) {
      headers["Authorization"] = `Bearer ${this.config.apiKey}`;
    }

    return headers;
  }

  /**
   * Make HTTP request to Vespa
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
        throw new Error(`Vespa API error (${response.status}): ${errorText}`);
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
   * Initialize connection to Vespa
   */
  async connect(): Promise<void> {
    if (this.initialized) {
      return;
    }

    try {
      // Test connection by getting application status
      await this.makeRequest<VespaApplicationResponse>("/ApplicationStatus");

      this.initialized = true;
      this.logInfo("Connected successfully", {
        endpoint: this.config.endpoint,
        application: this.config.applicationName,
      });
    } catch (error) {
      this.logError("Failed to connect", error);
      throw new Error(
        `Failed to connect to Vespa: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Disconnect from Vespa
   */
  async disconnect(): Promise<void> {
    this.indexes.clear();
    this.initialized = false;
    this.logInfo("Disconnected");
  }

  /**
   * Create a new index (stores configuration locally - Vespa schema managed externally)
   * Note: In production, Vespa schemas should be deployed via application packages
   */
  async createIndex(config: VectorIndexConfig): Promise<void> {
    this.ensureInitialized();

    // Store index configuration locally
    // In production Vespa, schemas are defined in application packages
    this.indexes.set(config.name, config);

    this.logInfo(`Index configuration stored: ${config.name}`, {
      dimension: config.dimension,
      metric: config.metric || "cosine",
    });
  }

  /**
   * Delete an index
   */
  async deleteIndex(indexName: string): Promise<void> {
    this.ensureInitialized();

    // Delete all documents with this index
    await this.deleteAllDocuments(indexName);

    // Remove from local index store
    this.indexes.delete(indexName);

    this.logInfo(`Index deleted: ${indexName}`);
  }

  /**
   * Delete all documents for an index
   */
  private async deleteAllDocuments(indexName: string): Promise<void> {
    // Use visit API to get all document IDs, then delete them
    let continuation: string | undefined;

    do {
      const visitPath = `/document/v1/${this.namespace}/${this.contentType}/docid?selection=${this.contentType}.index_name=="${indexName}"&wantedDocumentCount=1000${continuation ? `&continuation=${continuation}` : ""}`;

      const response = await this.makeRequest<VespaVisitResponse>(visitPath);

      // Delete each document
      const deletePromises = response.documents.map((doc) => {
        const docId = doc.id.split("::").pop() || doc.id;
        return this.makeRequest(
          `/document/v1/${this.namespace}/${this.contentType}/docid/${docId}`,
          { method: "DELETE" },
        ).catch(() => {
          // Ignore delete errors
        });
      });

      await Promise.all(deletePromises);
      continuation = response.continuation;
    } while (continuation);
  }

  /**
   * List all indexes
   */
  async listIndexes(): Promise<string[]> {
    this.ensureInitialized();

    // Return locally stored indexes
    // In production, you might query Vespa for unique index_name values
    return Array.from(this.indexes.keys());
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

    const batchSize = options?.batchSize || 100;
    let totalUpserted = 0;

    // Process in batches
    for (let i = 0; i < records.length; i += batchSize) {
      const batch = records.slice(i, i + batchSize);

      const upsertPromises = batch.map(async (record) => {
        const document = {
          fields: {
            [this.vectorFieldName]: {
              values: record.vector,
            },
            metadata: record.metadata || {},
            content: record.content || "",
            index_name: indexName,
            namespace: options?.namespace || this.namespace,
            created_at: Date.now(),
            updated_at: Date.now(),
          },
        };

        await this.makeRequest<VespaFeedResponse>(
          `/document/v1/${this.namespace}/${this.contentType}/docid/${record.id}`,
          {
            method: "PUT",
            body: document,
          },
        );
      });

      await Promise.all(upsertPromises);
      totalUpserted += batch.length;

      this.logDebug(`Upserted batch: ${totalUpserted}/${records.length}`);
    }

    return { upsertedCount: totalUpserted };
  }

  /**
   * Query vectors using nearest neighbor search
   */
  async query<TMetadata extends UnknownRecord = UnknownRecord>(
    indexName: string,
    options: VectorQueryOptions<TMetadata>,
  ): Promise<VectorQueryResult<TMetadata>[]> {
    this.ensureInitialized();

    // Build YQL query with nearest neighbor search
    let yql = `select * from ${this.contentType} where `;
    const conditions: string[] = [];

    // Add index filter
    conditions.push(`index_name contains "${indexName}"`);

    // Add namespace filter if provided
    if (options.namespace) {
      conditions.push(`namespace contains "${options.namespace}"`);
    }

    // Add metadata filter if provided
    if (options.filter) {
      const filterCondition = translateToVespa(options.filter);
      if (filterCondition) {
        conditions.push(filterCondition as string);
      }
    }

    // Build the nearest neighbor query
    const nnQuery = `({targetHits:${options.topK}}nearestNeighbor(${this.vectorFieldName},query_embedding))`;
    conditions.push(nnQuery);

    yql += conditions.join(" and ");

    // Build request body
    const queryBody = {
      yql,
      hits: options.topK,
      "ranking.profile": "default",
      "input.query(query_embedding)": options.vector,
    };

    const response = await this.makeRequest<VespaQueryResponse>("/search/", {
      method: "POST",
      body: queryBody,
    });

    // Transform results
    const results: VectorQueryResult<TMetadata>[] = [];

    for (const hit of response.root.children || []) {
      const score = hit.relevance;

      // Apply minScore filter
      if (options.minScore && score < options.minScore) {
        continue;
      }

      results.push({
        id: hit.id.split("::").pop() || hit.id,
        score,
        vector: options.includeVectors
          ? (hit.fields[this.vectorFieldName] as { values?: number[] })
              ?.values || undefined
          : undefined,
        metadata: hit.fields.metadata as TMetadata,
        content: hit.fields.content as string | undefined,
      });
    }

    return results;
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
      await this.deleteAllDocuments(indexName);
      return { deletedCount: undefined, acknowledged: true };
    }

    if (options.ids && options.ids.length > 0) {
      const deletePromises = options.ids.map((id) =>
        this.makeRequest(
          `/document/v1/${this.namespace}/${this.contentType}/docid/${id}`,
          { method: "DELETE" },
        ).catch(() => {
          // Ignore not found errors
        }),
      );
      await Promise.all(deletePromises);
      return { deletedCount: options.ids.length, acknowledged: true };
    }

    if (options.filter) {
      // Use visit API with selection for filter-based deletion
      const filterCondition = translateToVespa(options.filter);
      let continuation: string | undefined;
      let deletedCount = 0;

      do {
        const visitPath = `/document/v1/${this.namespace}/${this.contentType}/docid?selection=${this.contentType}.index_name=="${indexName}" and ${filterCondition}&wantedDocumentCount=1000${continuation ? `&continuation=${continuation}` : ""}`;

        const response = await this.makeRequest<VespaVisitResponse>(visitPath);

        const deletePromises = response.documents.map((doc) => {
          const docId = doc.id.split("::").pop() || doc.id;
          return this.makeRequest(
            `/document/v1/${this.namespace}/${this.contentType}/docid/${docId}`,
            { method: "DELETE" },
          );
        });

        await Promise.all(deletePromises);
        deletedCount += response.documents.length;
        continuation = response.continuation;
      } while (continuation);

      return { deletedCount, acknowledged: true };
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

    // Build partial update document
    const updateFields: Record<string, unknown> = {
      updated_at: Date.now(),
    };

    if (update.vector) {
      updateFields[this.vectorFieldName] = {
        assign: { values: update.vector },
      };
    }

    if (update.metadata) {
      updateFields.metadata = {
        assign: update.metadata,
      };
    }

    await this.makeRequest(
      `/document/v1/${this.namespace}/${this.contentType}/docid/${id}`,
      {
        method: "PUT",
        body: {
          fields: updateFields,
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

    // Query for count
    const yql = `select * from ${this.contentType} where index_name contains "${indexName}" | all(group(1) each(output(count())))`;

    const response = await this.makeRequest<VespaQueryResponse>("/search/", {
      method: "POST",
      body: { yql, hits: 0 },
    });

    const vectorCount = response.root.fields?.totalCount || 0;
    const indexConfig = this.indexes.get(indexName);

    return {
      vectorCount,
      dimension: indexConfig?.dimension,
      metrics: {
        indexName,
        namespace: this.namespace,
        contentType: this.contentType,
      },
    };
  }

  /**
   * Translate filter to Vespa YQL format
   */
  protected translateFilter<TMetadata extends UnknownRecord>(
    filter: MetadataFilter<TMetadata>,
  ): unknown {
    return translateToVespa(filter);
  }
}
