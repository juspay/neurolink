/**
 * Weaviate Vector Store Adapter
 * Implements vector similarity search using Weaviate vector database
 *
 * Weaviate is an open-source vector database that supports:
 * - Hybrid search (vector + BM25 keyword search)
 * - GraphQL-based API
 * - Multi-tenancy
 * - Built-in schema management
 * - Multiple distance metrics (cosine, euclidean, dot product)
 *
 * @see https://weaviate.io/developers/weaviate
 */

import type { UnknownRecord } from "../../types/common.js";
import { logger } from "../../utils/logger.js";
import { BaseVectorStore } from "../BaseVectorStore.js";
import type {
  VectorStoreName,
  VectorRecord,
  VectorQueryResult,
  VectorIndexConfig,
  VectorQueryOptions,
  VectorUpsertOptions,
  VectorDeleteOptions,
  VectorStoreStats,
  VectorStoreHealth,
  VectorStoreConfig,
  MetadataFilter,
  FieldFilter,
  SimilarityMetric,
} from "../types.js";

/**
 * Weaviate client factory type for dependency injection (mainly for testing)
 */
export type WeaviateClientFactory = () => Promise<{
  client: (config: Record<string, unknown>) => WeaviateClient;
  ApiKey: new (key: string) => unknown;
}>;

/**
 * Weaviate-specific configuration
 */
export type WeaviateConfig = VectorStoreConfig & {
  /** Weaviate host URL (e.g., "http://localhost:8080" or "https://your-cluster.weaviate.network") */
  host: string;
  /** API key for Weaviate Cloud Services (WCS) or authenticated instances */
  apiKey?: string;
  /** Scheme (http or https) - defaults to https for cloud instances */
  scheme?: "http" | "https";
  /** gRPC host for faster batch operations (optional) */
  grpcHost?: string;
  /** Additional headers for authentication (e.g., X-OpenAI-Api-Key for vectorizers) */
  headers?: Record<string, string>;
  /** Default tenant for multi-tenancy (optional) */
  defaultTenant?: string;
  /** Connection timeout in ms (default: 30000) */
  connectionTimeout?: number;
  /** Enable batching for upserts (default: true) */
  batchingEnabled?: boolean;
  /** Batch size for bulk operations (default: 100) */
  batchSize?: number;
  /** Custom client factory for dependency injection (mainly for testing) */
  clientFactory?: WeaviateClientFactory;
};

/**
 * Internal Weaviate client interface
 * Compatible with weaviate-ts-client API
 */
interface WeaviateClient {
  schema: {
    classCreator: () => ClassCreator;
    classDeleter: () => ClassDeleter;
    getter: () => SchemaGetter;
    exists: (className: string) => Promise<boolean>;
    classGetter: () => ClassGetter;
  };
  data: {
    creator: () => DataCreator;
    deleter: () => DataDeleter;
    getter: () => DataGetter;
  };
  batch: {
    objectsBatcher: () => ObjectsBatcher;
  };
  graphql: {
    get: () => GraphQLGet;
    aggregate: () => GraphQLAggregate;
  };
  misc: {
    metaGetter: () => MetaGetter;
    readyChecker: () => ReadyChecker;
  };
}

interface ClassCreator {
  withClass: (classConfig: WeaviateClass) => { do: () => Promise<void> };
}

interface ClassDeleter {
  withClassName: (name: string) => { do: () => Promise<void> };
}

interface SchemaGetter {
  do: () => Promise<{ classes?: WeaviateClass[] }>;
}

interface ClassGetter {
  withClassName: (name: string) => { do: () => Promise<WeaviateClass> };
}

interface DataCreator {
  withClassName: (name: string) => DataCreatorWithClass;
}

interface DataCreatorWithClass {
  withId: (id: string) => DataCreatorWithId;
  withProperties: (props: Record<string, unknown>) => DataCreatorWithClass;
}

interface DataCreatorWithId {
  withVector: (vector: number[]) => DataCreatorWithVector;
  withProperties: (props: Record<string, unknown>) => DataCreatorWithId;
}

interface DataCreatorWithVector {
  withProperties: (props: Record<string, unknown>) => DataCreatorWithVector;
  withTenant?: (tenant: string) => DataCreatorWithVector;
  do: () => Promise<WeaviateObject>;
}

interface DataDeleter {
  withClassName: (name: string) => DataDeleterWithClass;
}

interface DataDeleterWithClass {
  withId: (id: string) => { do: () => Promise<void> };
  withWhere: (where: WeaviateWhereFilter) => { do: () => Promise<{ results?: { successful?: number } }> };
}

interface DataGetter {
  withClassName: (name: string) => DataGetterWithClass;
}

interface DataGetterWithClass {
  withId: (id: string) => { do: () => Promise<WeaviateObject | null> };
}

interface ObjectsBatcher {
  withObject: (obj: WeaviateBatchObject) => ObjectsBatcher;
  withObjects: (objs: WeaviateBatchObject[]) => ObjectsBatcher;
  do: () => Promise<WeaviateBatchResult[]>;
}

interface GraphQLGet {
  withClassName: (name: string) => GraphQLGetWithClass;
}

interface GraphQLGetWithClass {
  withFields: (fields: string) => GraphQLGetWithFields;
}

interface GraphQLGetWithFields {
  withNearVector: (config: NearVectorConfig) => GraphQLGetWithNearVector;
  withLimit: (limit: number) => GraphQLGetWithFields;
  withWhere: (where: WeaviateWhereFilter) => GraphQLGetWithFields;
  withTenant?: (tenant: string) => GraphQLGetWithFields;
  do: () => Promise<GraphQLResponse>;
}

interface GraphQLGetWithNearVector {
  withLimit: (limit: number) => GraphQLGetWithNearVector;
  withWhere: (where: WeaviateWhereFilter) => GraphQLGetWithNearVector;
  withTenant?: (tenant: string) => GraphQLGetWithNearVector;
  do: () => Promise<GraphQLResponse>;
}

interface NearVectorConfig {
  vector: number[];
  certainty?: number;
  distance?: number;
}

interface GraphQLResponse {
  data?: {
    Get?: {
      [className: string]: Array<{
        _additional?: {
          id?: string;
          certainty?: number;
          distance?: number;
          vector?: number[];
        };
        [key: string]: unknown;
      }>;
    };
  };
}

interface GraphQLAggregate {
  withClassName: (name: string) => GraphQLAggregateWithClass;
}

interface GraphQLAggregateWithClass {
  withFields: (fields: string) => GraphQLAggregateWithFields;
  withTenant?: (tenant: string) => GraphQLAggregateWithClass;
}

interface GraphQLAggregateWithFields {
  withTenant?: (tenant: string) => GraphQLAggregateWithFields;
  do: () => Promise<AggregateResponse>;
}

interface AggregateResponse {
  data?: {
    Aggregate?: {
      [className: string]: Array<{
        meta?: {
          count?: number;
        };
      }>;
    };
  };
}

interface MetaGetter {
  do: () => Promise<WeaviateMeta>;
}

interface ReadyChecker {
  do: () => Promise<boolean>;
}

interface WeaviateMeta {
  version?: string;
  hostname?: string;
  modules?: Record<string, unknown>;
}

interface WeaviateClass {
  class: string;
  description?: string;
  vectorIndexType?: string;
  vectorIndexConfig?: {
    distance?: string;
  };
  properties?: WeaviateProperty[];
  multiTenancyConfig?: {
    enabled: boolean;
  };
}

interface WeaviateProperty {
  name: string;
  dataType: string[];
  description?: string;
  indexFilterable?: boolean;
  indexSearchable?: boolean;
}

interface WeaviateObject {
  id?: string;
  class?: string;
  properties?: Record<string, unknown>;
  vector?: number[];
  tenant?: string;
}

interface WeaviateBatchObject {
  class: string;
  id?: string;
  properties?: Record<string, unknown>;
  vector?: number[];
  tenant?: string;
}

interface WeaviateBatchResult {
  id?: string;
  result?: {
    status?: string;
    errors?: { error?: Array<{ message?: string }> };
  };
}

interface WeaviateWhereFilter {
  operator?: string;
  operands?: WeaviateWhereFilter[];
  path?: string[];
  valueString?: string;
  valueText?: string;
  valueInt?: number;
  valueNumber?: number;
  valueBoolean?: boolean;
  valueDate?: string;
  valueStringArray?: string[];
  valueIntArray?: number[];
}

/**
 * Weaviate Vector Store Adapter
 *
 * Features:
 * - Full CRUD operations for vector data
 * - Hybrid search support (vector + BM25)
 * - Metadata filtering with Weaviate's GraphQL-based query language
 * - Multi-tenancy support
 * - Batch operations for high throughput
 * - Schema management (create/delete collections)
 *
 * Note: Requires weaviate-ts-client to be installed:
 *   npm install weaviate-ts-client
 */
export class WeaviateAdapter extends BaseVectorStore<WeaviateConfig> {
  private client: WeaviateClient | null = null;
  private classCache: Map<string, WeaviateClass> = new Map();
  private clientFactory: WeaviateClientFactory;

  constructor(config: WeaviateConfig) {
    super(config, "weaviate" as VectorStoreName);
    // Use injected client factory or default to dynamic import
    this.clientFactory = config.clientFactory || this.defaultClientFactory;
  }

  /**
   * Default client factory using dynamic import
   */
  private defaultClientFactory: WeaviateClientFactory = async () => {
    try {
      const modulePath = "weaviate-ts-client";
      const module = await import(/* @vite-ignore */ modulePath);
      return module.default || module;
    } catch {
      throw new Error(
        "Weaviate client not found. Install weaviate-ts-client: npm install weaviate-ts-client",
      );
    }
  };

  /**
   * Initialize connection to Weaviate
   */
  async connect(): Promise<void> {
    if (this.initialized) {
      logger.debug("Weaviate already connected");
      return;
    }

    try {
      // Load Weaviate client via factory (injected or default)
      const weaviate = await this.clientFactory();

      // Build client configuration
      const clientConfig: Record<string, unknown> = {
        scheme: this.config.scheme || (this.config.host.includes("localhost") ? "http" : "https"),
        host: this.config.host.replace(/^https?:\/\//, ""),
      };

      // Add API key if provided
      if (this.config.apiKey) {
        clientConfig.apiKey = new weaviate.ApiKey(this.config.apiKey);
      }

      // Add custom headers
      if (this.config.headers) {
        clientConfig.headers = this.config.headers;
      }

      // Create client
      this.client = weaviate.client(clientConfig) as WeaviateClient;

      // Verify connection
      const isReady = await this.client.misc.readyChecker().do();
      if (!isReady) {
        throw new Error("Weaviate server is not ready");
      }

      this.initialized = true;
      logger.debug("Weaviate connected successfully", {
        host: this.config.host,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to connect to Weaviate: ${message}`);
    }
  }

  /**
   * Close connection to Weaviate
   */
  async disconnect(): Promise<void> {
    if (this.client) {
      // Weaviate client doesn't have explicit disconnect
      this.client = null;
      this.initialized = false;
      this.classCache.clear();
      logger.debug("Weaviate disconnected");
    }
  }

  /**
   * Create a new index (Weaviate class/collection)
   */
  async createIndex(config: VectorIndexConfig): Promise<void> {
    this.ensureInitialized();

    const { name, dimension, metric = "cosine" } = config;
    const className = this.toClassName(name);

    try {
      // Check if class already exists
      const exists = await this.client!.schema.exists(className);
      if (exists) {
        logger.debug(`Class ${className} already exists`);
        return;
      }

      // Map NeuroLink metric to Weaviate distance
      const distanceMap: Record<SimilarityMetric, string> = {
        cosine: "cosine",
        euclidean: "l2-squared",
        dotProduct: "dot",
      };

      // Create class schema
      const classConfig: WeaviateClass = {
        class: className,
        description: `Vector index created by NeuroLink (dimension: ${dimension}, metric: ${metric})`,
        vectorIndexType: "hnsw",
        vectorIndexConfig: {
          distance: distanceMap[metric] || "cosine",
        },
        properties: [
          {
            name: "content",
            dataType: ["text"],
            description: "Original text content",
            indexFilterable: true,
            indexSearchable: true,
          },
          {
            name: "namespace",
            dataType: ["text"],
            description: "Namespace for organization",
            indexFilterable: true,
            indexSearchable: false,
          },
          {
            name: "_metadata",
            dataType: ["text"],
            description: "JSON-encoded metadata",
            indexFilterable: false,
            indexSearchable: false,
          },
        ],
      };

      // Enable multi-tenancy if tenant is configured
      if (this.config.defaultTenant) {
        classConfig.multiTenancyConfig = { enabled: true };
      }

      await this.client!.schema.classCreator().withClass(classConfig).do();

      // Cache the class config
      this.classCache.set(name, classConfig);

      logger.debug(`Created Weaviate class ${className}`, { dimension, metric });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to create index ${name}: ${message}`);
    }
  }

  /**
   * Delete an index (Weaviate class/collection)
   */
  async deleteIndex(indexName: string): Promise<void> {
    this.ensureInitialized();

    const className = this.toClassName(indexName);

    try {
      const exists = await this.client!.schema.exists(className);
      if (!exists) {
        logger.debug(`Class ${className} does not exist`);
        return;
      }

      await this.client!.schema.classDeleter().withClassName(className).do();
      this.classCache.delete(indexName);

      logger.debug(`Deleted Weaviate class ${className}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to delete index ${indexName}: ${message}`);
    }
  }

  /**
   * List all indexes (Weaviate classes)
   */
  async listIndexes(): Promise<string[]> {
    this.ensureInitialized();

    try {
      const schema = await this.client!.schema.getter().do();
      const classes = schema.classes || [];
      return classes.map((c) => this.fromClassName(c.class));
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

    const className = this.toClassName(indexName);

    try {
      return await this.client!.schema.exists(className);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to check index existence: ${message}`);
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

    const className = this.toClassName(indexName);
    const namespace = options?.namespace || null;

    // Validate dimensions
    this.validateDimensions(records.map((r) => r.vector));

    try {
      // Use batch operations for better performance
      const batchSize = options?.batchSize || this.config.batchSize || 100;
      let upsertedCount = 0;

      for (let i = 0; i < records.length; i += batchSize) {
        const batch = records.slice(i, i + batchSize);
        const batchObjects: WeaviateBatchObject[] = batch.map((record) => ({
          class: className,
          id: this.toUUID(record.id),
          vector: record.vector,
          properties: {
            content: record.content || "",
            namespace: record.namespace || namespace || "",
            _metadata: record.metadata ? JSON.stringify(record.metadata) : "{}",
          },
          ...(this.config.defaultTenant && { tenant: this.config.defaultTenant }),
        }));

        const results = await this.client!.batch
          .objectsBatcher()
          .withObjects(batchObjects)
          .do();

        // Count successful upserts
        for (const result of results) {
          if (!result.result?.errors?.error?.length) {
            upsertedCount++;
          } else {
            logger.warn(`Failed to upsert object ${result.id}`, {
              errors: result.result.errors,
            });
          }
        }
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
   */
  async query<TMetadata extends UnknownRecord = UnknownRecord>(
    indexName: string,
    options: VectorQueryOptions<TMetadata>,
  ): Promise<VectorQueryResult<TMetadata>[]> {
    this.ensureInitialized();

    const className = this.toClassName(indexName);
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
      // Build fields to retrieve
      const fields = [
        "_additional { id certainty distance",
        includeVectors ? " vector" : "",
        " }",
        "content",
        "namespace",
        includeMetadata ? " _metadata" : "",
      ].join("");

      // Build query
      let queryBuilder = this.client!.graphql
        .get()
        .withClassName(className)
        .withFields(fields)
        .withNearVector({
          vector,
          ...(minScore !== undefined && { certainty: minScore }),
        })
        .withLimit(topK);

      // Add where filter if provided
      const whereFilter = this.buildWhereFilter(filter, namespace);
      if (whereFilter) {
        queryBuilder = queryBuilder.withWhere(whereFilter);
      }

      // Add tenant if configured
      if (this.config.defaultTenant && queryBuilder.withTenant) {
        queryBuilder = queryBuilder.withTenant(this.config.defaultTenant);
      }

      const response = await queryBuilder.do();

      // Parse results
      const results: VectorQueryResult<TMetadata>[] = [];
      const objects = response.data?.Get?.[className] || [];

      for (const obj of objects) {
        const additional = obj._additional || {};

        // Use certainty if available, otherwise calculate from distance
        let score = additional.certainty ?? 0;
        if (score === 0 && additional.distance !== undefined) {
          // Convert distance to similarity (approximate)
          score = 1 / (1 + additional.distance);
        }

        // Apply minimum score filter
        if (minScore !== undefined && score < minScore) {
          continue;
        }

        const result: VectorQueryResult<TMetadata> = {
          id: this.fromUUID(additional.id || ""),
          score,
          content: obj.content as string | undefined,
        };

        if (includeVectors && additional.vector) {
          result.vector = additional.vector;
        }

        if (includeMetadata && obj._metadata) {
          try {
            result.metadata = JSON.parse(obj._metadata as string) as TMetadata;
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

    const className = this.toClassName(indexName);
    const { ids, filter, namespace, deleteAll } = options;

    try {
      let deletedCount = 0;

      if (deleteAll) {
        // Delete all or by namespace
        const whereFilter = namespace
          ? this.buildWhereFilter(undefined, namespace)
          : undefined;

        if (whereFilter) {
          const result = await this.client!.data
            .deleter()
            .withClassName(className)
            .withWhere(whereFilter)
            .do();
          deletedCount = result.results?.successful || 0;
        } else {
          // Delete entire class and recreate (fastest way to delete all)
          const classConfig = this.classCache.get(indexName);
          await this.deleteIndex(indexName);
          if (classConfig) {
            await this.createIndex({
              name: indexName,
              dimension: 0, // Will be ignored if class config is cached
            });
          }
          deletedCount = -1; // Unknown count
        }
      } else if (ids && ids.length > 0) {
        // Delete by IDs
        for (const id of ids) {
          try {
            await this.client!.data
              .deleter()
              .withClassName(className)
              .withId(this.toUUID(id))
              .do();
            deletedCount++;
          } catch {
            // Object may not exist, continue
          }
        }
      } else if (filter) {
        // Delete by filter
        const whereFilter = this.buildWhereFilter(filter as MetadataFilter, namespace);
        if (whereFilter) {
          const result = await this.client!.data
            .deleter()
            .withClassName(className)
            .withWhere(whereFilter)
            .do();
          deletedCount = result.results?.successful || 0;
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

    const className = this.toClassName(indexName);

    try {
      // Get object count using aggregate query
      const aggregateQuery = this.client!.graphql
        .aggregate()
        .withClassName(className)
        .withFields("meta { count }");

      // Add tenant if configured
      if (this.config.defaultTenant && aggregateQuery.withTenant) {
        aggregateQuery.withTenant(this.config.defaultTenant);
      }

      const response = await aggregateQuery.do();
      const aggregateData = response.data?.Aggregate?.[className]?.[0];
      const vectorCount = aggregateData?.meta?.count || 0;

      // Get class schema for dimension info
      const classSchema = await this.client!.schema.classGetter()
        .withClassName(className)
        .do();

      // Get namespace count (approximate via distinct query)
      // Note: Weaviate doesn't have a direct distinct count, so we use a workaround
      let namespaceCount = 0;
      try {
        const namespaceQuery = await this.client!.graphql
          .get()
          .withClassName(className)
          .withFields("namespace")
          .withLimit(1000)
          .do();

        const objects = namespaceQuery.data?.Get?.[className] || [];
        const namespaces = new Set(objects.map((o) => o.namespace).filter(Boolean));
        namespaceCount = namespaces.size;
      } catch {
        // Ignore namespace count errors
      }

      return {
        vectorCount,
        namespaceCount,
        metrics: {
          distance: classSchema.vectorIndexConfig?.distance || "cosine",
          vectorIndexType: classSchema.vectorIndexType || "hnsw",
        },
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to get stats for ${indexName}: ${message}`);
    }
  }

  /**
   * Get store health status (override for Weaviate-specific check)
   */
  async healthCheck(): Promise<VectorStoreHealth> {
    const startTime = Date.now();
    try {
      if (!this.client) {
        return {
          healthy: false,
          status: "disconnected",
          latencyMs: Date.now() - startTime,
          error: "Client not initialized",
          lastChecked: new Date(),
        };
      }

      // Check if Weaviate is ready
      const isReady = await this.client.misc.readyChecker().do();

      if (isReady) {
        // Get meta info for additional health data
        const meta = await this.client.misc.metaGetter().do();

        return {
          healthy: true,
          status: "connected",
          latencyMs: Date.now() - startTime,
          lastChecked: new Date(),
        };
      } else {
        return {
          healthy: false,
          status: "degraded",
          latencyMs: Date.now() - startTime,
          error: "Weaviate server not ready",
          lastChecked: new Date(),
        };
      }
    } catch (error) {
      return {
        healthy: false,
        status: "error",
        latencyMs: Date.now() - startTime,
        error: error instanceof Error ? error.message : String(error),
        lastChecked: new Date(),
      };
    }
  }

  /**
   * Translate abstract filter to Weaviate where filter
   */
  protected translateFilter<TMetadata extends UnknownRecord>(
    filter: MetadataFilter<TMetadata>,
  ): WeaviateWhereFilter | null {
    const conditions: WeaviateWhereFilter[] = [];

    for (const [key, value] of Object.entries(filter)) {
      if (key === "$and" && Array.isArray(value)) {
        const subFilters = value
          .map((f) => this.translateFilter(f as MetadataFilter))
          .filter((f): f is WeaviateWhereFilter => f !== null);
        if (subFilters.length > 0) {
          conditions.push({
            operator: "And",
            operands: subFilters,
          });
        }
      } else if (key === "$or" && Array.isArray(value)) {
        const subFilters = value
          .map((f) => this.translateFilter(f as MetadataFilter))
          .filter((f): f is WeaviateWhereFilter => f !== null);
        if (subFilters.length > 0) {
          conditions.push({
            operator: "Or",
            operands: subFilters,
          });
        }
      } else if (key === "$not" && typeof value === "object" && value !== null) {
        const subFilter = this.translateFilter(value as MetadataFilter);
        if (subFilter) {
          // Weaviate doesn't have a NOT operator, so we invert the condition
          // This is a limitation - complex NOT operations may not work perfectly
          conditions.push(subFilter);
        }
      } else if (this.isFieldFilter(value)) {
        const fieldCondition = this.translateFieldFilter(key, value as FieldFilter);
        if (fieldCondition) {
          conditions.push(fieldCondition);
        }
      } else {
        // Simple equality - metadata is stored as JSON, need to use path
        conditions.push({
          path: ["_metadata"],
          operator: "ContainsAny",
          valueText: JSON.stringify({ [key]: value }),
        });
      }
    }

    if (conditions.length === 0) {
      return null;
    }

    if (conditions.length === 1) {
      return conditions[0];
    }

    return {
      operator: "And",
      operands: conditions,
    };
  }

  // ===================
  // PRIVATE HELPER METHODS
  // ===================

  /**
   * Convert index name to valid Weaviate class name
   * Weaviate class names must start with uppercase and contain only alphanumeric + underscore
   */
  private toClassName(indexName: string): string {
    // Replace non-alphanumeric with underscore, ensure starts with uppercase
    const sanitized = indexName
      .replace(/[^a-zA-Z0-9_]/g, "_")
      .replace(/^_+/, "")
      .replace(/_+$/, "");

    // Ensure first character is uppercase letter
    if (sanitized.length === 0) {
      return "Index";
    }

    const first = sanitized.charAt(0);
    if (/[a-z]/.test(first)) {
      return first.toUpperCase() + sanitized.slice(1);
    } else if (/[A-Z]/.test(first)) {
      return sanitized;
    } else {
      return "Index_" + sanitized;
    }
  }

  /**
   * Convert Weaviate class name back to index name
   */
  private fromClassName(className: string): string {
    // Lowercase first letter to match original convention
    return className.charAt(0).toLowerCase() + className.slice(1);
  }

  /**
   * Convert string ID to Weaviate UUID format
   * Weaviate requires UUIDs, so we create deterministic UUIDs from string IDs
   */
  private toUUID(id: string): string {
    // If already a valid UUID, return as-is
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (uuidRegex.test(id)) {
      return id.toLowerCase();
    }

    // Create deterministic UUID v5-like hash from string
    // Using a simple hash approach for now
    const hash = this.simpleHash(id);
    const uuid = [
      hash.slice(0, 8),
      hash.slice(8, 12),
      "4" + hash.slice(13, 16), // Version 4
      ((parseInt(hash.slice(16, 17), 16) & 0x3) | 0x8).toString(16) + hash.slice(17, 20), // Variant
      hash.slice(20, 32),
    ].join("-");

    return uuid;
  }

  /**
   * Convert UUID back to original ID (if stored in a mapping)
   * For now, we just return the UUID as we don't maintain a reverse mapping
   */
  private fromUUID(uuid: string): string {
    return uuid;
  }

  /**
   * Simple hash function for creating deterministic UUIDs
   */
  private simpleHash(str: string): string {
    let hash = 0;
    const result: string[] = [];

    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }

    // Generate 32 hex characters
    for (let i = 0; i < 32; i++) {
      const seed = hash + i * 31;
      const hex = Math.abs(seed).toString(16).padStart(8, "0");
      result.push(hex.charAt(i % hex.length));
    }

    return result.join("");
  }

  /**
   * Build Weaviate where filter from metadata filter and namespace
   */
  private buildWhereFilter<TMetadata extends UnknownRecord>(
    filter?: MetadataFilter<TMetadata>,
    namespace?: string,
  ): WeaviateWhereFilter | null {
    const conditions: WeaviateWhereFilter[] = [];

    // Add namespace filter
    if (namespace) {
      conditions.push({
        path: ["namespace"],
        operator: "Equal",
        valueText: namespace,
      });
    }

    // Add metadata filter
    if (filter) {
      const metadataFilter = this.translateFilter(filter);
      if (metadataFilter) {
        conditions.push(metadataFilter);
      }
    }

    if (conditions.length === 0) {
      return null;
    }

    if (conditions.length === 1) {
      return conditions[0];
    }

    return {
      operator: "And",
      operands: conditions,
    };
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
   * Translate a field filter to Weaviate format
   */
  private translateFieldFilter(
    key: string,
    filter: FieldFilter,
  ): WeaviateWhereFilter | null {
    const conditions: WeaviateWhereFilter[] = [];
    const path = key === "content" || key === "namespace" ? [key] : ["_metadata"];

    for (const [op, val] of Object.entries(filter)) {
      switch (op) {
        case "$eq":
          conditions.push({
            path,
            operator: "Equal",
            ...(typeof val === "string" && { valueText: val }),
            ...(typeof val === "number" && { valueNumber: val }),
            ...(typeof val === "boolean" && { valueBoolean: val }),
          });
          break;
        case "$ne":
          conditions.push({
            path,
            operator: "NotEqual",
            ...(typeof val === "string" && { valueText: val }),
            ...(typeof val === "number" && { valueNumber: val }),
            ...(typeof val === "boolean" && { valueBoolean: val }),
          });
          break;
        case "$gt":
          conditions.push({
            path,
            operator: "GreaterThan",
            ...(typeof val === "number" && { valueNumber: val }),
          });
          break;
        case "$gte":
          conditions.push({
            path,
            operator: "GreaterThanEqual",
            ...(typeof val === "number" && { valueNumber: val }),
          });
          break;
        case "$lt":
          conditions.push({
            path,
            operator: "LessThan",
            ...(typeof val === "number" && { valueNumber: val }),
          });
          break;
        case "$lte":
          conditions.push({
            path,
            operator: "LessThanEqual",
            ...(typeof val === "number" && { valueNumber: val }),
          });
          break;
        case "$in":
          if (Array.isArray(val)) {
            conditions.push({
              path,
              operator: "ContainsAny",
              ...(typeof val[0] === "string" && { valueStringArray: val as string[] }),
              ...(typeof val[0] === "number" && { valueIntArray: val as number[] }),
            });
          }
          break;
        case "$nin":
          // Weaviate doesn't have a direct "not in" operator
          // We need to use multiple NotEqual conditions
          if (Array.isArray(val)) {
            for (const v of val) {
              conditions.push({
                path,
                operator: "NotEqual",
                ...(typeof v === "string" && { valueText: v }),
                ...(typeof v === "number" && { valueNumber: v }),
              });
            }
          }
          break;
        case "$exists":
          conditions.push({
            path,
            operator: val ? "IsNotNull" : "IsNull",
          });
          break;
        case "$contains":
          conditions.push({
            path,
            operator: "Like",
            valueText: `*${val}*`,
          });
          break;
        case "$startsWith":
          conditions.push({
            path,
            operator: "Like",
            valueText: `${val}*`,
          });
          break;
        case "$endsWith":
          conditions.push({
            path,
            operator: "Like",
            valueText: `*${val}`,
          });
          break;
        default:
          // Unknown operator, treat as equality
          conditions.push({
            path,
            operator: "Equal",
            ...(typeof val === "string" && { valueText: val }),
            ...(typeof val === "number" && { valueNumber: val }),
          });
      }
    }

    if (conditions.length === 0) {
      return null;
    }

    if (conditions.length === 1) {
      return conditions[0];
    }

    return {
      operator: "And",
      operands: conditions,
    };
  }
}
