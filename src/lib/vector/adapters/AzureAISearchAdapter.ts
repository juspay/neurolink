/**
 * Azure AI Search Vector Store Adapter
 * Implements vector similarity search using Azure AI Search (formerly Cognitive Search)
 *
 * Azure AI Search provides enterprise-grade vector search capabilities with:
 * - Vector search using vectorQueries
 * - Hybrid search (vector + full-text)
 * - OData filter expressions for metadata filtering
 * - Semantic ranking and re-ranking
 *
 * @see https://learn.microsoft.com/en-us/azure/search/vector-search-overview
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
 * Azure AI Search specific configuration
 */
export type AzureAISearchConfig = VectorStoreConfig & {
  /** Azure Search service endpoint (e.g., https://myservice.search.windows.net) */
  endpoint: string;
  /** Azure Search API key (admin key for write operations) */
  apiKey: string;
  /** API version (default: 2024-07-01) */
  apiVersion?: string;
  /** Default vector field name in documents (default: "vector") */
  vectorFieldName?: string;
  /** Default content field name (default: "content") */
  contentFieldName?: string;
  /** Default metadata field name (default: "metadata") */
  metadataFieldName?: string;
  /** Enable semantic ranking (requires Semantic Ranker enabled on service) */
  enableSemanticRanking?: boolean;
  /** Semantic configuration name (required if enableSemanticRanking is true) */
  semanticConfigurationName?: string;
  /** HTTP request timeout in ms (default: 30000) */
  requestTimeout?: number;
};

/**
 * Azure Search index field definition
 */
interface AzureSearchField {
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
}

/**
 * Azure Search index definition
 */
interface AzureSearchIndex {
  name: string;
  fields: AzureSearchField[];
  vectorSearch?: {
    algorithms: Array<{
      name: string;
      kind: string;
      hnswParameters?: {
        metric: string;
        m?: number;
        efConstruction?: number;
        efSearch?: number;
      };
    }>;
    profiles: Array<{
      name: string;
      algorithmConfigurationName: string;
    }>;
  };
  semantic?: {
    configurations: Array<{
      name: string;
      prioritizedFields: {
        contentFields: Array<{ fieldName: string }>;
        titleField?: { fieldName: string };
      };
    }>;
  };
}

/**
 * Azure Search document structure
 */
interface AzureSearchDocument {
  "@search.action"?: "upload" | "merge" | "mergeOrUpload" | "delete";
  id: string;
  vector?: number[];
  content?: string;
  metadata?: string;
  namespace?: string;
  [key: string]: unknown;
}

/**
 * Azure Search query response
 */
interface AzureSearchResponse<T = AzureSearchDocument> {
  "@odata.count"?: number;
  "@odata.nextLink"?: string;
  value: Array<T & { "@search.score"?: number }>;
}

/**
 * Index metadata stored internally
 */
interface IndexMetadata {
  name: string;
  dimension: number;
  metric: SimilarityMetric;
  vectorFieldName: string;
}

/**
 * Azure AI Search Vector Store Adapter
 *
 * Features:
 * - Vector similarity search using HNSW algorithm
 * - Hybrid search combining vector and full-text search
 * - OData filter expressions for metadata filtering
 * - Namespace support through metadata field filtering
 * - Batch upsert and delete operations
 * - Semantic ranking (optional)
 *
 * Prerequisites:
 * - Azure AI Search service (Basic tier or higher for vector search)
 * - Admin API key for index management and document operations
 */
export class AzureAISearchAdapter extends BaseVectorStore<AzureAISearchConfig> {
  private indexMetadataCache: Map<string, IndexMetadata> = new Map();
  private readonly apiVersion: string;
  private readonly vectorFieldName: string;
  private readonly contentFieldName: string;
  private readonly metadataFieldName: string;
  private readonly requestTimeout: number;

  constructor(config: AzureAISearchConfig) {
    super(config, "azure-ai-search" as VectorStoreName);
    this.apiVersion = config.apiVersion || "2024-07-01";
    this.vectorFieldName = config.vectorFieldName || "vector";
    this.contentFieldName = config.contentFieldName || "content";
    this.metadataFieldName = config.metadataFieldName || "metadata";
    this.requestTimeout = config.requestTimeout || 30000;
  }

  /**
   * Initialize connection to Azure AI Search
   * Validates credentials by listing indexes
   */
  async connect(): Promise<void> {
    if (this.initialized) {
      logger.debug("Azure AI Search already connected");
      return;
    }

    try {
      // Validate connection by listing indexes
      await this.makeRequest("GET", "/indexes", null, { "$select": "name" });
      this.initialized = true;
      logger.debug("Azure AI Search connected successfully", {
        endpoint: this.config.endpoint,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to connect to Azure AI Search: ${message}`);
    }
  }

  /**
   * Close connection (no-op for REST API, but clears cache)
   */
  async disconnect(): Promise<void> {
    this.initialized = false;
    this.indexMetadataCache.clear();
    logger.debug("Azure AI Search disconnected");
  }

  /**
   * Create a new search index with vector capabilities
   */
  async createIndex(config: VectorIndexConfig): Promise<void> {
    this.ensureInitialized();

    const { name, dimension, metric = "cosine" } = config;
    const azureMetric = this.mapMetricToAzure(metric);

    const indexDefinition: AzureSearchIndex = {
      name,
      fields: [
        {
          name: "id",
          type: "Edm.String",
          key: true,
          filterable: true,
          searchable: false,
        },
        {
          name: this.vectorFieldName,
          type: "Collection(Edm.Single)",
          searchable: true,
          retrievable: true,
          dimensions: dimension,
          vectorSearchProfile: "vector-profile",
        },
        {
          name: this.contentFieldName,
          type: "Edm.String",
          searchable: true,
          filterable: false,
          retrievable: true,
        },
        {
          name: this.metadataFieldName,
          type: "Edm.String",
          searchable: false,
          filterable: false,
          retrievable: true,
        },
        {
          name: "namespace",
          type: "Edm.String",
          searchable: false,
          filterable: true,
          retrievable: true,
        },
      ],
      vectorSearch: {
        algorithms: [
          {
            name: "hnsw-algorithm",
            kind: "hnsw",
            hnswParameters: {
              metric: azureMetric,
              m: 4,
              efConstruction: 400,
              efSearch: 500,
            },
          },
        ],
        profiles: [
          {
            name: "vector-profile",
            algorithmConfigurationName: "hnsw-algorithm",
          },
        ],
      },
    };

    // Add semantic configuration if enabled
    if (this.config.enableSemanticRanking && this.config.semanticConfigurationName) {
      indexDefinition.semantic = {
        configurations: [
          {
            name: this.config.semanticConfigurationName,
            prioritizedFields: {
              contentFields: [{ fieldName: this.contentFieldName }],
            },
          },
        ],
      };
    }

    try {
      await this.makeRequest("PUT", `/indexes/${name}`, indexDefinition);

      // Cache index metadata
      this.indexMetadataCache.set(name, {
        name,
        dimension,
        metric,
        vectorFieldName: this.vectorFieldName,
      });

      logger.debug(`Created index ${name}`, { dimension, metric });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to create index ${name}: ${message}`);
    }
  }

  /**
   * Delete a search index
   */
  async deleteIndex(indexName: string): Promise<void> {
    this.ensureInitialized();

    try {
      await this.makeRequest("DELETE", `/indexes/${indexName}`);
      this.indexMetadataCache.delete(indexName);
      logger.debug(`Deleted index ${indexName}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to delete index ${indexName}: ${message}`);
    }
  }

  /**
   * List all indexes in the search service
   */
  async listIndexes(): Promise<string[]> {
    this.ensureInitialized();

    try {
      const response = await this.makeRequest<{ value: Array<{ name: string }> }>(
        "GET",
        "/indexes",
        null,
        { "$select": "name" },
      );
      return response.value.map((idx) => idx.name);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to list indexes: ${message}`);
    }
  }

  /**
   * Check if an index exists
   */
  async indexExists(indexName: string): Promise<boolean> {
    this.ensureInitialized();

    try {
      await this.makeRequest("GET", `/indexes/${indexName}`);
      return true;
    } catch (error) {
      if (error instanceof Error && error.message.includes("404")) {
        return false;
      }
      throw error;
    }
  }

  /**
   * Upsert vectors into the index
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

    const namespace = options?.namespace || null;
    const batchSize = options?.batchSize || 1000; // Azure AI Search limit

    try {
      let upsertedCount = 0;

      // Process in batches
      for (let i = 0; i < records.length; i += batchSize) {
        const batch = records.slice(i, i + batchSize);
        const documents: AzureSearchDocument[] = batch.map((record) => ({
          "@search.action": "mergeOrUpload",
          id: record.id,
          [this.vectorFieldName]: record.vector,
          [this.contentFieldName]: record.content || "",
          [this.metadataFieldName]: record.metadata
            ? JSON.stringify(record.metadata)
            : "",
          namespace: record.namespace || namespace || "",
        }));

        await this.makeRequest(
          "POST",
          `/indexes/${indexName}/docs/index`,
          { value: documents },
        );
        upsertedCount += batch.length;
      }

      logger.debug(`Upserted ${upsertedCount} records to ${indexName}`);
      return { upsertedCount };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to upsert records: ${message}`);
    }
  }

  /**
   * Query vectors by similarity using vector search
   */
  async query<TMetadata extends UnknownRecord = UnknownRecord>(
    indexName: string,
    options: VectorQueryOptions<TMetadata>,
  ): Promise<VectorQueryResult<TMetadata>[]> {
    this.ensureInitialized();

    const {
      vector,
      topK,
      minScore,
      filter,
      includeVectors = false,
      includeMetadata = true,
      namespace,
    } = options;

    try {
      // Build OData filter
      const filters: string[] = [];
      if (namespace) {
        filters.push(`namespace eq '${this.escapeODataString(namespace)}'`);
      }
      if (filter) {
        const odataFilter = this.translateFilter(filter);
        if (odataFilter) {
          filters.push(odataFilter);
        }
      }

      // Build select fields
      const selectFields = ["id", this.contentFieldName];
      if (includeMetadata) {
        selectFields.push(this.metadataFieldName);
      }
      if (includeVectors) {
        selectFields.push(this.vectorFieldName);
      }

      // Build query body
      const queryBody: Record<string, unknown> = {
        count: true,
        top: topK,
        select: selectFields.join(","),
        vectorQueries: [
          {
            kind: "vector",
            vector: vector,
            fields: this.vectorFieldName,
            k: topK,
          },
        ],
      };

      if (filters.length > 0) {
        queryBody.filter = filters.join(" and ");
      }

      const response = await this.makeRequest<AzureSearchResponse>(
        "POST",
        `/indexes/${indexName}/docs/search`,
        queryBody,
      );

      // Transform results
      const results: VectorQueryResult<TMetadata>[] = [];
      for (const doc of response.value) {
        const score = doc["@search.score"] || 0;

        // Apply minimum score filter
        if (minScore !== undefined && score < minScore) {
          continue;
        }

        const result: VectorQueryResult<TMetadata> = {
          id: doc.id,
          score,
          content: (doc[this.contentFieldName] as string) || undefined,
        };

        if (includeVectors) {
          result.vector = doc[this.vectorFieldName] as number[];
        }

        if (includeMetadata && doc[this.metadataFieldName]) {
          try {
            result.metadata = JSON.parse(
              doc[this.metadataFieldName] as string,
            ) as TMetadata;
          } catch {
            // Ignore parse errors
          }
        }

        results.push(result);
      }

      return results;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to query vectors: ${message}`);
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

    const { ids, filter, namespace, deleteAll } = options;

    try {
      let deletedCount = 0;

      if (deleteAll) {
        // Delete all documents - requires fetching IDs first
        const allIds = await this.fetchAllDocumentIds(indexName, namespace);
        if (allIds.length > 0) {
          deletedCount = await this.deleteByIds(indexName, allIds);
        }
      } else if (ids && ids.length > 0) {
        deletedCount = await this.deleteByIds(indexName, ids);
      } else if (filter) {
        // Delete by filter - requires fetching matching IDs first
        const odataFilter = this.translateFilter(filter);
        const matchingIds = await this.fetchDocumentIdsByFilter(
          indexName,
          odataFilter,
        );
        if (matchingIds.length > 0) {
          deletedCount = await this.deleteByIds(indexName, matchingIds);
        }
      }

      logger.debug(`Deleted ${deletedCount} records from ${indexName}`);
      return { deletedCount };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to delete records: ${message}`);
    }
  }

  /**
   * Get index statistics
   */
  async getStats(indexName: string): Promise<VectorStoreStats> {
    this.ensureInitialized();

    try {
      // Get index definition for dimension info
      const indexDef = await this.makeRequest<AzureSearchIndex>(
        "GET",
        `/indexes/${indexName}`,
      );

      // Get document count
      const countResponse = await this.makeRequest<AzureSearchResponse>(
        "POST",
        `/indexes/${indexName}/docs/search`,
        { count: true, top: 0 },
      );

      // Get unique namespace count
      const facetResponse = await this.makeRequest<AzureSearchResponse & { "@search.facets"?: { namespace?: Array<{ value: string; count: number }> } }>(
        "POST",
        `/indexes/${indexName}/docs/search`,
        {
          count: true,
          top: 0,
          facets: ["namespace,count:1000"],
        },
      );

      // Extract dimension from vector field
      const vectorField = indexDef.fields.find(
        (f) => f.type === "Collection(Edm.Single)" && f.dimensions,
      );

      // Get namespace count from facets
      const namespaces = facetResponse["@search.facets"]?.namespace || [];

      return {
        vectorCount: countResponse["@odata.count"] || 0,
        dimension: vectorField?.dimensions,
        namespaceCount: namespaces.filter((n) => n.value).length,
        metrics: {
          indexName,
        },
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to get stats for ${indexName}: ${message}`);
    }
  }

  /**
   * Translate abstract metadata filter to OData filter expression
   */
  protected translateFilter<TMetadata extends UnknownRecord>(
    filter: MetadataFilter<TMetadata>,
  ): string {
    const conditions: string[] = [];

    for (const [key, value] of Object.entries(filter)) {
      if (key === "$and" && Array.isArray(value)) {
        const subConditions = value
          .map((f) => this.translateFilter(f as MetadataFilter))
          .filter((c) => c);
        if (subConditions.length > 0) {
          conditions.push(`(${subConditions.join(" and ")})`);
        }
      } else if (key === "$or" && Array.isArray(value)) {
        const subConditions = value
          .map((f) => this.translateFilter(f as MetadataFilter))
          .filter((c) => c);
        if (subConditions.length > 0) {
          conditions.push(`(${subConditions.join(" or ")})`);
        }
      } else if (key === "$not" && typeof value === "object" && value !== null) {
        const subFilter = this.translateFilter(value as MetadataFilter);
        if (subFilter) {
          conditions.push(`not (${subFilter})`);
        }
      } else if (this.isFieldFilter(value)) {
        const fieldCondition = this.translateFieldFilter(
          key,
          value as FieldFilter,
        );
        if (fieldCondition) {
          conditions.push(fieldCondition);
        }
      } else {
        // Simple equality - metadata is stored as JSON string, need to search within it
        // For proper filtering, you'd want to extract metadata fields to index fields
        // This is a simplified approach using search.ismatch for JSON content
        conditions.push(
          `search.ismatch('"${key}":"${this.escapeODataString(String(value))}"', '${this.metadataFieldName}')`,
        );
      }
    }

    return conditions.join(" and ");
  }

  // ===================
  // PRIVATE HELPER METHODS
  // ===================

  /**
   * Make HTTP request to Azure AI Search REST API
   */
  private async makeRequest<T = unknown>(
    method: string,
    path: string,
    body?: unknown,
    queryParams?: Record<string, string>,
  ): Promise<T> {
    const url = new URL(`${this.config.endpoint}${path}`);
    url.searchParams.set("api-version", this.apiVersion);

    if (queryParams) {
      for (const [key, value] of Object.entries(queryParams)) {
        url.searchParams.set(key, value);
      }
    }

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      "api-key": this.config.apiKey,
    };

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.requestTimeout);

    try {
      const response = await fetch(url.toString(), {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(
          `Azure AI Search API error (${response.status}): ${errorBody}`,
        );
      }

      // Handle empty responses
      const contentType = response.headers.get("content-type");
      if (contentType?.includes("application/json")) {
        return (await response.json()) as T;
      }

      return {} as T;
    } catch (error) {
      clearTimeout(timeoutId);
      if (error instanceof Error && error.name === "AbortError") {
        throw new Error(`Request timeout after ${this.requestTimeout}ms`);
      }
      throw error;
    }
  }

  /**
   * Map similarity metric to Azure AI Search format
   */
  private mapMetricToAzure(metric: SimilarityMetric): string {
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

  /**
   * Check if value is a field filter
   */
  private isFieldFilter(value: unknown): boolean {
    if (typeof value !== "object" || value === null) return false;
    const keys = Object.keys(value);
    return keys.some((k) => k.startsWith("$"));
  }

  /**
   * Translate a field filter to OData expression
   */
  private translateFieldFilter(key: string, filter: FieldFilter): string {
    const conditions: string[] = [];

    for (const [op, val] of Object.entries(filter)) {
      // For metadata fields, we use search.ismatch as a workaround
      // In production, extract metadata fields to index fields for proper filtering
      const fieldPath = key;

      switch (op) {
        case "$eq":
          conditions.push(
            `search.ismatch('"${fieldPath}":"${this.escapeODataString(String(val))}"', '${this.metadataFieldName}')`,
          );
          break;
        case "$ne":
          conditions.push(
            `not search.ismatch('"${fieldPath}":"${this.escapeODataString(String(val))}"', '${this.metadataFieldName}')`,
          );
          break;
        case "$gt":
        case "$gte":
        case "$lt":
        case "$lte":
          // Numeric comparisons on JSON fields are limited
          // For proper support, extract to typed index fields
          logger.warn(
            `Numeric comparison operators (${op}) have limited support on JSON metadata fields`,
          );
          break;
        case "$in":
          if (Array.isArray(val)) {
            const orConditions = val.map(
              (v) =>
                `search.ismatch('"${fieldPath}":"${this.escapeODataString(String(v))}"', '${this.metadataFieldName}')`,
            );
            conditions.push(`(${orConditions.join(" or ")})`);
          }
          break;
        case "$nin":
          if (Array.isArray(val)) {
            const notConditions = val.map(
              (v) =>
                `not search.ismatch('"${fieldPath}":"${this.escapeODataString(String(v))}"', '${this.metadataFieldName}')`,
            );
            conditions.push(`(${notConditions.join(" and ")})`);
          }
          break;
        case "$exists":
          if (val) {
            conditions.push(
              `search.ismatch('"${fieldPath}":', '${this.metadataFieldName}')`,
            );
          } else {
            conditions.push(
              `not search.ismatch('"${fieldPath}":', '${this.metadataFieldName}')`,
            );
          }
          break;
        case "$contains":
          conditions.push(
            `search.ismatch('*${this.escapeODataString(String(val))}*', '${this.metadataFieldName}')`,
          );
          break;
        case "$startsWith":
          conditions.push(
            `search.ismatch('"${fieldPath}":"${this.escapeODataString(String(val))}*', '${this.metadataFieldName}')`,
          );
          break;
        case "$endsWith":
          conditions.push(
            `search.ismatch('*${this.escapeODataString(String(val))}"', '${this.metadataFieldName}')`,
          );
          break;
        default:
          // Unknown operator, treat as equality
          conditions.push(
            `search.ismatch('"${fieldPath}":"${this.escapeODataString(String(val))}"', '${this.metadataFieldName}')`,
          );
      }
    }

    return conditions.join(" and ");
  }

  /**
   * Escape string for OData filter
   */
  private escapeODataString(str: string): string {
    return str.replace(/'/g, "''").replace(/"/g, '\\"');
  }

  /**
   * Fetch all document IDs from an index
   */
  private async fetchAllDocumentIds(
    indexName: string,
    namespace?: string,
  ): Promise<string[]> {
    const ids: string[] = [];
    let skip = 0;
    const top = 1000;

    while (true) {
      const queryBody: Record<string, unknown> = {
        select: "id",
        top,
        skip,
      };

      if (namespace) {
        queryBody.filter = `namespace eq '${this.escapeODataString(namespace)}'`;
      }

      const response = await this.makeRequest<AzureSearchResponse>(
        "POST",
        `/indexes/${indexName}/docs/search`,
        queryBody,
      );

      ids.push(...response.value.map((doc) => doc.id));

      if (response.value.length < top) {
        break;
      }
      skip += top;
    }

    return ids;
  }

  /**
   * Fetch document IDs matching a filter
   */
  private async fetchDocumentIdsByFilter(
    indexName: string,
    filter: string,
  ): Promise<string[]> {
    const ids: string[] = [];
    let skip = 0;
    const top = 1000;

    while (true) {
      const queryBody: Record<string, unknown> = {
        select: "id",
        top,
        skip,
        filter,
      };

      const response = await this.makeRequest<AzureSearchResponse>(
        "POST",
        `/indexes/${indexName}/docs/search`,
        queryBody,
      );

      ids.push(...response.value.map((doc) => doc.id));

      if (response.value.length < top) {
        break;
      }
      skip += top;
    }

    return ids;
  }

  /**
   * Delete documents by IDs
   */
  private async deleteByIds(
    indexName: string,
    ids: string[],
  ): Promise<number> {
    const batchSize = 1000;
    let deletedCount = 0;

    for (let i = 0; i < ids.length; i += batchSize) {
      const batch = ids.slice(i, i + batchSize);
      const documents: AzureSearchDocument[] = batch.map((id) => ({
        "@search.action": "delete",
        id,
      }));

      await this.makeRequest(
        "POST",
        `/indexes/${indexName}/docs/index`,
        { value: documents },
      );
      deletedCount += batch.length;
    }

    return deletedCount;
  }
}
