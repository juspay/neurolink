/**
 * Memory Factory
 *
 * Factory for creating memory system components using the BaseFactory pattern.
 * Supports dynamic registration and lazy loading of:
 * - Vector stores (InMemory, Redis, Qdrant, PGVector, Pinecone)
 * - Embedders (OpenAI, Vertex, Ollama, Mistral, Cohere, Bedrock)
 * - Working memory storage (InMemory, Redis)
 */

import { BaseFactory } from "../core/infrastructure/index.js";
import type {
  FactoryFunction,
  MemoryVectorStore,
  Embedder,
  WorkingMemoryStorageBackend,
  VectorStoreConfig,
  VectorStoreFactoryConfig,
  EmbedderConfig,
  MemoryStorageConfig,
} from "../types/index.js";
import { logger } from "../utils/logger.js";

// =============================================================================
// Vector Store Factory
// =============================================================================

/**
 * Factory for creating vector store instances
 */
class VectorStoreFactoryImpl extends BaseFactory<
  MemoryVectorStore,
  VectorStoreFactoryConfig
> {
  private static instance: VectorStoreFactoryImpl | null = null;

  private constructor() {
    super();
  }

  static getInstance(): VectorStoreFactoryImpl {
    if (!VectorStoreFactoryImpl.instance) {
      VectorStoreFactoryImpl.instance = new VectorStoreFactoryImpl();
    }
    return VectorStoreFactoryImpl.instance;
  }

  protected async registerAll(): Promise<void> {
    // Register in-memory vector store (always available)
    this.register(
      "memory",
      async () => {
        const { InMemoryVectorStore } =
          await import("./layers/SemanticMemoryLayer.js");
        return new InMemoryVectorStore();
      },
      ["inmemory", "mem"],
      { description: "In-memory vector store for development/testing" },
    );

    // Register Redis vector store
    this.register(
      "redis",
      async (_config) => {
        // Redis vector store implementation would be imported here
        // For now, fall back to in-memory
        logger.warn(
          "[VectorStoreFactory] Redis vector store not yet implemented, using in-memory",
        );
        const { InMemoryVectorStore } =
          await import("./layers/SemanticMemoryLayer.js");
        return new InMemoryVectorStore();
      },
      ["redisearch", "redis-vector"],
      { description: "Redis Stack with RediSearch for production" },
    );

    // Register Qdrant vector store
    this.register(
      "qdrant",
      async (_config) => {
        // Qdrant implementation would be imported here
        logger.warn(
          "[VectorStoreFactory] Qdrant vector store not yet implemented, using in-memory",
        );
        const { InMemoryVectorStore } =
          await import("./layers/SemanticMemoryLayer.js");
        return new InMemoryVectorStore();
      },
      [],
      { description: "Qdrant dedicated vector database" },
    );

    // Register PGVector vector store
    this.register(
      "pgvector",
      async (_config) => {
        // PGVector implementation would be imported here
        logger.warn(
          "[VectorStoreFactory] PGVector not yet implemented, using in-memory",
        );
        const { InMemoryVectorStore } =
          await import("./layers/SemanticMemoryLayer.js");
        return new InMemoryVectorStore();
      },
      ["postgres", "postgresql"],
      { description: "PostgreSQL with pgvector extension" },
    );

    // Register Pinecone vector store
    this.register(
      "pinecone",
      async (_config) => {
        // Pinecone implementation would be imported here
        logger.warn(
          "[VectorStoreFactory] Pinecone not yet implemented, using in-memory",
        );
        const { InMemoryVectorStore } =
          await import("./layers/SemanticMemoryLayer.js");
        return new InMemoryVectorStore();
      },
      [],
      { description: "Pinecone managed vector database" },
    );

    logger.debug("[VectorStoreFactory] Registered all vector stores", {
      providers: this.getAvailable(),
    });
  }
}

// =============================================================================
// Embedder Factory
// =============================================================================

/**
 * Factory for creating embedder instances
 */
class EmbedderFactoryImpl extends BaseFactory<Embedder, EmbedderConfig> {
  private static instance: EmbedderFactoryImpl | null = null;

  private constructor() {
    super();
  }

  static getInstance(): EmbedderFactoryImpl {
    if (!EmbedderFactoryImpl.instance) {
      EmbedderFactoryImpl.instance = new EmbedderFactoryImpl();
    }
    return EmbedderFactoryImpl.instance;
  }

  protected async registerAll(): Promise<void> {
    // Register mock embedder (always available for testing)
    this.register(
      "mock",
      async (config) => {
        const { MockEmbedder } =
          await import("./layers/SemanticMemoryLayer.js");
        return new MockEmbedder(
          config?.config?.dimensions || 384,
          config?.model || "mock-embed",
        );
      },
      ["test", "development"],
      { description: "Mock embedder for development/testing", dimensions: 384 },
    );

    // Register OpenAI embedder
    this.register(
      "openai",
      async (config) => {
        // OpenAI embedder implementation would be imported here
        logger.warn(
          "[EmbedderFactory] OpenAI embedder not yet implemented, using mock",
        );
        const { MockEmbedder } =
          await import("./layers/SemanticMemoryLayer.js");
        return new MockEmbedder(
          1536,
          config?.model || "text-embedding-3-small",
        );
      },
      ["openai-embed"],
      { description: "OpenAI text embeddings", dimensions: 1536 },
    );

    // Register Vertex AI embedder
    this.register(
      "vertex",
      async (config) => {
        logger.warn(
          "[EmbedderFactory] Vertex embedder not yet implemented, using mock",
        );
        const { MockEmbedder } =
          await import("./layers/SemanticMemoryLayer.js");
        return new MockEmbedder(768, config?.model || "text-embedding-004");
      },
      ["google", "google-vertex"],
      { description: "Google Vertex AI embeddings", dimensions: 768 },
    );

    // Register Ollama embedder
    this.register(
      "ollama",
      async (config) => {
        logger.warn(
          "[EmbedderFactory] Ollama embedder not yet implemented, using mock",
        );
        const { MockEmbedder } =
          await import("./layers/SemanticMemoryLayer.js");
        return new MockEmbedder(384, config?.model || "nomic-embed-text");
      },
      ["local"],
      { description: "Local Ollama embeddings", dimensions: 384 },
    );

    // Register Mistral embedder
    this.register(
      "mistral",
      async (config) => {
        logger.warn(
          "[EmbedderFactory] Mistral embedder not yet implemented, using mock",
        );
        const { MockEmbedder } =
          await import("./layers/SemanticMemoryLayer.js");
        return new MockEmbedder(1024, config?.model || "mistral-embed");
      },
      [],
      { description: "Mistral AI embeddings", dimensions: 1024 },
    );

    // Register Cohere embedder
    this.register(
      "cohere",
      async (config) => {
        logger.warn(
          "[EmbedderFactory] Cohere embedder not yet implemented, using mock",
        );
        const { MockEmbedder } =
          await import("./layers/SemanticMemoryLayer.js");
        return new MockEmbedder(1024, config?.model || "embed-english-v3.0");
      },
      [],
      { description: "Cohere embeddings", dimensions: 1024 },
    );

    // Register Bedrock embedder
    this.register(
      "bedrock",
      async (config) => {
        logger.warn(
          "[EmbedderFactory] Bedrock embedder not yet implemented, using mock",
        );
        const { MockEmbedder } =
          await import("./layers/SemanticMemoryLayer.js");
        return new MockEmbedder(
          1536,
          config?.model || "amazon.titan-embed-text-v1",
        );
      },
      ["aws", "amazon"],
      { description: "AWS Bedrock Titan embeddings", dimensions: 1536 },
    );

    logger.debug("[EmbedderFactory] Registered all embedders", {
      providers: this.getAvailable(),
    });
  }
}

// =============================================================================
// Working Memory Storage Factory
// =============================================================================

/**
 * Factory for creating working memory storage instances
 */
class WorkingMemoryStorageBackendFactoryImpl extends BaseFactory<
  WorkingMemoryStorageBackend,
  MemoryStorageConfig
> {
  private static instance: WorkingMemoryStorageBackendFactoryImpl | null = null;

  private constructor() {
    super();
  }

  static getInstance(): WorkingMemoryStorageBackendFactoryImpl {
    if (!WorkingMemoryStorageBackendFactoryImpl.instance) {
      WorkingMemoryStorageBackendFactoryImpl.instance =
        new WorkingMemoryStorageBackendFactoryImpl();
    }
    return WorkingMemoryStorageBackendFactoryImpl.instance;
  }

  protected async registerAll(): Promise<void> {
    // Register in-memory storage
    this.register(
      "memory",
      async () => {
        const { InMemoryWorkingMemoryStorage } =
          await import("./layers/WorkingMemoryLayerImpl.js");
        return new InMemoryWorkingMemoryStorage();
      },
      ["inmemory", "mem"],
      { description: "In-memory working memory storage for development" },
    );

    // Register Redis storage
    this.register(
      "redis",
      async (config) => {
        const { RedisWorkingMemoryStorage } =
          await import("./layers/WorkingMemoryLayerImpl.js");
        return new RedisWorkingMemoryStorage(config?.redis);
      },
      [],
      { description: "Redis working memory storage for production" },
    );

    logger.debug(
      "[WorkingMemoryStorageBackendFactory] Registered all storage backends",
      {
        providers: this.getAvailable(),
      },
    );
  }
}

// =============================================================================
// Exported Singleton Factories
// =============================================================================

/**
 * Vector store factory singleton
 */
export const VectorStoreFactory = VectorStoreFactoryImpl.getInstance();

/**
 * Embedder factory singleton
 */
export const EmbedderFactory = EmbedderFactoryImpl.getInstance();

/**
 * Working memory storage factory singleton
 */
export const WorkingMemoryStorageBackendFactory =
  WorkingMemoryStorageBackendFactoryImpl.getInstance();

// =============================================================================
// Convenience Factory Functions
// =============================================================================

/**
 * Create a vector store from configuration
 */
export async function createVectorStore(
  config: VectorStoreConfig,
): Promise<MemoryVectorStore> {
  return VectorStoreFactory.create(config.provider, {
    ...config,
    dimensions: config.dimensions,
  });
}

/**
 * Create an embedder from configuration
 */
export async function createEmbedder(
  config: EmbedderConfig,
): Promise<Embedder> {
  return EmbedderFactory.create(config.provider, config);
}

/**
 * Create working memory storage from configuration
 */
export async function createWorkingMemoryStorageBackend(
  config: MemoryStorageConfig,
): Promise<WorkingMemoryStorageBackend> {
  return WorkingMemoryStorageBackendFactory.create(config.type, config);
}

// =============================================================================
// Custom Registration API
// =============================================================================

/**
 * Register a custom vector store
 */
export function registerCustomVectorStore(
  name: string,
  factory: FactoryFunction<MemoryVectorStore, VectorStoreFactoryConfig>,
  aliases: string[] = [],
  metadata?: Record<string, unknown>,
): void {
  VectorStoreFactory.register(name, factory, aliases, metadata);
  logger.info("[MemoryFactory] Registered custom vector store", {
    name,
    aliases,
  });
}

/**
 * Register a custom embedder
 */
export function registerCustomEmbedder(
  name: string,
  factory: FactoryFunction<Embedder, EmbedderConfig>,
  aliases: string[] = [],
  metadata?: Record<string, unknown>,
): void {
  EmbedderFactory.register(name, factory, aliases, metadata);
  logger.info("[MemoryFactory] Registered custom embedder", { name, aliases });
}

/**
 * Register a custom working memory storage
 */
export function registerCustomWorkingMemoryStorageBackend(
  name: string,
  factory: FactoryFunction<WorkingMemoryStorageBackend, MemoryStorageConfig>,
  aliases: string[] = [],
  metadata?: Record<string, unknown>,
): void {
  WorkingMemoryStorageBackendFactory.register(name, factory, aliases, metadata);
  logger.info("[MemoryFactory] Registered custom working memory storage", {
    name,
    aliases,
  });
}

// =============================================================================
// Factory Status
// =============================================================================

/**
 * Get available vector store providers
 */
export function getAvailableVectorStores(): string[] {
  return VectorStoreFactory.getAvailable();
}

/**
 * Get available embedder providers
 */
export function getAvailableEmbedders(): string[] {
  return EmbedderFactory.getAvailable();
}

/**
 * Get available working memory storage backends
 */
export function getAvailableWorkingMemoryStorageBackends(): string[] {
  return WorkingMemoryStorageBackendFactory.getAvailable();
}
