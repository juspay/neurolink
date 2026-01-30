/**
 * Google Vertex AI Vector Search Adapter
 * Implements vector similarity search using Google Cloud's Matching Engine
 *
 * Vertex AI Vector Search (formerly Matching Engine) provides:
 * - High-performance approximate nearest neighbor (ANN) search
 * - Supports streaming and batch updates
 * - Index deployment to endpoints for serving
 * - Metadata filtering with restrict/allow lists
 *
 * @see https://cloud.google.com/vertex-ai/docs/vector-search/overview
 */

import type { UnknownRecord } from "../../types/common.js";
import { logger } from "../../utils/logger.js";
import { BaseVectorStore } from "../BaseVectorStore.js";
import {
  VectorStoreName,
  type VectorRecord,
  type VectorQueryResult,
  type VectorIndexConfig,
  type VectorQueryOptions,
  type VectorUpsertOptions,
  type VectorDeleteOptions,
  type VectorStoreStats,
  type VectorStoreConfig,
  type MetadataFilter,
  type FieldFilter,
  type SimilarityMetric,
} from "../types.js";

/**
 * Vertex AI Vector Search configuration
 */
export type VertexVectorSearchConfig = VectorStoreConfig & {
  /** Google Cloud project ID */
  projectId: string;
  /** Google Cloud region (e.g., "us-central1") */
  location: string;
  /** Index endpoint ID for deployed indexes */
  indexEndpointId?: string;
  /** Default index ID */
  indexId?: string;
  /** API endpoint override (optional) */
  apiEndpoint?: string;
  /** Service account key file path (optional, uses default credentials if not provided) */
  keyFilePath?: string;
  /** Service account credentials JSON (optional) */
  credentials?: Record<string, unknown>;
  /** Request timeout in ms (default: 60000) */
  requestTimeout?: number;
  /** Enable streaming updates (default: false) */
  streamingUpdates?: boolean;
  /** Batch size for streaming operations (default: 100) */
  streamingBatchSize?: number;
};

/**
 * Index metadata stored for tracking
 */
interface VertexIndexMetadata {
  name: string;
  indexId: string;
  deployedIndexId?: string;
  dimension: number;
  metric: SimilarityMetric;
  createdAt: string;
}

/**
 * Vertex AI nearest neighbor response
 */
interface NearestNeighbor {
  datapoint: {
    datapointId: string;
    featureVector?: number[];
    restricts?: Array<{
      namespace: string;
      allowList?: string[];
      denyList?: string[];
    }>;
    numericRestricts?: Array<{
      namespace: string;
      valueInt?: string;
      valueFloat?: number;
      valueDouble?: number;
      op?: string;
    }>;
    crowdingTag?: {
      crowdingAttribute: string;
    };
  };
  distance: number;
}

/**
 * Vertex AI datapoint for upsert
 */
interface VertexDatapoint {
  datapointId: string;
  featureVector: number[];
  restricts?: Array<{
    namespace: string;
    allowList?: string[];
    denyList?: string[];
  }>;
  numericRestricts?: Array<{
    namespace: string;
    valueInt?: string;
    valueFloat?: number;
    valueDouble?: number;
  }>;
  crowdingTag?: {
    crowdingAttribute: string;
  };
}

/**
 * Internal interface for Vertex AI Index Endpoint Service client
 */
interface VertexIndexEndpointClient {
  findNeighbors(
    request: unknown,
    options?: { timeout?: number },
  ): Promise<[{ nearestNeighbors?: Array<{ neighbors?: NearestNeighbor[] }> }]>;
  readIndexDatapoints(
    request: unknown,
    options?: { timeout?: number },
  ): Promise<[{ datapoints?: VertexDatapoint[] }]>;
  close(): Promise<void>;
}

/**
 * Internal interface for Vertex AI Index Service client
 */
interface VertexIndexClient {
  createIndex(
    request: unknown,
    options?: { timeout?: number },
  ): Promise<[{ name: string }, unknown, unknown]>;
  deleteIndex(
    request: unknown,
    options?: { timeout?: number },
  ): Promise<[unknown]>;
  getIndex(
    request: unknown,
    options?: { timeout?: number },
  ): Promise<
    [{ name: string; metadata?: { config?: { dimensions?: number } } }]
  >;
  listIndexes(
    request: unknown,
    options?: { timeout?: number },
  ): AsyncIterable<{ name: string }>;
  upsertDatapoints(
    request: unknown,
    options?: { timeout?: number },
  ): Promise<[unknown]>;
  removeDatapoints(
    request: unknown,
    options?: { timeout?: number },
  ): Promise<[unknown]>;
  close(): Promise<void>;
}

/**
 * Google Vertex AI Vector Search Adapter
 *
 * Features:
 * - High-performance ANN search with Matching Engine
 * - Supports cosine, euclidean (L2), and dot product metrics
 * - Metadata filtering via restricts and numeric restricts
 * - Streaming and batch upsert operations
 * - Index deployment management
 *
 * Prerequisites:
 * - Google Cloud project with Vertex AI API enabled
 * - Index created and deployed to an endpoint
 * - @google-cloud/aiplatform package installed
 *
 * Note: This adapter requires indexes to be pre-deployed to endpoints.
 * Use the Google Cloud Console or gcloud CLI to create and deploy indexes.
 */
export class VertexVectorSearchAdapter extends BaseVectorStore<VertexVectorSearchConfig> {
  private indexEndpointClient: VertexIndexEndpointClient | null = null;
  private indexClient: VertexIndexClient | null = null;
  private indexMetadataCache: Map<string, VertexIndexMetadata> = new Map();
  private metadataStore: Map<string, Map<string, unknown>> = new Map();

  constructor(config: VertexVectorSearchConfig) {
    super(config, VectorStoreName.VERTEX_VECTOR);
  }

  /**
   * Initialize connection to Vertex AI Vector Search
   */
  async connect(): Promise<void> {
    if (this.initialized) {
      logger.debug("Vertex AI Vector Search already connected");
      return;
    }

    try {
      const { IndexServiceClient, IndexEndpointServiceClient } =
        await this.loadVertexAIClient();

      const clientOptions: Record<string, unknown> = {};

      if (this.config.apiEndpoint) {
        clientOptions.apiEndpoint = this.config.apiEndpoint;
      } else {
        clientOptions.apiEndpoint = `${this.config.location}-aiplatform.googleapis.com`;
      }

      if (this.config.keyFilePath) {
        clientOptions.keyFilename = this.config.keyFilePath;
      } else if (this.config.credentials) {
        clientOptions.credentials = this.config.credentials;
      }

      // Initialize index service client for management operations
      this.indexClient = new IndexServiceClient(
        clientOptions,
      ) as VertexIndexClient;

      // Initialize index endpoint client for query operations
      this.indexEndpointClient = new IndexEndpointServiceClient(
        clientOptions,
      ) as VertexIndexEndpointClient;

      this.initialized = true;
      logger.debug("Vertex AI Vector Search connected", {
        project: this.config.projectId,
        location: this.config.location,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(
        `Failed to connect to Vertex AI Vector Search: ${message}`,
      );
    }
  }

  /**
   * Close connections to Vertex AI
   */
  async disconnect(): Promise<void> {
    try {
      if (this.indexClient) {
        await this.indexClient.close();
        this.indexClient = null;
      }
      if (this.indexEndpointClient) {
        await this.indexEndpointClient.close();
        this.indexEndpointClient = null;
      }
      this.initialized = false;
      this.indexMetadataCache.clear();
      this.metadataStore.clear();
      logger.debug("Vertex AI Vector Search disconnected");
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(
        `Failed to disconnect from Vertex AI Vector Search: ${message}`,
      );
    }
  }

  /**
   * Create a new vector index
   * Note: This creates the index but does not deploy it to an endpoint.
   * Deployment must be done separately via Google Cloud Console or gcloud CLI.
   */
  async createIndex(config: VectorIndexConfig): Promise<void> {
    this.ensureInitialized();

    const { name, dimension, metric = "cosine" } = config;
    const vertexMetric = this.mapMetricToVertex(metric);

    try {
      const parent = `projects/${this.config.projectId}/locations/${this.config.location}`;

      const indexConfig = {
        parent,
        index: {
          displayName: name,
          description: `NeuroLink vector index: ${name}`,
          metadata: {
            contentsDeltaUri: "", // Placeholder - actual URI needed for production
            config: {
              dimensions: dimension,
              approximateNeighborsCount: 100,
              distanceMeasureType: vertexMetric,
              algorithmConfig: {
                treeAhConfig: {
                  leafNodeEmbeddingCount: 1000,
                  leafNodesToSearchPercent: 10,
                },
              },
            },
          },
          indexUpdateMethod: "STREAM_UPDATE",
        },
      };

      const [operation] = await this.indexClient!.createIndex(indexConfig, {
        timeout: this.config.requestTimeout || 60000,
      });

      // Extract index ID from the operation name
      const indexId = operation.name.split("/").pop() || name;

      // Store metadata locally
      const metadata: VertexIndexMetadata = {
        name,
        indexId,
        dimension,
        metric,
        createdAt: new Date().toISOString(),
      };
      this.indexMetadataCache.set(name, metadata);

      // Initialize metadata store for this index
      this.metadataStore.set(name, new Map());

      logger.debug(`Created Vertex AI index ${name}`, {
        indexId,
        dimension,
        metric: vertexMetric,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to create index ${name}: ${message}`);
    }
  }

  /**
   * Delete an index
   */
  async deleteIndex(indexName: string): Promise<void> {
    this.ensureInitialized();

    try {
      const metadata = this.indexMetadataCache.get(indexName);
      if (!metadata) {
        // Try to find the index by listing
        const indexId = await this.findIndexIdByName(indexName);
        if (!indexId) {
          logger.warn(`Index ${indexName} not found, skipping delete`);
          return;
        }
        metadata!.indexId = indexId;
      }

      const indexPath = `projects/${this.config.projectId}/locations/${this.config.location}/indexes/${metadata?.indexId || indexName}`;

      await this.indexClient!.deleteIndex(
        { name: indexPath },
        { timeout: this.config.requestTimeout || 60000 },
      );

      this.indexMetadataCache.delete(indexName);
      this.metadataStore.delete(indexName);

      logger.debug(`Deleted Vertex AI index ${indexName}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to delete index ${indexName}: ${message}`);
    }
  }

  /**
   * List all indexes
   */
  async listIndexes(): Promise<string[]> {
    this.ensureInitialized();

    try {
      const parent = `projects/${this.config.projectId}/locations/${this.config.location}`;
      const indexes: string[] = [];

      const iterable = this.indexClient!.listIndexes({ parent });
      for await (const index of iterable) {
        // Extract display name from the index
        const name = index.name?.split("/").pop() || "";
        indexes.push(name);
      }

      return indexes;
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
      // Check local cache first
      if (this.indexMetadataCache.has(indexName)) {
        return true;
      }

      // Try to find by listing indexes
      const indexId = await this.findIndexIdByName(indexName);
      return indexId !== null;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to check index existence: ${message}`);
    }
  }

  /**
   * Upsert vectors into the index
   * Uses streaming updates if enabled, otherwise batch upsert
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

    try {
      const metadata = this.indexMetadataCache.get(indexName);
      const indexId =
        metadata?.indexId ||
        (await this.findIndexIdByName(indexName)) ||
        indexName;
      const indexPath = `projects/${this.config.projectId}/locations/${this.config.location}/indexes/${indexId}`;

      // Convert records to Vertex datapoints
      const datapoints: VertexDatapoint[] = records.map((record) =>
        this.recordToDatapoint(record, options?.namespace),
      );

      // Store metadata locally (Vertex AI doesn't store arbitrary metadata)
      const metadataMap = this.metadataStore.get(indexName) || new Map();
      for (const record of records) {
        const ns = record.namespace || options?.namespace;
        if (record.metadata || record.content || ns) {
          metadataMap.set(record.id, {
            metadata: record.metadata,
            content: record.content,
            namespace: ns,
          });
        }
      }
      this.metadataStore.set(indexName, metadataMap);

      // Use streaming batch size if streaming is enabled
      const batchSize = this.config.streamingUpdates
        ? this.config.streamingBatchSize || 100
        : options?.batchSize || 100;

      let upsertedCount = 0;

      for (let i = 0; i < datapoints.length; i += batchSize) {
        const batch = datapoints.slice(i, i + batchSize);

        await this.indexClient!.upsertDatapoints(
          {
            index: indexPath,
            datapoints: batch,
          },
          { timeout: this.config.requestTimeout || 60000 },
        );

        upsertedCount += batch.length;
        logger.debug(`Upserted batch ${Math.floor(i / batchSize) + 1}`, {
          count: batch.length,
          total: datapoints.length,
        });
      }

      logger.debug(`Upserted ${upsertedCount} records to ${indexName}`);
      return { upsertedCount };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to upsert records: ${message}`);
    }
  }

  /**
   * Query vectors by similarity
   * Requires the index to be deployed to an endpoint
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
      if (!this.config.indexEndpointId) {
        throw new Error(
          "indexEndpointId is required for query operations. " +
            "Deploy the index to an endpoint first.",
        );
      }

      const metadata = this.indexMetadataCache.get(indexName);
      const deployedIndexId = metadata?.deployedIndexId || indexName;

      const indexEndpointPath = `projects/${this.config.projectId}/locations/${this.config.location}/indexEndpoints/${this.config.indexEndpointId}`;

      // Build the query with restricts for filtering
      const query: {
        datapoint: {
          datapointId: string;
          featureVector: number[];
          restricts?: Array<{ namespace: string; allowList?: string[] }>;
          numericRestricts?: Array<{
            namespace: string;
            valueInt?: string;
            valueFloat?: number;
            op?: string;
          }>;
        };
        neighborCount: number;
      } = {
        datapoint: {
          datapointId: "query",
          featureVector: vector,
        },
        neighborCount: topK,
      };

      // Add namespace as a restrict if provided
      if (namespace) {
        query.datapoint.restricts = [
          {
            namespace: "_namespace",
            allowList: [namespace],
          },
        ];
      }

      // Apply metadata filters as restricts
      if (filter) {
        const { restricts, numericRestricts } = this.translateFilter(filter);
        if (restricts.length > 0) {
          query.datapoint.restricts = [
            ...(query.datapoint.restricts || []),
            ...restricts,
          ];
        }
        if (numericRestricts.length > 0) {
          query.datapoint.numericRestricts = numericRestricts;
        }
      }

      const [response] = await this.indexEndpointClient!.findNeighbors(
        {
          indexEndpoint: indexEndpointPath,
          deployedIndexId,
          queries: [query],
          returnFullDatapoint: includeVectors,
        },
        { timeout: this.config.requestTimeout || 60000 },
      );

      const results: VectorQueryResult<TMetadata>[] = [];
      const neighbors = response.nearestNeighbors?.[0]?.neighbors || [];
      const metadataMap = this.metadataStore.get(indexName);

      for (const neighbor of neighbors) {
        const score = this.distanceToScore(neighbor.distance);

        // Apply minimum score filter
        if (minScore !== undefined && score < minScore) {
          continue;
        }

        const result: VectorQueryResult<TMetadata> = {
          id: neighbor.datapoint.datapointId,
          score,
        };

        if (includeVectors && neighbor.datapoint.featureVector) {
          result.vector = neighbor.datapoint.featureVector;
        }

        // Retrieve stored metadata
        if (includeMetadata && metadataMap) {
          const stored = metadataMap.get(neighbor.datapoint.datapointId) as
            | { metadata?: TMetadata; content?: string }
            | undefined;
          if (stored) {
            result.metadata = stored.metadata;
            result.content = stored.content;
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
      const metadata = this.indexMetadataCache.get(indexName);
      const indexId =
        metadata?.indexId ||
        (await this.findIndexIdByName(indexName)) ||
        indexName;
      const indexPath = `projects/${this.config.projectId}/locations/${this.config.location}/indexes/${indexId}`;

      let datapointIds: string[] = [];

      if (deleteAll) {
        // Get all IDs from metadata store
        const metadataMap = this.metadataStore.get(indexName);
        if (metadataMap) {
          datapointIds = Array.from(metadataMap.keys());
          if (namespace) {
            // Filter by namespace
            datapointIds = datapointIds.filter((id) => {
              const stored = metadataMap.get(id) as
                | { namespace?: string }
                | undefined;
              return stored?.namespace === namespace;
            });
          }
        }
      } else if (ids && ids.length > 0) {
        datapointIds = ids;
      } else if (filter) {
        // For filter-based delete, we need to query first to get matching IDs
        // This is a limitation of Vertex AI's delete API
        const metadataMap = this.metadataStore.get(indexName);
        if (metadataMap) {
          datapointIds = this.filterMetadataLocally(
            metadataMap,
            filter,
            namespace,
          );
        }
      }

      if (datapointIds.length === 0) {
        return { deletedCount: 0 };
      }

      // Batch delete
      const batchSize = 100;
      let deletedCount = 0;

      for (let i = 0; i < datapointIds.length; i += batchSize) {
        const batch = datapointIds.slice(i, i + batchSize);

        await this.indexClient!.removeDatapoints(
          {
            index: indexPath,
            datapointIds: batch,
          },
          { timeout: this.config.requestTimeout || 60000 },
        );

        // Remove from local metadata store
        const metadataMap = this.metadataStore.get(indexName);
        if (metadataMap) {
          for (const id of batch) {
            metadataMap.delete(id);
          }
        }

        deletedCount += batch.length;
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
      const metadata = this.indexMetadataCache.get(indexName);
      const indexId =
        metadata?.indexId ||
        (await this.findIndexIdByName(indexName)) ||
        indexName;
      const indexPath = `projects/${this.config.projectId}/locations/${this.config.location}/indexes/${indexId}`;

      const [index] = await this.indexClient!.getIndex(
        { name: indexPath },
        { timeout: this.config.requestTimeout || 60000 },
      );

      // Get vector count from local metadata store (Vertex AI doesn't expose this directly)
      const metadataMap = this.metadataStore.get(indexName);
      const vectorCount = metadataMap?.size || 0;

      // Get unique namespaces
      const namespaces = new Set<string>();
      if (metadataMap) {
        const values = Array.from(metadataMap.values());
        for (const stored of values) {
          const ns = (stored as { namespace?: string })?.namespace;
          if (ns) {
            namespaces.add(ns);
          }
        }
      }

      return {
        vectorCount,
        dimension: index.metadata?.config?.dimensions || metadata?.dimension,
        namespaceCount: namespaces.size,
        metrics: {
          metric: metadata?.metric || "cosine",
          indexId: indexId,
          hasDeployedIndex: !!metadata?.deployedIndexId,
        },
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to get stats for ${indexName}: ${message}`);
    }
  }

  /**
   * Translate abstract filter to Vertex AI restricts format
   */
  protected translateFilter<TMetadata extends UnknownRecord>(
    filter: MetadataFilter<TMetadata>,
  ): {
    restricts: Array<{
      namespace: string;
      allowList?: string[];
      denyList?: string[];
    }>;
    numericRestricts: Array<{
      namespace: string;
      valueInt?: string;
      valueFloat?: number;
      op?: string;
    }>;
  } {
    const restricts: Array<{
      namespace: string;
      allowList?: string[];
      denyList?: string[];
    }> = [];
    const numericRestricts: Array<{
      namespace: string;
      valueInt?: string;
      valueFloat?: number;
      op?: string;
    }> = [];

    for (const [key, value] of Object.entries(filter)) {
      if (key.startsWith("$")) {
        // Logical operators - process recursively
        if (key === "$and" && Array.isArray(value)) {
          for (const subFilter of value) {
            const subResult = this.translateFilter(
              subFilter as MetadataFilter<TMetadata>,
            );
            restricts.push(...subResult.restricts);
            numericRestricts.push(...subResult.numericRestricts);
          }
        } else if (key === "$or" || key === "$not") {
          // Vertex AI has limited support for OR and NOT in restricts
          // We handle these through local filtering after the query
          logger.warn(
            `Vertex AI has limited support for ${key} operator, results may be filtered locally`,
          );
        }
        continue;
      }

      if (this.isFieldFilter(value)) {
        // Field filter with operators
        const fieldFilter = value as FieldFilter;
        this.translateFieldFilter(
          key,
          fieldFilter,
          restricts,
          numericRestricts,
        );
      } else if (typeof value === "string") {
        // Simple string equality -> allowList
        restricts.push({
          namespace: key,
          allowList: [value],
        });
      } else if (typeof value === "number") {
        // Simple numeric equality
        if (Number.isInteger(value)) {
          numericRestricts.push({
            namespace: key,
            valueInt: String(value),
            op: "EQUAL",
          });
        } else {
          numericRestricts.push({
            namespace: key,
            valueFloat: value,
            op: "EQUAL",
          });
        }
      } else if (typeof value === "boolean") {
        // Boolean as string
        restricts.push({
          namespace: key,
          allowList: [String(value)],
        });
      }
    }

    return { restricts, numericRestricts };
  }

  // ===================
  // PRIVATE HELPER METHODS
  // ===================

  /**
   * Load Vertex AI client dynamically
   */
  private async loadVertexAIClient(): Promise<{
    IndexServiceClient: new (
      options: Record<string, unknown>,
    ) => VertexIndexClient;
    IndexEndpointServiceClient: new (
      options: Record<string, unknown>,
    ) => VertexIndexEndpointClient;
  }> {
    try {
      const modulePath = "@google-cloud/aiplatform";
      const module = await import(/* @vite-ignore */ modulePath);
      return {
        IndexServiceClient: module.IndexServiceClient,
        IndexEndpointServiceClient: module.IndexEndpointServiceClient,
      };
    } catch {
      throw new Error(
        "Vertex AI client not found. Install @google-cloud/aiplatform: " +
          "npm install @google-cloud/aiplatform",
      );
    }
  }

  /**
   * Map similarity metric to Vertex AI distance measure
   */
  private mapMetricToVertex(
    metric: SimilarityMetric,
  ): "DOT_PRODUCT_DISTANCE" | "SQUARED_L2_DISTANCE" | "COSINE_DISTANCE" {
    switch (metric) {
      case "dotProduct":
        return "DOT_PRODUCT_DISTANCE";
      case "euclidean":
        return "SQUARED_L2_DISTANCE";
      case "cosine":
      default:
        return "COSINE_DISTANCE";
    }
  }

  /**
   * Convert Vertex distance to similarity score
   * For cosine and L2, lower distance = more similar
   */
  private distanceToScore(distance: number): number {
    // Cosine distance is 1 - cosine_similarity, so we convert back
    // For L2, we use 1 / (1 + distance) to normalize
    // For dot product, higher is better (negated distance)
    return 1 - distance;
  }

  /**
   * Convert VectorRecord to Vertex Datapoint
   */
  private recordToDatapoint<TMetadata extends UnknownRecord>(
    record: VectorRecord<TMetadata>,
    namespace?: string,
  ): VertexDatapoint {
    const datapoint: VertexDatapoint = {
      datapointId: record.id,
      featureVector: record.vector,
    };

    const restricts: Array<{
      namespace: string;
      allowList?: string[];
    }> = [];

    // Add namespace as a restrict
    const ns = record.namespace || namespace;
    if (ns) {
      restricts.push({
        namespace: "_namespace",
        allowList: [ns],
      });
    }

    // Convert string metadata to restricts
    if (record.metadata) {
      for (const [key, value] of Object.entries(record.metadata)) {
        if (typeof value === "string") {
          restricts.push({
            namespace: key,
            allowList: [value],
          });
        } else if (typeof value === "boolean") {
          restricts.push({
            namespace: key,
            allowList: [String(value)],
          });
        }
        // Numeric values are handled separately via numericRestricts
      }
    }

    if (restricts.length > 0) {
      datapoint.restricts = restricts;
    }

    // Handle numeric metadata
    const numericRestricts: Array<{
      namespace: string;
      valueInt?: string;
      valueFloat?: number;
    }> = [];

    if (record.metadata) {
      for (const [key, value] of Object.entries(record.metadata)) {
        if (typeof value === "number") {
          if (Number.isInteger(value)) {
            numericRestricts.push({
              namespace: key,
              valueInt: String(value),
            });
          } else {
            numericRestricts.push({
              namespace: key,
              valueFloat: value,
            });
          }
        }
      }
    }

    if (numericRestricts.length > 0) {
      datapoint.numericRestricts = numericRestricts;
    }

    return datapoint;
  }

  /**
   * Find index ID by display name
   */
  private async findIndexIdByName(name: string): Promise<string | null> {
    try {
      const parent = `projects/${this.config.projectId}/locations/${this.config.location}`;
      const iterable = this.indexClient!.listIndexes({ parent });

      for await (const index of iterable) {
        if (index.name?.includes(name)) {
          return index.name.split("/").pop() || null;
        }
      }
      return null;
    } catch {
      return null;
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
   * Translate field filter to Vertex restricts
   */
  private translateFieldFilter(
    key: string,
    filter: FieldFilter,
    restricts: Array<{
      namespace: string;
      allowList?: string[];
      denyList?: string[];
    }>,
    numericRestricts: Array<{
      namespace: string;
      valueInt?: string;
      valueFloat?: number;
      op?: string;
    }>,
  ): void {
    for (const [op, val] of Object.entries(filter)) {
      switch (op) {
        case "$eq":
          if (typeof val === "string") {
            restricts.push({ namespace: key, allowList: [val] });
          } else if (typeof val === "number") {
            numericRestricts.push({
              namespace: key,
              valueInt: Number.isInteger(val) ? String(val) : undefined,
              valueFloat: !Number.isInteger(val) ? val : undefined,
              op: "EQUAL",
            });
          }
          break;

        case "$ne":
          if (typeof val === "string") {
            restricts.push({ namespace: key, denyList: [val] });
          } else if (typeof val === "number") {
            numericRestricts.push({
              namespace: key,
              valueInt: Number.isInteger(val) ? String(val) : undefined,
              valueFloat: !Number.isInteger(val) ? val : undefined,
              op: "NOT_EQUAL",
            });
          }
          break;

        case "$gt":
          if (typeof val === "number") {
            numericRestricts.push({
              namespace: key,
              valueInt: Number.isInteger(val) ? String(val) : undefined,
              valueFloat: !Number.isInteger(val) ? val : undefined,
              op: "GREATER",
            });
          }
          break;

        case "$gte":
          if (typeof val === "number") {
            numericRestricts.push({
              namespace: key,
              valueInt: Number.isInteger(val) ? String(val) : undefined,
              valueFloat: !Number.isInteger(val) ? val : undefined,
              op: "GREATER_EQUAL",
            });
          }
          break;

        case "$lt":
          if (typeof val === "number") {
            numericRestricts.push({
              namespace: key,
              valueInt: Number.isInteger(val) ? String(val) : undefined,
              valueFloat: !Number.isInteger(val) ? val : undefined,
              op: "LESS",
            });
          }
          break;

        case "$lte":
          if (typeof val === "number") {
            numericRestricts.push({
              namespace: key,
              valueInt: Number.isInteger(val) ? String(val) : undefined,
              valueFloat: !Number.isInteger(val) ? val : undefined,
              op: "LESS_EQUAL",
            });
          }
          break;

        case "$in":
          if (Array.isArray(val)) {
            const stringValues = val.filter(
              (v) => typeof v === "string",
            ) as string[];
            if (stringValues.length > 0) {
              restricts.push({ namespace: key, allowList: stringValues });
            }
          }
          break;

        case "$nin":
          if (Array.isArray(val)) {
            const stringValues = val.filter(
              (v) => typeof v === "string",
            ) as string[];
            if (stringValues.length > 0) {
              restricts.push({ namespace: key, denyList: stringValues });
            }
          }
          break;

        // String operators - not directly supported by Vertex, handled locally
        case "$contains":
        case "$startsWith":
        case "$endsWith":
        case "$exists":
          logger.debug(
            `Operator ${op} not natively supported by Vertex AI, filtering locally`,
          );
          break;

        default:
          // Unknown operator, treat as equality
          if (typeof val === "string") {
            restricts.push({ namespace: key, allowList: [val] });
          }
      }
    }
  }

  /**
   * Filter metadata locally for operations not supported by Vertex API
   */
  private filterMetadataLocally<TMetadata extends UnknownRecord>(
    metadataMap: Map<string, unknown>,
    filter: MetadataFilter<TMetadata>,
    namespace?: string,
  ): string[] {
    const matchingIds: string[] = [];

    const entries = Array.from(metadataMap.entries());
    for (const [id, stored] of entries) {
      const storedData = stored as {
        metadata?: TMetadata;
        namespace?: string;
      };

      // Check namespace
      if (namespace && storedData.namespace !== namespace) {
        continue;
      }

      // Check filter
      if (
        this.matchesFilter(storedData.metadata || ({} as TMetadata), filter)
      ) {
        matchingIds.push(id);
      }
    }

    return matchingIds;
  }

  /**
   * Check if metadata matches filter locally
   */
  private matchesFilter<TMetadata extends UnknownRecord>(
    metadata: TMetadata,
    filter: MetadataFilter<TMetadata>,
  ): boolean {
    for (const [key, value] of Object.entries(filter)) {
      if (key === "$and" && Array.isArray(value)) {
        if (
          !value.every((f) =>
            this.matchesFilter(metadata, f as MetadataFilter<TMetadata>),
          )
        ) {
          return false;
        }
        continue;
      }

      if (key === "$or" && Array.isArray(value)) {
        if (
          !value.some((f) =>
            this.matchesFilter(metadata, f as MetadataFilter<TMetadata>),
          )
        ) {
          return false;
        }
        continue;
      }

      if (key === "$not" && typeof value === "object") {
        if (this.matchesFilter(metadata, value as MetadataFilter<TMetadata>)) {
          return false;
        }
        continue;
      }

      const metaValue = metadata[key as keyof TMetadata];

      if (this.isFieldFilter(value)) {
        if (!this.matchesFieldFilter(metaValue, value as FieldFilter)) {
          return false;
        }
      } else if (metaValue !== value) {
        return false;
      }
    }

    return true;
  }

  /**
   * Check if value matches field filter
   */
  private matchesFieldFilter(value: unknown, filter: FieldFilter): boolean {
    for (const [op, target] of Object.entries(filter)) {
      switch (op) {
        case "$eq":
          if (value !== target) return false;
          break;
        case "$ne":
          if (value === target) return false;
          break;
        case "$gt":
          if (typeof value !== "number" || value <= (target as number))
            return false;
          break;
        case "$gte":
          if (typeof value !== "number" || value < (target as number))
            return false;
          break;
        case "$lt":
          if (typeof value !== "number" || value >= (target as number))
            return false;
          break;
        case "$lte":
          if (typeof value !== "number" || value > (target as number))
            return false;
          break;
        case "$in":
          if (!Array.isArray(target) || !target.includes(value as never))
            return false;
          break;
        case "$nin":
          if (Array.isArray(target) && target.includes(value as never))
            return false;
          break;
        case "$exists":
          if (
            (target && value === undefined) ||
            (!target && value !== undefined)
          )
            return false;
          break;
        case "$contains":
          if (typeof value !== "string" || !value.includes(target as string))
            return false;
          break;
        case "$startsWith":
          if (typeof value !== "string" || !value.startsWith(target as string))
            return false;
          break;
        case "$endsWith":
          if (typeof value !== "string" || !value.endsWith(target as string))
            return false;
          break;
      }
    }
    return true;
  }

  /**
   * Set deployed index ID for an index
   * Call this after deploying an index to an endpoint
   */
  setDeployedIndexId(indexName: string, deployedIndexId: string): void {
    const metadata = this.indexMetadataCache.get(indexName);
    if (metadata) {
      metadata.deployedIndexId = deployedIndexId;
    } else {
      this.indexMetadataCache.set(indexName, {
        name: indexName,
        indexId: indexName,
        deployedIndexId,
        dimension: 0,
        metric: "cosine",
        createdAt: new Date().toISOString(),
      });
    }
  }
}
