/**
 * Vector Store Factory
 *
 * Factory for creating vector store instances based on configuration.
 * Uses dynamic imports to avoid loading unnecessary dependencies.
 *
 * @module memory/vectorStores/vectorStoreFactory
 * @since 9.0.0
 */

import type {
  MemoryVectorStore,
  VectorStoreConfig,
} from "../../types/index.js";
import { logger } from "../../utils/logger.js";

/**
 * Create a vector store instance based on configuration
 *
 * @param config - Vector store configuration
 * @returns Promise<MemoryVectorStore> - Configured vector store instance
 */
export async function createVectorStore(
  config: VectorStoreConfig,
): Promise<MemoryVectorStore> {
  logger.debug("[VectorStoreFactory] Creating vector store", {
    provider: config.provider,
    collectionName: config.collectionName,
  });

  switch (config.provider) {
    case "memory": {
      const { InMemoryVectorStore } = await import("./inMemoryVectorStore.js");
      return new InMemoryVectorStore();
    }

    case "redis": {
      const { RedisVectorStore } = await import("./redisVectorStore.js");
      return new RedisVectorStore(
        config.config as import("../../types/index.js").RedisVectorConfig,
      );
    }

    case "qdrant": {
      const { QdrantVectorStore } = await import("./qdrantVectorStore.js");
      return new QdrantVectorStore(
        config.config as import("../../types/index.js").QdrantVectorConfig,
      );
    }

    case "pinecone": {
      const { PineconeVectorStore } = await import("./pineconeVectorStore.js");
      return new PineconeVectorStore(
        config.config as import("../../types/index.js").PineconeVectorConfig,
      );
    }

    case "pgvector": {
      const { PGVectorStore } = await import("./pgvectorStore.js");
      return new PGVectorStore(
        config.config as import("../../types/index.js").PGVectorConfig,
      );
    }

    default: {
      // Fall back to in-memory vector store
      logger.warn(
        `[VectorStoreFactory] Unknown provider: ${config.provider}, falling back to memory`,
      );
      const { InMemoryVectorStore } = await import("./inMemoryVectorStore.js");
      return new InMemoryVectorStore();
    }
  }
}

/**
 * Get the list of supported vector store providers
 */
export function getSupportedVectorStoreProviders(): string[] {
  return ["memory", "redis", "qdrant", "pinecone", "pgvector"];
}
