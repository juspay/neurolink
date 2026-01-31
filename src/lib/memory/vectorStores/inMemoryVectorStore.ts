/**
 * In-Memory Vector Store
 *
 * A simple in-memory vector store implementation for development and testing.
 * Uses brute-force cosine similarity search.
 *
 * @module memory/vectorStores/inMemoryVectorStore
 * @since 9.0.0
 */

import type {
  CollectionConfig,
  VectorDeleteFilter,
  VectorEntry,
  VectorSearchQuery,
  VectorSearchResult,
  MemoryVectorStore,
  VectorStoreStats,
} from "../../types/index.js";
import { logger } from "../../utils/logger.js";

/**
 * In-memory vector store for development and testing
 *
 * Features:
 * - Simple Map-based storage
 * - Brute-force cosine similarity search
 * - Full metadata filtering support
 * - No external dependencies
 *
 * Note: Suitable for small datasets (<10k vectors)
 */
export class InMemoryVectorStore implements MemoryVectorStore {
  private vectors: Map<string, VectorEntry> = new Map();
  private collectionConfig?: CollectionConfig;

  /**
   * Initialize the vector store
   */
  async initialize(): Promise<void> {
    logger.debug("[InMemoryVectorStore] Initialized");
  }

  /**
   * Create or ensure collection exists
   */
  async ensureCollection(config: CollectionConfig): Promise<void> {
    this.collectionConfig = config;
    logger.debug("[InMemoryVectorStore] Collection configured", {
      name: config.name,
      dimensions: config.dimensions,
      metric: config.metric,
    });
  }

  /**
   * Upsert vectors into the store
   */
  async upsert(vectors: VectorEntry[]): Promise<void> {
    for (const entry of vectors) {
      this.vectors.set(entry.id, entry);
    }
    logger.debug("[InMemoryVectorStore] Upserted vectors", {
      count: vectors.length,
      totalVectors: this.vectors.size,
    });
  }

  /**
   * Search for similar vectors
   */
  async search(query: VectorSearchQuery): Promise<VectorSearchResult[]> {
    const results: VectorSearchResult[] = [];

    this.vectors.forEach((entry, id) => {
      // Apply filters
      if (!this.matchesFilter(entry, query.filter)) {
        return;
      }

      // Calculate cosine similarity
      const similarity = this.cosineSimilarity(query.vector, entry.vector);

      // Apply threshold filter
      if (query.threshold !== undefined && similarity < query.threshold) {
        return;
      }

      results.push({
        id,
        score: similarity,
        metadata: entry.metadata,
      });
    });

    // Sort by score descending and limit to topK
    const sortedResults = results
      .sort((a, b) => b.score - a.score)
      .slice(0, query.topK);

    logger.debug("[InMemoryVectorStore] Search completed", {
      totalVectors: this.vectors.size,
      matchedBeforeThreshold: results.length,
      returned: sortedResults.length,
      topK: query.topK,
      threshold: query.threshold,
    });

    return sortedResults;
  }

  /**
   * Delete vectors by filter
   */
  async delete(filter: VectorDeleteFilter): Promise<number> {
    let deleted = 0;

    // Delete by IDs
    if (filter.ids) {
      for (const id of filter.ids) {
        if (this.vectors.delete(id)) {
          deleted++;
        }
      }
    }

    // Delete by threadId
    if (filter.threadId) {
      const toDelete: string[] = [];
      this.vectors.forEach((entry, id) => {
        if (entry.metadata.threadId === filter.threadId) {
          toDelete.push(id);
        }
      });
      for (const id of toDelete) {
        this.vectors.delete(id);
        deleted++;
      }
    }

    // Delete by resourceId
    if (filter.resourceId) {
      const toDelete: string[] = [];
      this.vectors.forEach((entry, id) => {
        if (entry.metadata.resourceId === filter.resourceId) {
          toDelete.push(id);
        }
      });
      for (const id of toDelete) {
        this.vectors.delete(id);
        deleted++;
      }
    }

    logger.debug("[InMemoryVectorStore] Deleted vectors", {
      deleted,
      remaining: this.vectors.size,
    });

    return deleted;
  }

  /**
   * Get collection statistics
   */
  async getStats(): Promise<VectorStoreStats> {
    return {
      vectorCount: this.vectors.size,
      dimensions: this.collectionConfig?.dimensions ?? 0,
    };
  }

  /**
   * Close the vector store
   */
  async close(): Promise<void> {
    this.vectors.clear();
    this.collectionConfig = undefined;
    logger.debug("[InMemoryVectorStore] Closed");
  }

  /**
   * Check if an entry matches the filter
   */
  private matchesFilter(
    entry: VectorEntry,
    filter?: VectorSearchQuery["filter"],
  ): boolean {
    if (!filter) {
      return true;
    }

    // Filter by threadId
    if (filter.threadId) {
      const threadIds = Array.isArray(filter.threadId)
        ? filter.threadId
        : [filter.threadId];
      if (!threadIds.includes(entry.metadata.threadId)) {
        return false;
      }
    }

    // Filter by resourceId
    if (filter.resourceId && entry.metadata.resourceId !== filter.resourceId) {
      return false;
    }

    // Filter by role
    if (filter.role) {
      const roles = Array.isArray(filter.role) ? filter.role : [filter.role];
      if (!roles.includes(entry.metadata.role)) {
        return false;
      }
    }

    // Filter by timestamp range
    if (filter.timestampRange) {
      const timestamp = new Date(entry.metadata.timestamp).getTime();

      if (filter.timestampRange.start) {
        const startTime = new Date(filter.timestampRange.start).getTime();
        if (timestamp < startTime) {
          return false;
        }
      }

      if (filter.timestampRange.end) {
        const endTime = new Date(filter.timestampRange.end).getTime();
        if (timestamp > endTime) {
          return false;
        }
      }
    }

    return true;
  }

  /**
   * Calculate cosine similarity between two vectors
   */
  private cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) {
      logger.warn("[InMemoryVectorStore] Vector dimension mismatch", {
        aLength: a.length,
        bLength: b.length,
      });
      return 0;
    }

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }

    const magnitude = Math.sqrt(normA) * Math.sqrt(normB);
    return magnitude === 0 ? 0 : dotProduct / magnitude;
  }
}
