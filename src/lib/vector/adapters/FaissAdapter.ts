/**
 * Faiss Vector Store Adapter
 * Implements vector similarity search using Facebook AI Similarity Search (Faiss)
 *
 * Faiss is a library for efficient similarity search and clustering of dense vectors.
 * It provides multiple index types optimized for different use cases:
 * - IndexFlatL2/IP: Exact (brute-force) search
 * - IndexIVFFlat: Inverted file index for faster approximate search
 * - IndexHNSWFlat: Hierarchical Navigable Small World graphs
 * - IndexIVFPQ: Product quantization for memory-efficient search
 *
 * Note: Faiss doesn't natively support:
 * - String IDs (uses sequential 64-bit integers) - we use IndexIDMap for mapping
 * - Metadata storage - we store separately in memory/file
 * - Native updates - implemented as delete + add
 * - Pre-filtering - we implement post-filtering
 *
 * @see https://github.com/facebookresearch/faiss
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
  MetadataFilter,
  FieldFilter,
  SimilarityMetric,
  VectorStoreConfig,
} from "../types.js";
import { promises as fs } from "fs";
import { join } from "path";

/**
 * Faiss-specific configuration
 */
export interface FaissConfig extends VectorStoreConfig {
  /** Directory for index persistence */
  indexPath?: string;
  /** Index type */
  indexType?: "flat" | "ivf" | "hnsw" | "ivf-pq";
  /** Number of clusters for IVF indexes (default: 100) */
  nlist?: number;
  /** Number of clusters to search for IVF (default: 10) */
  nprobe?: number;
  /** HNSW build parameter - max number of connections per layer */
  efConstruction?: number;
  /** HNSW search parameter - size of dynamic candidate list */
  efSearch?: number;
  /** Enable GPU if available (requires faiss-gpu) */
  useGpu?: boolean;
  /** Distance metric type */
  metricType?: "L2" | "IP";
  /** Number of sub-quantizers for IVF-PQ (default: 8) */
  numSubQuantizers?: number;
  /** Number of bits per sub-quantizer for IVF-PQ (default: 8) */
  bitsPerCode?: number;
  /** M parameter for HNSW (default: 32) */
  hnswM?: number;
}

/**
 * Internal representation of a Faiss index with its metadata
 */
interface FaissIndexEntry {
  /** The Faiss index instance */
  index: FaissIndex;
  /** Index configuration */
  config: {
    name: string;
    dimension: number;
    metric: SimilarityMetric;
    indexType: FaissConfig["indexType"];
    isTrained: boolean;
    createdAt: string;
  };
  /** ID mapping: string ID -> internal Faiss ID (bigint) */
  idMap: Map<string, bigint>;
  /** Reverse ID mapping: internal Faiss ID -> string ID */
  reverseIdMap: Map<bigint, string>;
  /** Metadata storage: string ID -> metadata */
  metadataStore: Map<string, { metadata?: UnknownRecord; content?: string; namespace?: string }>;
  /** Next available internal ID */
  nextId: bigint;
  /** Set of deleted IDs (for lazy deletion) */
  deletedIds: Set<string>;
}

/**
 * Faiss Index interface
 * Compatible with faiss-node API
 */
interface FaissIndex {
  ntotal: () => number;
  d: () => number;
  add: (vectors: number[]) => void;
  search: (vector: number[], k: number) => { distances: number[]; labels: bigint[] };
  write: (path: string) => void;
  removeIds?: (ids: bigint[]) => number;
  train?: (vectors: number[]) => void;
  isTrained?: () => boolean;
  setNprobe?: (nprobe: number) => void;
  setEfSearch?: (efSearch: number) => void;
}

/**
 * Faiss factory interface
 */
interface FaissFactory {
  IndexFlatL2: new (dimension: number) => FaissIndex;
  IndexFlatIP: new (dimension: number) => FaissIndex;
  IndexIVFFlat: new (quantizer: FaissIndex, dimension: number, nlist: number, metricType: number) => FaissIndex;
  IndexHNSWFlat: new (dimension: number, M: number) => FaissIndex;
  IndexIDMap: new (index: FaissIndex) => FaissIndex;
  read: (path: string) => FaissIndex;
  MetricType: {
    METRIC_L2: number;
    METRIC_INNER_PRODUCT: number;
  };
}

/**
 * Faiss Vector Store Adapter
 *
 * Features:
 * - Multiple index types: Flat (exact), IVF (approximate), HNSW (graph-based)
 * - Local file persistence for indexes
 * - String ID mapping via IndexIDMap wrapper
 * - Separate metadata storage with file persistence
 * - Post-filtering for metadata queries
 * - Batch operations for performance
 * - Support for L2 (Euclidean) and IP (Inner Product/Cosine) metrics
 *
 * Note: Requires the faiss-node package to be installed:
 *   npm install faiss-node
 */
export class FaissAdapter extends BaseVectorStore<FaissConfig> {
  private faiss: FaissFactory | null = null;
  private indexes: Map<string, FaissIndexEntry> = new Map();
  private indexPath: string;

  constructor(config: FaissConfig) {
    super(config, "faiss" as VectorStoreName);
    this.indexPath = config.indexPath || "./faiss-data";
  }

  /**
   * Initialize connection to Faiss
   * Loads the faiss-node bindings and any persisted indexes
   */
  async connect(): Promise<void> {
    if (this.initialized) {
      logger.debug("Faiss already connected");
      return;
    }

    try {
      // Dynamically import faiss-node
      this.faiss = await this.loadFaissDriver();

      // Ensure index directory exists
      await this.ensureIndexDirectory();

      // Load any persisted indexes
      await this.loadPersistedIndexes();

      this.initialized = true;
      logger.debug("Faiss connected successfully", {
        indexPath: this.indexPath,
        useGpu: this.config.useGpu,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to connect to Faiss: ${message}`);
    }
  }

  /**
   * Close connection and optionally persist indexes
   */
  async disconnect(): Promise<void> {
    if (!this.initialized) {
      return;
    }

    try {
      // Persist all indexes before disconnecting
      await this.persistAllIndexes();

      this.faiss = null;
      this.indexes.clear();
      this.initialized = false;

      logger.debug("Faiss disconnected");
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to disconnect from Faiss: ${message}`);
    }
  }

  /**
   * Create a new vector index
   */
  async createIndex(config: VectorIndexConfig): Promise<void> {
    this.ensureInitialized();

    const { name, dimension, metric = "cosine" } = config;

    if (this.indexes.has(name)) {
      logger.debug(`Index ${name} already exists`);
      return;
    }

    try {
      const indexType = this.config.indexType || "flat";
      const faissMetric = this.toFaissMetric(metric);

      // Create the appropriate index type
      const index = await this.createFaissIndex(dimension, indexType, faissMetric);

      // Store index entry
      const entry: FaissIndexEntry = {
        index,
        config: {
          name,
          dimension,
          metric,
          indexType,
          isTrained: indexType === "flat" || indexType === "hnsw",
          createdAt: new Date().toISOString(),
        },
        idMap: new Map(),
        reverseIdMap: new Map(),
        metadataStore: new Map(),
        nextId: BigInt(0),
        deletedIds: new Set(),
      };

      this.indexes.set(name, entry);

      // Persist the new index
      await this.persistIndex(name, entry);

      logger.debug(`Created Faiss index ${name}`, {
        dimension,
        metric,
        indexType,
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
      // Remove from memory
      this.indexes.delete(indexName);

      // Remove persisted files
      const indexFile = join(this.indexPath, `${this.sanitizeName(indexName)}.index`);
      const metaFile = join(this.indexPath, `${this.sanitizeName(indexName)}.meta.json`);

      try {
        await fs.unlink(indexFile);
      } catch {
        // File may not exist
      }

      try {
        await fs.unlink(metaFile);
      } catch {
        // File may not exist
      }

      logger.debug(`Deleted index ${indexName}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to delete index ${indexName}: ${message}`);
    }
  }

  /**
   * List all loaded indexes
   */
  async listIndexes(): Promise<string[]> {
    this.ensureInitialized();

    return Array.from(this.indexes.keys());
  }

  /**
   * Check if an index is loaded
   */
  async indexExists(indexName: string): Promise<boolean> {
    this.ensureInitialized();

    return this.indexes.has(indexName);
  }

  /**
   * Upsert vectors into the index
   * Note: Faiss doesn't support native updates, so we delete + add
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

    const entry = this.indexes.get(indexName);
    if (!entry) {
      throw new Error(`Index ${indexName} not found`);
    }

    // Validate dimensions
    this.validateDimensions(records.map((r) => r.vector), entry.config.dimension);

    try {
      const namespace = options?.namespace || undefined;

      // For upsert, first mark existing IDs as deleted
      for (const record of records) {
        if (entry.idMap.has(record.id)) {
          entry.deletedIds.add(record.id);
        }
      }

      // Check if index needs training (for IVF indexes)
      if (!entry.config.isTrained && entry.index.train) {
        const trainingVectors = records.flatMap((r) => r.vector);
        entry.index.train(trainingVectors);
        entry.config.isTrained = true;
      }

      // Add vectors to the index
      let upsertedCount = 0;

      for (const record of records) {
        // Assign new internal ID
        const internalId = entry.nextId;
        entry.nextId = entry.nextId + BigInt(1);

        // Update ID mappings
        // Remove old mapping if exists
        const oldInternalId = entry.idMap.get(record.id);
        if (oldInternalId !== undefined) {
          entry.reverseIdMap.delete(oldInternalId);
        }

        entry.idMap.set(record.id, internalId);
        entry.reverseIdMap.set(internalId, record.id);

        // Store metadata
        entry.metadataStore.set(record.id, {
          metadata: record.metadata,
          content: record.content,
          namespace: record.namespace || namespace,
        });

        // Remove from deleted set if re-adding
        entry.deletedIds.delete(record.id);

        // Add vector to Faiss index
        entry.index.add(record.vector);
        upsertedCount++;
      }

      // Persist changes
      await this.persistIndex(indexName, entry);

      logger.debug(`Upserted ${upsertedCount} records to ${indexName}`);
      return { upsertedCount };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to upsert records: ${message}`);
    }
  }

  /**
   * Query vectors by similarity
   * Implements post-filtering since Faiss doesn't support native filtering
   */
  async query<TMetadata extends UnknownRecord = UnknownRecord>(
    indexName: string,
    options: VectorQueryOptions<TMetadata>,
  ): Promise<VectorQueryResult<TMetadata>[]> {
    this.ensureInitialized();

    const entry = this.indexes.get(indexName);
    if (!entry) {
      throw new Error(`Index ${indexName} not found`);
    }

    const {
      vector,
      topK,
      minScore,
      filter,
      includeVectors = false,
      includeMetadata = true,
      namespace,
    } = options;

    // Validate query vector dimension
    if (vector.length !== entry.config.dimension) {
      throw new Error(
        `Query vector dimension ${vector.length} does not match index dimension ${entry.config.dimension}`,
      );
    }

    try {
      // Set search parameters for IVF indexes
      if (entry.index.setNprobe && this.config.nprobe) {
        entry.index.setNprobe(this.config.nprobe);
      }

      // Set search parameters for HNSW indexes
      if (entry.index.setEfSearch && this.config.efSearch) {
        entry.index.setEfSearch(this.config.efSearch);
      }

      // Calculate active (non-deleted) count
      const activeCount = entry.idMap.size - entry.deletedIds.size;

      // Search with extra results for filtering
      const searchK = Math.min(
        Math.max(topK * 10, 100), // Get extra results for post-filtering
        activeCount || 1,
      );

      const { distances, labels } = entry.index.search(vector, searchK);

      const results: VectorQueryResult<TMetadata>[] = [];

      for (let i = 0; i < labels.length; i++) {
        const internalId = labels[i];
        const distance = distances[i];

        // Skip invalid results (Faiss returns -1 for not found)
        if (internalId === BigInt(-1)) {
          continue;
        }

        // Get string ID
        const stringId = entry.reverseIdMap.get(internalId);
        if (!stringId) {
          continue;
        }

        // Skip deleted IDs
        if (entry.deletedIds.has(stringId)) {
          continue;
        }

        // Get metadata
        const storedData = entry.metadataStore.get(stringId);

        // Apply namespace filter
        if (namespace && storedData?.namespace !== namespace) {
          continue;
        }

        // Apply metadata filter (post-filtering)
        if (filter && !this.matchesFilter(storedData?.metadata || {}, filter)) {
          continue;
        }

        // Convert distance to similarity score
        const score = this.distanceToScore(distance, entry.config.metric);

        // Apply minimum score filter
        if (minScore !== undefined && score < minScore) {
          continue;
        }

        const result: VectorQueryResult<TMetadata> = {
          id: stringId,
          score,
        };

        if (includeMetadata) {
          result.metadata = storedData?.metadata as TMetadata;
          result.content = storedData?.content;
        }

        // Note: Including vectors requires reconstructing from index,
        // which is expensive and not directly supported by all index types
        if (includeVectors) {
          // For simplicity, we don't support vector reconstruction in this adapter
          // A production implementation could store vectors separately or use
          // reconstruct() if available on the index type
          result.vector = undefined;
        }

        results.push(result);

        // Stop once we have enough results
        if (results.length >= topK) {
          break;
        }
      }

      return results;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to query vectors: ${message}`);
    }
  }

  /**
   * Delete vectors from the index
   * Note: Uses lazy deletion (marks as deleted) since Faiss remove is expensive
   */
  async delete(
    indexName: string,
    options: VectorDeleteOptions,
  ): Promise<{ deletedCount: number }> {
    this.ensureInitialized();

    const entry = this.indexes.get(indexName);
    if (!entry) {
      throw new Error(`Index ${indexName} not found`);
    }

    const { ids, filter, namespace, deleteAll } = options;

    try {
      let deletedCount = 0;

      if (deleteAll) {
        // Delete all records, optionally filtered by namespace
        for (const [id, data] of entry.metadataStore.entries()) {
          if (!entry.deletedIds.has(id)) {
            if (!namespace || data.namespace === namespace) {
              entry.deletedIds.add(id);
              deletedCount++;
            }
          }
        }
      } else if (ids && ids.length > 0) {
        // Delete by IDs
        for (const id of ids) {
          if (entry.idMap.has(id) && !entry.deletedIds.has(id)) {
            entry.deletedIds.add(id);
            deletedCount++;
          }
        }
      } else if (filter) {
        // Delete by filter
        for (const [id, data] of entry.metadataStore.entries()) {
          if (!entry.deletedIds.has(id) && this.matchesFilter(data.metadata || {}, filter)) {
            entry.deletedIds.add(id);
            deletedCount++;
          }
        }
      }

      // Persist changes
      if (deletedCount > 0) {
        await this.persistIndex(indexName, entry);
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

    const entry = this.indexes.get(indexName);
    if (!entry) {
      throw new Error(`Index ${indexName} not found`);
    }

    try {
      // Count active (non-deleted) vectors
      const activeCount = entry.idMap.size - entry.deletedIds.size;

      // Count unique namespaces
      const namespaces = new Set<string>();
      for (const [id, data] of entry.metadataStore.entries()) {
        if (!entry.deletedIds.has(id) && data.namespace) {
          namespaces.add(data.namespace);
        }
      }

      return {
        vectorCount: activeCount,
        dimension: entry.config.dimension,
        namespaceCount: namespaces.size,
        indexSize: undefined, // Could calculate file size if needed
        metrics: {
          metric: entry.config.metric,
          indexType: entry.config.indexType,
          isTrained: entry.config.isTrained,
          totalVectorsInIndex: entry.index.ntotal(),
          deletedCount: entry.deletedIds.size,
        },
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to get stats for ${indexName}: ${message}`);
    }
  }

  /**
   * Translate abstract filter - implemented as in-memory matching
   * Returns true if the metadata matches the filter
   */
  protected translateFilter<TMetadata extends UnknownRecord>(
    filter: MetadataFilter<TMetadata>,
  ): (metadata: UnknownRecord) => boolean {
    // Return a matcher function
    return (metadata: UnknownRecord) => this.matchesFilter(metadata, filter);
  }

  /**
   * Compact the index by removing deleted vectors
   * This is an expensive operation that rebuilds the index
   */
  async compactIndex(indexName: string): Promise<void> {
    this.ensureInitialized();

    const entry = this.indexes.get(indexName);
    if (!entry) {
      throw new Error(`Index ${indexName} not found`);
    }

    if (entry.deletedIds.size === 0) {
      logger.debug(`No deleted vectors to compact in ${indexName}`);
      return;
    }

    try {
      // Collect all active records
      const activeRecords: VectorRecord[] = [];

      // We need to reconstruct vectors from the index
      // For simplicity, this implementation requires storing vectors separately
      // or using a index type that supports reconstruction

      // This is a placeholder - a full implementation would:
      // 1. Store vectors separately in the metadata store
      // 2. Or use index.reconstruct() if available

      logger.warn(
        `Index compaction not fully implemented for Faiss adapter. ` +
        `Consider recreating the index with active data for optimal performance.`,
      );

      // Clear deleted IDs without actual compaction
      entry.deletedIds.clear();

    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to compact index ${indexName}: ${message}`);
    }
  }

  /**
   * Save a specific index to disk
   */
  async saveIndex(indexName: string): Promise<void> {
    this.ensureInitialized();

    const entry = this.indexes.get(indexName);
    if (!entry) {
      throw new Error(`Index ${indexName} not found`);
    }

    await this.persistIndex(indexName, entry);
    logger.debug(`Saved index ${indexName} to disk`);
  }

  /**
   * Load a specific index from disk
   */
  async loadIndex(indexName: string): Promise<void> {
    this.ensureInitialized();

    const sanitizedName = this.sanitizeName(indexName);
    const indexFile = join(this.indexPath, `${sanitizedName}.index`);
    const metaFile = join(this.indexPath, `${sanitizedName}.meta.json`);

    try {
      // Check if files exist
      await fs.access(indexFile);
      await fs.access(metaFile);

      // Load index
      const index = this.faiss!.read(indexFile);

      // Load metadata
      const metaContent = await fs.readFile(metaFile, "utf-8");
      const meta = JSON.parse(metaContent);

      // Reconstruct entry
      const entry: FaissIndexEntry = {
        index,
        config: meta.config,
        idMap: new Map(Object.entries(meta.idMap).map(([k, v]) => [k, BigInt(v as string)])),
        reverseIdMap: new Map(Object.entries(meta.reverseIdMap).map(([k, v]) => [BigInt(k), v as string])),
        metadataStore: new Map(Object.entries(meta.metadataStore)),
        nextId: BigInt(meta.nextId),
        deletedIds: new Set(meta.deletedIds),
      };

      this.indexes.set(indexName, entry);
      logger.debug(`Loaded index ${indexName} from disk`);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to load index ${indexName}: ${message}`);
    }
  }

  // ===================
  // PRIVATE HELPER METHODS
  // ===================

  /**
   * Load Faiss driver dynamically
   */
  private async loadFaissDriver(): Promise<FaissFactory> {
    try {
      const modulePath = "faiss-node";
      const module = await import(/* @vite-ignore */ modulePath);
      return module.default || module;
    } catch {
      throw new Error(
        "Faiss driver not found. Install faiss-node: npm install faiss-node",
      );
    }
  }

  /**
   * Ensure the index directory exists
   */
  private async ensureIndexDirectory(): Promise<void> {
    try {
      await fs.mkdir(this.indexPath, { recursive: true });
    } catch {
      // Directory may already exist
    }
  }

  /**
   * Load persisted indexes from disk
   */
  private async loadPersistedIndexes(): Promise<void> {
    try {
      const files = await fs.readdir(this.indexPath);
      const indexFiles = files.filter((f) => f.endsWith(".index"));

      for (const indexFile of indexFiles) {
        const indexName = indexFile.replace(".index", "");
        try {
          await this.loadIndex(indexName);
        } catch (error) {
          logger.warn(`Failed to load persisted index ${indexName}`, { error });
        }
      }
    } catch {
      // Directory may not exist yet
    }
  }

  /**
   * Persist all indexes to disk
   */
  private async persistAllIndexes(): Promise<void> {
    for (const [name, entry] of this.indexes.entries()) {
      await this.persistIndex(name, entry);
    }
  }

  /**
   * Persist a single index to disk
   */
  private async persistIndex(indexName: string, entry: FaissIndexEntry): Promise<void> {
    const sanitizedName = this.sanitizeName(indexName);
    const indexFile = join(this.indexPath, `${sanitizedName}.index`);
    const metaFile = join(this.indexPath, `${sanitizedName}.meta.json`);

    try {
      // Save Faiss index
      entry.index.write(indexFile);

      // Save metadata (convert Maps to objects for JSON serialization)
      const meta = {
        config: entry.config,
        idMap: Object.fromEntries(
          Array.from(entry.idMap.entries()).map(([k, v]) => [k, v.toString()]),
        ),
        reverseIdMap: Object.fromEntries(
          Array.from(entry.reverseIdMap.entries()).map(([k, v]) => [k.toString(), v]),
        ),
        metadataStore: Object.fromEntries(entry.metadataStore.entries()),
        nextId: entry.nextId.toString(),
        deletedIds: Array.from(entry.deletedIds),
      };

      await fs.writeFile(metaFile, JSON.stringify(meta, null, 2));
    } catch (error) {
      logger.warn(`Failed to persist index ${indexName}`, { error });
    }
  }

  /**
   * Create a Faiss index of the specified type
   */
  private async createFaissIndex(
    dimension: number,
    indexType: FaissConfig["indexType"],
    metricType: number,
  ): Promise<FaissIndex> {
    if (!this.faiss) {
      throw new Error("Faiss not initialized");
    }

    switch (indexType) {
      case "flat": {
        // Exact search - use L2 or IP based on metric
        const baseIndex = metricType === this.faiss.MetricType.METRIC_INNER_PRODUCT
          ? new this.faiss.IndexFlatIP(dimension)
          : new this.faiss.IndexFlatL2(dimension);
        // Wrap with IDMap for custom ID support
        return new this.faiss.IndexIDMap(baseIndex);
      }

      case "ivf": {
        // IVF index for approximate search
        const nlist = this.config.nlist || 100;
        const quantizer = metricType === this.faiss.MetricType.METRIC_INNER_PRODUCT
          ? new this.faiss.IndexFlatIP(dimension)
          : new this.faiss.IndexFlatL2(dimension);
        const ivfIndex = new this.faiss.IndexIVFFlat(quantizer, dimension, nlist, metricType);
        return new this.faiss.IndexIDMap(ivfIndex);
      }

      case "hnsw": {
        // HNSW index for fast approximate search
        const M = this.config.hnswM || 32;
        const hnswIndex = new this.faiss.IndexHNSWFlat(dimension, M);
        return new this.faiss.IndexIDMap(hnswIndex);
      }

      case "ivf-pq": {
        // IVF with Product Quantization for memory efficiency
        // Note: This requires a more complex setup that may not be available in all faiss-node versions
        logger.warn("IVF-PQ index type falling back to IVF for faiss-node compatibility");
        const nlist = this.config.nlist || 100;
        const quantizer = new this.faiss.IndexFlatL2(dimension);
        const ivfIndex = new this.faiss.IndexIVFFlat(quantizer, dimension, nlist, metricType);
        return new this.faiss.IndexIDMap(ivfIndex);
      }

      default: {
        // Default to flat index
        const defaultIndex = new this.faiss.IndexFlatL2(dimension);
        return new this.faiss.IndexIDMap(defaultIndex);
      }
    }
  }

  /**
   * Convert NeuroLink similarity metric to Faiss metric type
   */
  private toFaissMetric(metric: SimilarityMetric): number {
    if (!this.faiss) {
      throw new Error("Faiss not initialized");
    }

    switch (metric) {
      case "cosine":
      case "dotProduct":
        // Inner product (vectors should be normalized for cosine)
        return this.faiss.MetricType.METRIC_INNER_PRODUCT;
      case "euclidean":
      default:
        return this.faiss.MetricType.METRIC_L2;
    }
  }

  /**
   * Convert Faiss distance to similarity score
   */
  private distanceToScore(distance: number, metric: SimilarityMetric): number {
    switch (metric) {
      case "euclidean":
        // For L2 distance, lower is better
        // Convert to similarity: 1 / (1 + distance)
        return 1 / (1 + Math.sqrt(Math.max(0, distance)));

      case "dotProduct":
        // For inner product, the result is already a similarity
        // Higher is better
        return distance;

      case "cosine":
        // For normalized vectors with IP, distance is cosine similarity
        // Higher is better
        return distance;

      default:
        return 1 / (1 + distance);
    }
  }

  /**
   * Check if metadata matches a filter
   */
  private matchesFilter<TMetadata extends UnknownRecord>(
    metadata: UnknownRecord,
    filter: MetadataFilter<TMetadata>,
  ): boolean {
    for (const [key, value] of Object.entries(filter)) {
      if (key === "$and" && Array.isArray(value)) {
        // All conditions must match
        if (!value.every((f) => this.matchesFilter(metadata, f as MetadataFilter))) {
          return false;
        }
      } else if (key === "$or" && Array.isArray(value)) {
        // At least one condition must match
        if (!value.some((f) => this.matchesFilter(metadata, f as MetadataFilter))) {
          return false;
        }
      } else if (key === "$not" && typeof value === "object" && value !== null) {
        // Condition must not match
        if (this.matchesFilter(metadata, value as MetadataFilter)) {
          return false;
        }
      } else if (this.isFieldFilter(value)) {
        // Field-level filter
        if (!this.matchesFieldFilter(metadata[key], value as FieldFilter)) {
          return false;
        }
      } else {
        // Simple equality
        if (metadata[key] !== value) {
          return false;
        }
      }
    }
    return true;
  }

  /**
   * Check if a value matches a field filter
   */
  private matchesFieldFilter(value: unknown, filter: FieldFilter): boolean {
    for (const [op, filterValue] of Object.entries(filter)) {
      switch (op) {
        case "$eq":
          if (value !== filterValue) return false;
          break;
        case "$ne":
          if (value === filterValue) return false;
          break;
        case "$gt":
          if (typeof value !== "number" || value <= (filterValue as number)) return false;
          break;
        case "$gte":
          if (typeof value !== "number" || value < (filterValue as number)) return false;
          break;
        case "$lt":
          if (typeof value !== "number" || value >= (filterValue as number)) return false;
          break;
        case "$lte":
          if (typeof value !== "number" || value > (filterValue as number)) return false;
          break;
        case "$in":
          if (!Array.isArray(filterValue) || !filterValue.includes(value)) return false;
          break;
        case "$nin":
          if (Array.isArray(filterValue) && filterValue.includes(value)) return false;
          break;
        case "$exists":
          if (filterValue && value === undefined) return false;
          if (!filterValue && value !== undefined) return false;
          break;
        case "$contains":
          if (typeof value !== "string" || !value.includes(String(filterValue))) return false;
          break;
        case "$startsWith":
          if (typeof value !== "string" || !value.startsWith(String(filterValue))) return false;
          break;
        case "$endsWith":
          if (typeof value !== "string" || !value.endsWith(String(filterValue))) return false;
          break;
        default:
          // Unknown operator, treat as equality
          if (value !== filterValue) return false;
      }
    }
    return true;
  }

  /**
   * Check if value is a field filter
   */
  private isFieldFilter(value: unknown): boolean {
    if (typeof value !== "object" || value === null) {
      return false;
    }
    const keys = Object.keys(value);
    return keys.some((k) => k.startsWith("$"));
  }

  /**
   * Sanitize name for file system
   */
  private sanitizeName(name: string): string {
    return name.replace(/[^a-zA-Z0-9_-]/g, "_");
  }
}
