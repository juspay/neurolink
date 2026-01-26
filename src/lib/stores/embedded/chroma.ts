/**
 * Chroma Vector Store Implementation
 * Lightweight, embedded-first vector database for rapid prototyping
 * @see https://docs.trychroma.com/
 */

import type { UnknownRecord } from "../../types/common.js";
import type { MetadataFilter } from "../../types/vectorFilterTypes.js";
import type {
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
import { translateToChroma } from "../filterTranslator.js";

// Types for Chroma client (using dynamic import)
type ChromaClient = {
  heartbeat: () => Promise<number>;
  listCollections: () => Promise<Array<{ name: string }>>;
  createCollection: (params: {
    name: string;
    metadata?: Record<string, unknown>;
  }) => Promise<ChromaCollection>;
  getCollection: (params: { name: string }) => Promise<ChromaCollection>;
  deleteCollection: (params: { name: string }) => Promise<void>;
};

type ChromaCollection = {
  name: string;
  count: () => Promise<number>;
  upsert: (params: {
    ids: string[];
    embeddings: number[][];
    metadatas?: Array<Record<string, unknown>>;
    documents?: string[];
  }) => Promise<void>;
  update: (params: {
    ids: string[];
    embeddings?: number[][];
    metadatas?: Array<Record<string, unknown>>;
    documents?: string[];
  }) => Promise<void>;
  get: (params: {
    ids?: string[];
    where?: Record<string, unknown>;
    include?: Array<"metadatas" | "documents" | "embeddings">;
  }) => Promise<ChromaGetResponse>;
  query: (params: {
    queryEmbeddings: number[][];
    nResults?: number;
    where?: Record<string, unknown>;
    include?: Array<"metadatas" | "documents" | "embeddings" | "distances">;
  }) => Promise<ChromaQueryResponse>;
  delete: (params: {
    ids?: string[];
    where?: Record<string, unknown>;
  }) => Promise<void>;
};

type ChromaQueryResponse = {
  ids: string[][];
  distances?: number[][];
  embeddings?: number[][][];
  metadatas?: Array<Array<Record<string, unknown> | null>>;
  documents?: Array<Array<string | null>>;
};

type ChromaGetResponse = {
  ids: string[];
  embeddings?: number[][];
  metadatas?: Array<Record<string, unknown> | null>;
  documents?: Array<string | null>;
};

/**
 * Chroma-specific configuration
 */
export type ChromaConfig = VectorStoreConfig & {
  /** Path for persistent local storage (embedded mode) */
  path?: string;
  /** Chroma server host (server mode) */
  host?: string;
  /** Chroma server port (default: 8000) */
  port?: number;
  /** Use SSL for server connection */
  ssl?: boolean;
  /** Tenant name (multi-tenant support) */
  tenant?: string;
  /** Database name */
  database?: string;
};

/**
 * Chroma Vector Store implementation
 */
export class ChromaStore extends BaseVectorStore<ChromaConfig> {
  private client: ChromaClient | null = null;
  private collections: Map<string, ChromaCollection> = new Map();

  constructor(config: ChromaConfig) {
    super(config, "chroma" as VectorStoreName);
  }

  /**
   * Initialize connection to Chroma
   */
  async connect(): Promise<void> {
    if (this.initialized) {
      return;
    }

    try {
      // Dynamically import Chroma client
      const { ChromaClient: ChromaClientClass } = await import("chromadb");

      if (this.config.host) {
        // Connect to Chroma server
        const protocol = this.config.ssl ? "https" : "http";
        const port = this.config.port || 8000;
        this.client = new ChromaClientClass({
          path: `${protocol}://${this.config.host}:${port}`,
        }) as unknown as ChromaClient;
      } else if (this.config.path) {
        // Local persistent storage
        this.client = new ChromaClientClass({
          path: this.config.path,
        }) as unknown as ChromaClient;
      } else {
        // Default: ephemeral in-memory
        this.client = new ChromaClientClass() as unknown as ChromaClient;
      }

      // Test connection
      await this.client.heartbeat();

      this.initialized = true;
      this.logInfo("Connected successfully");
    } catch (error) {
      this.logError("Failed to connect", error);
      throw new Error(
        `Failed to connect to Chroma: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Disconnect from Chroma
   */
  async disconnect(): Promise<void> {
    this.collections.clear();
    this.client = null;
    this.initialized = false;
    this.logInfo("Disconnected");
  }

  /**
   * Create a new collection
   */
  async createIndex(config: VectorIndexConfig): Promise<void> {
    this.ensureInitialized();

    const collection = await this.client!.createCollection({
      name: config.name,
      metadata: {
        dimension: config.dimension,
        metric: config.metric || "cosine",
        ...(config.config || {}),
      },
    });

    this.collections.set(config.name, collection);
    this.logInfo(`Collection created: ${config.name}`, {
      dimension: config.dimension,
    });
  }

  /**
   * Delete a collection
   */
  async deleteIndex(indexName: string): Promise<void> {
    this.ensureInitialized();

    await this.client!.deleteCollection({ name: indexName });
    this.collections.delete(indexName);
    this.logInfo(`Collection deleted: ${indexName}`);
  }

  /**
   * List all collections
   */
  async listIndexes(): Promise<string[]> {
    this.ensureInitialized();

    const collections = await this.client!.listCollections();
    return collections.map((c) => c.name);
  }

  /**
   * Check if a collection exists
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

    const collection = await this.getCollection(indexName);
    const batchSize = options?.batchSize || 5000;
    let totalUpserted = 0;

    // Process in batches (Chroma has a limit of ~5461 per batch)
    for (let i = 0; i < records.length; i += batchSize) {
      const batch = records.slice(i, i + batchSize);

      await collection.upsert({
        ids: batch.map((r) => r.id),
        embeddings: batch.map((r) => r.vector),
        metadatas: batch.map(
          (r) => (r.metadata || {}) as Record<string, unknown>,
        ),
        documents: batch.map((r) => r.content || ""),
      });

      totalUpserted += batch.length;
      this.logDebug(`Upserted batch: ${totalUpserted}/${records.length}`);
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

    const collection = await this.getCollection(indexName);

    const include: Array<
      "metadatas" | "documents" | "embeddings" | "distances"
    > = ["metadatas", "documents", "distances"];

    if (options.includeVectors) {
      include.push("embeddings");
    }

    const queryParams: {
      queryEmbeddings: number[][];
      nResults: number;
      include: typeof include;
      where?: Record<string, unknown>;
    } = {
      queryEmbeddings: [options.vector],
      nResults: options.topK,
      include,
    };

    if (options.filter) {
      queryParams.where = translateToChroma(options.filter);
    }

    const result = await collection.query(queryParams);

    const results: VectorQueryResult<TMetadata>[] = [];

    for (let i = 0; i < (result.ids[0]?.length || 0); i++) {
      // Chroma returns distances, not similarities
      // For cosine distance, similarity = 1 - distance
      const distance = result.distances?.[0]?.[i] || 0;
      const score = 1 - distance;

      if (options.minScore && score < options.minScore) {
        continue;
      }

      results.push({
        id: result.ids[0][i],
        score,
        vector: options.includeVectors
          ? result.embeddings?.[0]?.[i]
          : undefined,
        metadata: (result.metadatas?.[0]?.[i] || {}) as TMetadata,
        content: result.documents?.[0]?.[i] || undefined,
      });
    }

    return results;
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

    const collection = await this.getCollection(indexName);

    // Check if the vector exists
    const existing = await collection.get({
      ids: [id],
      include: ["embeddings", "metadatas"],
    });

    if (existing.ids.length === 0) {
      throw new Error(
        `Vector with id '${id}' not found in collection '${indexName}'`,
      );
    }

    // Build update params
    const updateParams: {
      ids: string[];
      embeddings?: number[][];
      metadatas?: Array<Record<string, unknown>>;
    } = {
      ids: [id],
    };

    if (update.vector) {
      updateParams.embeddings = [update.vector];
    }

    if (update.metadata) {
      updateParams.metadatas = [update.metadata as Record<string, unknown>];
    }

    await collection.update(updateParams);
    this.logDebug(`Updated vector: ${id}`);
  }

  /**
   * Get collection statistics
   */
  async getStats(indexName: string): Promise<VectorStoreStats> {
    this.ensureInitialized();

    const collection = await this.getCollection(indexName);
    const count = await collection.count();

    return {
      vectorCount: count,
    };
  }

  /**
   * Delete vectors
   */
  async delete(
    indexName: string,
    options: VectorDeleteOptions,
  ): Promise<VectorDeleteResult> {
    this.ensureInitialized();

    const collection = await this.getCollection(indexName);

    if (options.ids && options.ids.length > 0) {
      await collection.delete({ ids: options.ids });
      return { deletedCount: options.ids.length, acknowledged: true };
    }

    if (options.filter) {
      await collection.delete({
        where: translateToChroma(options.filter),
      });
      return { deletedCount: undefined, acknowledged: true }; // Chroma doesn't return count for filter deletes
    }

    return { deletedCount: 0, acknowledged: true };
  }

  /**
   * Translate filter to Chroma format
   */
  protected translateFilter<TMetadata extends UnknownRecord>(
    filter: MetadataFilter<TMetadata>,
  ): unknown {
    return translateToChroma(filter);
  }

  /**
   * Get or fetch collection
   */
  private async getCollection(indexName: string): Promise<ChromaCollection> {
    if (!this.collections.has(indexName)) {
      const collection = await this.client!.getCollection({ name: indexName });
      this.collections.set(indexName, collection);
    }
    return this.collections.get(indexName)!;
  }
}
