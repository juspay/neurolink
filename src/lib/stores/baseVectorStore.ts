/**
 * Abstract base class for all vector store implementations
 * Follows NeuroLink's BaseProvider pattern with composition over inheritance
 */

import type { UnknownRecord } from "../types/common.js";
import type { MetadataFilter } from "../types/vectorFilterTypes.js";
import type {
  VectorDeleteOptions,
  VectorDeleteResult,
  VectorIndexConfig,
  VectorQueryOptions,
  VectorQueryResult,
  VectorRecord,
  VectorStoreConfig,
  VectorStoreHealth,
  VectorStoreName,
  VectorStoreStats,
  VectorUpsertOptions,
} from "../types/vectorTypes.js";
import { logger } from "../utils/logger.js";

/**
 * Abstract base class for all vector store implementations
 * Follows NeuroLink's BaseProvider pattern
 */
export abstract class BaseVectorStore<
  TConfig extends VectorStoreConfig = VectorStoreConfig,
> {
  protected readonly config: TConfig;
  protected readonly storeName: VectorStoreName;
  protected initialized: boolean = false;

  constructor(config: TConfig, storeName: VectorStoreName) {
    this.config = config;
    this.storeName = storeName;
  }

  // ===================
  // ABSTRACT METHODS (Must be implemented by each store)
  // ===================

  /**
   * Initialize connection to the vector store
   */
  abstract connect(): Promise<void>;

  /**
   * Close connection to the vector store
   */
  abstract disconnect(): Promise<void>;

  /**
   * Create a new index/collection
   */
  abstract createIndex(config: VectorIndexConfig): Promise<void>;

  /**
   * Delete an index/collection
   */
  abstract deleteIndex(indexName: string): Promise<void>;

  /**
   * List all indexes/collections
   */
  abstract listIndexes(): Promise<string[]>;

  /**
   * Check if an index exists
   */
  abstract indexExists(indexName: string): Promise<boolean>;

  /**
   * Upsert vectors (insert or update)
   */
  abstract upsert<TMetadata extends UnknownRecord = UnknownRecord>(
    indexName: string,
    records: VectorRecord<TMetadata>[],
    options?: VectorUpsertOptions,
  ): Promise<{ upsertedCount: number }>;

  /**
   * Query vectors by similarity
   */
  abstract query<TMetadata extends UnknownRecord = UnknownRecord>(
    indexName: string,
    options: VectorQueryOptions<TMetadata>,
  ): Promise<VectorQueryResult<TMetadata>[]>;

  /**
   * Delete vectors
   * Returns VectorDeleteResult with deletedCount (undefined when provider cannot determine count)
   */
  abstract delete(
    indexName: string,
    options: VectorDeleteOptions,
  ): Promise<VectorDeleteResult>;

  /**
   * Update an individual vector's embedding and/or metadata
   */
  abstract updateVector<TMetadata extends UnknownRecord = UnknownRecord>(
    indexName: string,
    id: string,
    update: { vector?: number[]; metadata?: TMetadata },
  ): Promise<void>;

  /**
   * Get index statistics
   */
  abstract getStats(indexName: string): Promise<VectorStoreStats>;

  /**
   * Convert abstract filter to provider-specific format
   */
  protected abstract translateFilter<TMetadata extends UnknownRecord>(
    filter: MetadataFilter<TMetadata>,
  ): unknown;

  // ===================
  // COMMON METHODS (Shared implementations)
  // ===================

  /**
   * Delete a single vector by ID (convenience method)
   */
  async deleteVector(indexName: string, id: string): Promise<void> {
    await this.delete(indexName, { ids: [id] });
  }

  /**
   * Get store health status
   */
  async healthCheck(): Promise<VectorStoreHealth> {
    const startTime = Date.now();
    try {
      // Simple connectivity test
      await this.listIndexes();
      return {
        healthy: true,
        status: "connected",
        latencyMs: Date.now() - startTime,
        lastChecked: new Date(),
      };
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
   * Upsert in batches for large datasets
   */
  async batchUpsert<TMetadata extends UnknownRecord = UnknownRecord>(
    indexName: string,
    records: VectorRecord<TMetadata>[],
    options?: VectorUpsertOptions & { batchSize?: number },
  ): Promise<{ upsertedCount: number }> {
    const batchSize = options?.batchSize || 100;
    let totalUpserted = 0;

    for (let i = 0; i < records.length; i += batchSize) {
      const batch = records.slice(i, i + batchSize);
      const result = await this.upsert(indexName, batch, options);
      totalUpserted += result.upsertedCount;

      if (this.config.debug) {
        logger.debug(
          `Batch upsert progress: ${totalUpserted}/${records.length}`,
          {
            store: this.storeName,
            index: indexName,
          },
        );
      }
    }

    return { upsertedCount: totalUpserted };
  }

  /**
   * Query with automatic pagination
   */
  async queryAll<TMetadata extends UnknownRecord = UnknownRecord>(
    indexName: string,
    options: VectorQueryOptions<TMetadata> & { maxResults?: number },
  ): Promise<VectorQueryResult<TMetadata>[]> {
    const maxResults = options.maxResults || 1000;
    const pageSize = Math.min(options.topK, 100);

    // Note: Pagination strategy varies by provider
    // This is a simplified implementation
    const queryResults = await this.query(indexName, {
      ...options,
      topK: Math.min(maxResults, pageSize),
    });

    return queryResults.slice(0, maxResults);
  }

  /**
   * Get the store name
   */
  getStoreName(): VectorStoreName {
    return this.storeName;
  }

  /**
   * Check if store is initialized
   */
  isInitialized(): boolean {
    return this.initialized;
  }

  /**
   * Ensure store is initialized before operations
   */
  protected ensureInitialized(): void {
    if (!this.initialized) {
      throw new Error(
        `Vector store ${this.storeName} not initialized. Call connect() first.`,
      );
    }
  }

  /**
   * Validate vector dimensions
   */
  protected validateDimensions(
    vectors: number[][],
    expectedDimension?: number,
  ): void {
    if (vectors.length === 0) {
      return;
    }

    const firstDim = vectors[0].length;
    for (const vec of vectors) {
      if (vec.length !== firstDim) {
        throw new Error(
          `Inconsistent vector dimensions: expected ${firstDim}, got ${vec.length}`,
        );
      }
      if (expectedDimension && vec.length !== expectedDimension) {
        throw new Error(
          `Vector dimension mismatch: expected ${expectedDimension}, got ${vec.length}`,
        );
      }
    }
  }

  /**
   * Get configuration value with fallback
   */
  protected getConfigValue<T>(key: keyof TConfig, defaultValue: T): T {
    const value = this.config[key];
    return value !== undefined ? (value as T) : defaultValue;
  }

  /**
   * Log debug message if debug mode is enabled
   */
  protected logDebug(message: string, context?: UnknownRecord): void {
    if (this.config.debug) {
      logger.debug(`[${this.storeName}] ${message}`, context);
    }
  }

  /**
   * Log info message
   */
  protected logInfo(message: string, context?: UnknownRecord): void {
    logger.info(`[${this.storeName}] ${message}`, context);
  }

  /**
   * Log error message
   */
  protected logError(message: string, error?: unknown): void {
    logger.error(`[${this.storeName}] ${message}`, { error });
  }
}

// Re-export the config type for convenience
export type { VectorStoreConfig };
