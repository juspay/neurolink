/**
 * Registry for all vector store implementations
 * Uses dynamic imports to avoid circular dependencies
 * Following NeuroLink's ProviderRegistry pattern
 */

import { VectorStoreName } from "../types/vectorTypes.js";
import { logger } from "../utils/logger.js";
// Import types only (these are erased at runtime, so no circular dependency issues)
import type { PineconeConfig } from "./cloud/pinecone.js";
import type { QdrantConfig } from "./cloud/qdrant.js";
import type { PgvectorConfig } from "./database/pgvector.js";
import type { ChromaConfig } from "./embedded/chroma.js";
import { VectorStoreFactory } from "./vectorStoreFactory.js";

/**
 * Registry for all vector store implementations
 * Uses dynamic imports to avoid circular dependencies
 */
export class VectorStoreRegistry {
  private static registered = false;

  /**
   * Register all vector stores with the factory
   * Uses dynamic imports to prevent circular dependency issues
   */
  static async registerAllStores(): Promise<void> {
    if (VectorStoreRegistry.registered) {
      return;
    }

    try {
      // ========================================
      // Cloud-native stores (Tier 1 & 2)
      // ========================================

      // Pinecone - Market leader managed service
      VectorStoreFactory.registerStore(
        VectorStoreName.PINECONE,
        async (config) => {
          const { PineconeStore } = await import("./cloud/pinecone.js");
          return new PineconeStore(config as PineconeConfig);
        },
        ["pinecone"],
      );

      // Qdrant - High performance open source
      VectorStoreFactory.registerStore(
        VectorStoreName.QDRANT,
        async (config) => {
          const { QdrantStore } = await import("./cloud/qdrant.js");
          return new QdrantStore(config as QdrantConfig);
        },
        ["qdrant"],
      );

      // ========================================
      // Database extensions (Tier 1)
      // ========================================

      // pgvector - PostgreSQL extension (highest priority)
      VectorStoreFactory.registerStore(
        VectorStoreName.PGVECTOR,
        async (config) => {
          const { PgvectorStore } = await import("./database/pgvector.js");
          return new PgvectorStore(config as PgvectorConfig);
        },
        ["pgvector", "postgres", "postgresql", "pg"],
      );

      // ========================================
      // Embedded/local stores (Tier 3)
      // ========================================

      // Chroma - Lightweight embedded store
      VectorStoreFactory.registerStore(
        VectorStoreName.CHROMA,
        async (config) => {
          const { ChromaStore } = await import("./embedded/chroma.js");
          return new ChromaStore(config as ChromaConfig);
        },
        ["chroma", "chromadb"],
      );

      // Mark registration as complete
      VectorStoreRegistry.registered = true;
      VectorStoreFactory.markAsRegistered();

      logger.debug("All vector stores registered successfully", {
        stores: VectorStoreFactory.getAvailableStores(),
      });
    } catch (error) {
      logger.error("Failed to register vector stores", { error });
      throw error;
    }
  }

  /**
   * Check if stores have been registered
   */
  static isRegistered(): boolean {
    return VectorStoreRegistry.registered;
  }

  /**
   * Clear all registrations (for testing)
   */
  static clearRegistrations(): void {
    VectorStoreRegistry.registered = false;
    VectorStoreFactory.clearRegistrations();
  }

  /**
   * Register a single store manually
   * Useful for adding custom stores at runtime
   */
  static async registerStore(
    name: VectorStoreName | string,
    importPath: string,
    className: string,
    aliases: string[] = [],
  ): Promise<void> {
    VectorStoreFactory.registerStore(
      name,
      async (config) => {
        const module = await import(importPath);
        const StoreClass = module[className];
        return new StoreClass(config);
      },
      aliases,
    );
  }
}
