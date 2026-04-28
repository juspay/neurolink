/**
 * Memory Registry
 *
 * Registry for managing memory system component instances using the BaseRegistry pattern.
 * Provides singleton access to:
 * - Active memory coordinators
 * - Initialized vector stores
 * - Initialized embedders
 * - Working memory storage instances
 */

import { BaseRegistry } from "../core/infrastructure/index.js";
import type {
  MemoryVectorStore,
  Embedder,
  WorkingMemoryStorageBackend,
  ThreeLayerMemoryConfig,
  MemoryCoordinatorMetadata,
  VectorStoreMetadata,
  EmbedderMetadata,
  WorkingMemoryStorageMetadata,
} from "../types/index.js";
import { MemoryCoordinator } from "./MemoryCoordinator.js";
import { logger } from "../utils/logger.js";
import {
  VectorStoreFactory,
  EmbedderFactory,
  WorkingMemoryStorageBackendFactory,
} from "./MemoryFactory.js";
import {
  SemanticMemoryLayer,
  InMemoryVectorStore,
  MockEmbedder,
} from "./layers/SemanticMemoryLayer.js";
import {
  WorkingMemoryLayerImpl,
  InMemoryWorkingMemoryStorage,
} from "./layers/WorkingMemoryLayerImpl.js";

// =============================================================================
// Memory Coordinator Registry
// =============================================================================

/**
 * Registry for managing memory coordinator instances
 */
class MemoryCoordinatorRegistryImpl extends BaseRegistry<
  MemoryCoordinator,
  MemoryCoordinatorMetadata
> {
  private static instance: MemoryCoordinatorRegistryImpl | null = null;

  private constructor() {
    super();
  }

  static getInstance(): MemoryCoordinatorRegistryImpl {
    if (!MemoryCoordinatorRegistryImpl.instance) {
      MemoryCoordinatorRegistryImpl.instance =
        new MemoryCoordinatorRegistryImpl();
    }
    return MemoryCoordinatorRegistryImpl.instance;
  }

  protected async registerAll(): Promise<void> {
    // Default coordinator is created on-demand
    logger.debug("[MemoryCoordinatorRegistry] Initialized (empty registry)");
  }

  /**
   * Create and register a new coordinator
   */
  async createAndRegister(
    id: string,
    config: ThreeLayerMemoryConfig,
    options?: {
      conversationManager?: {
        buildContextMessages: (sessionId: string) => Promise<unknown[]>;
        storeConversationTurn: (opts: unknown) => Promise<void>;
        initialize: () => Promise<void>;
        getSession: (sessionId: string) => unknown;
        clearSession: (sessionId: string) => Promise<boolean>;
      };
    },
  ): Promise<MemoryCoordinator> {
    const coordinator = new MemoryCoordinator(config);

    // Set up conversation layer if manager provided
    if (options?.conversationManager) {
      coordinator.setConversationLayer(options.conversationManager as never);
    }

    // Set up semantic layer if enabled
    if (config.semanticRecall?.enabled) {
      const vectorStore = await VectorStoreFactory.create(
        config.semanticRecall.vectorStore.provider,
        config.semanticRecall.vectorStore,
      );
      const embedder = await EmbedderFactory.create(
        config.semanticRecall.embedder.provider,
        config.semanticRecall.embedder,
      );
      const semanticLayer = new SemanticMemoryLayer(
        vectorStore,
        embedder,
        config.semanticRecall,
      );
      coordinator.setSemanticLayer(semanticLayer);
    }

    // Set up working memory layer if enabled
    if (config.workingMemory?.enabled) {
      const storage = await WorkingMemoryStorageBackendFactory.create(
        config.storage.type,
        config.storage,
      );
      const workingMemoryLayer = new WorkingMemoryLayerImpl(
        storage,
        config.workingMemory,
      );
      coordinator.setWorkingMemoryLayer(workingMemoryLayer);
    }

    // Initialize coordinator
    await coordinator.initialize();

    // Register in the registry
    this.register(id, async () => coordinator, [], {
      metadata: {
        config,
        createdAt: new Date().toISOString(),
        layerStatus: coordinator.getLayerStatus(),
      },
    });

    logger.info(
      "[MemoryCoordinatorRegistry] Created and registered coordinator",
      {
        id,
        layerStatus: coordinator.getLayerStatus(),
      },
    );

    return coordinator;
  }

  /**
   * Get or create default coordinator
   */
  async getOrCreateDefault(
    config?: Partial<ThreeLayerMemoryConfig>,
  ): Promise<MemoryCoordinator> {
    const defaultId = "default";
    const existing = await this.get(defaultId);
    if (existing) {
      return existing;
    }

    const fullConfig: ThreeLayerMemoryConfig = {
      enabled: true,
      storage: { type: "memory" },
      conversationHistory: { enabled: true },
      semanticRecall: { enabled: false } as never,
      workingMemory: { enabled: false },
      ...config,
    };

    return this.createAndRegister(defaultId, fullConfig);
  }

  /**
   * Remove a coordinator
   */
  async remove(id: string): Promise<boolean> {
    const coordinator = await this.get(id);
    if (coordinator) {
      await coordinator.close();
      // Note: BaseRegistry doesn't have a remove method, so we track it internally
      return true;
    }
    return false;
  }
}

// =============================================================================
// Vector Store Registry
// =============================================================================

/**
 * Registry for managing vector store instances
 */
class VectorStoreRegistryImpl extends BaseRegistry<
  MemoryVectorStore,
  VectorStoreMetadata
> {
  private static instance: VectorStoreRegistryImpl | null = null;

  private constructor() {
    super();
  }

  static getInstance(): VectorStoreRegistryImpl {
    if (!VectorStoreRegistryImpl.instance) {
      VectorStoreRegistryImpl.instance = new VectorStoreRegistryImpl();
    }
    return VectorStoreRegistryImpl.instance;
  }

  protected async registerAll(): Promise<void> {
    // Vector stores are created on-demand
    logger.debug("[VectorStoreRegistry] Initialized (empty registry)");
  }

  /**
   * Create and register a vector store
   */
  async createAndRegister(
    id: string,
    provider: string,
    config?: {
      collectionName?: string;
      dimensions?: number;
    },
  ): Promise<MemoryVectorStore> {
    const vectorStore = await VectorStoreFactory.create(provider, {
      provider: provider as never,
      config: {},
      collectionName: config?.collectionName,
      dimensions: config?.dimensions,
    });

    await vectorStore.initialize();

    this.register(id, async () => vectorStore, [], {
      metadata: {
        provider,
        collectionName: config?.collectionName,
        dimensions: config?.dimensions,
        createdAt: new Date().toISOString(),
      },
    });

    logger.info("[VectorStoreRegistry] Created and registered vector store", {
      id,
      provider,
    });

    return vectorStore;
  }
}

// =============================================================================
// Embedder Registry
// =============================================================================

/**
 * Registry for managing embedder instances
 */
class EmbedderRegistryImpl extends BaseRegistry<Embedder, EmbedderMetadata> {
  private static instance: EmbedderRegistryImpl | null = null;

  private constructor() {
    super();
  }

  static getInstance(): EmbedderRegistryImpl {
    if (!EmbedderRegistryImpl.instance) {
      EmbedderRegistryImpl.instance = new EmbedderRegistryImpl();
    }
    return EmbedderRegistryImpl.instance;
  }

  protected async registerAll(): Promise<void> {
    // Embedders are created on-demand
    logger.debug("[EmbedderRegistry] Initialized (empty registry)");
  }

  /**
   * Create and register an embedder
   */
  async createAndRegister(
    id: string,
    provider: string,
    model: string,
    config?: {
      dimensions?: number;
      apiKey?: string;
      baseUrl?: string;
    },
  ): Promise<Embedder> {
    const embedder = await EmbedderFactory.create(provider, {
      provider: provider as never,
      model,
      config: {
        dimensions: config?.dimensions,
        apiKey: config?.apiKey,
        baseUrl: config?.baseUrl,
      },
    });

    await embedder.initialize();

    const dimensions = embedder.getDimensions();

    this.register(id, async () => embedder, [], {
      metadata: {
        provider,
        model,
        dimensions,
        createdAt: new Date().toISOString(),
      },
    });

    logger.info("[EmbedderRegistry] Created and registered embedder", {
      id,
      provider,
      model,
      dimensions,
    });

    return embedder;
  }
}

// =============================================================================
// Working Memory Storage Registry
// =============================================================================

/**
 * Registry for managing working memory storage instances
 */
class WorkingMemoryStorageRegistryImpl extends BaseRegistry<
  WorkingMemoryStorageBackend,
  WorkingMemoryStorageMetadata
> {
  private static instance: WorkingMemoryStorageRegistryImpl | null = null;

  private constructor() {
    super();
  }

  static getInstance(): WorkingMemoryStorageRegistryImpl {
    if (!WorkingMemoryStorageRegistryImpl.instance) {
      WorkingMemoryStorageRegistryImpl.instance =
        new WorkingMemoryStorageRegistryImpl();
    }
    return WorkingMemoryStorageRegistryImpl.instance;
  }

  protected async registerAll(): Promise<void> {
    // Storage instances are created on-demand
    logger.debug("[WorkingMemoryStorageRegistry] Initialized (empty registry)");
  }

  /**
   * Create and register a working memory storage
   */
  async createAndRegister(
    id: string,
    type: "memory" | "redis",
    config?: {
      host?: string;
      port?: number;
      password?: string;
      keyPrefix?: string;
      ttl?: number;
    },
  ): Promise<WorkingMemoryStorageBackend> {
    const storage = await WorkingMemoryStorageBackendFactory.create(type, {
      type,
      redis: config,
    });

    await storage.initialize();

    this.register(id, async () => storage, [], {
      metadata: {
        type,
        createdAt: new Date().toISOString(),
      },
    });

    logger.info(
      "[WorkingMemoryStorageRegistry] Created and registered storage",
      {
        id,
        type,
      },
    );

    return storage;
  }
}

// =============================================================================
// Exported Singleton Registries
// =============================================================================

/**
 * Memory coordinator registry singleton
 */
export const MemoryCoordinatorRegistry =
  MemoryCoordinatorRegistryImpl.getInstance();

/**
 * Vector store registry singleton
 */
export const VectorStoreRegistry = VectorStoreRegistryImpl.getInstance();

/**
 * Embedder registry singleton
 */
export const EmbedderRegistry = EmbedderRegistryImpl.getInstance();

/**
 * Working memory storage registry singleton
 */
export const WorkingMemoryStorageRegistry =
  WorkingMemoryStorageRegistryImpl.getInstance();

// =============================================================================
// Convenience Functions
// =============================================================================

/**
 * Initialize all registries
 */
export async function initializeMemoryRegistries(): Promise<void> {
  await Promise.all([
    MemoryCoordinatorRegistry.ensureInitialized(),
    VectorStoreRegistry.ensureInitialized(),
    EmbedderRegistry.ensureInitialized(),
    WorkingMemoryStorageRegistry.ensureInitialized(),
  ]);
  logger.info("[MemoryRegistry] All registries initialized");
}

/**
 * Clear all registries
 */
export function clearMemoryRegistries(): void {
  MemoryCoordinatorRegistry.clear();
  VectorStoreRegistry.clear();
  EmbedderRegistry.clear();
  WorkingMemoryStorageRegistry.clear();
  logger.info("[MemoryRegistry] All registries cleared");
}

/**
 * Get summary of all registered components
 */
export function getRegistrySummary(): {
  coordinators: Array<{ id: string; metadata: MemoryCoordinatorMetadata }>;
  vectorStores: Array<{ id: string; metadata: VectorStoreMetadata }>;
  embedders: Array<{ id: string; metadata: EmbedderMetadata }>;
  workingMemoryStorages: Array<{
    id: string;
    metadata: WorkingMemoryStorageMetadata;
  }>;
} {
  return {
    coordinators: MemoryCoordinatorRegistry.list(),
    vectorStores: VectorStoreRegistry.list(),
    embedders: EmbedderRegistry.list(),
    workingMemoryStorages: WorkingMemoryStorageRegistry.list(),
  };
}

// =============================================================================
// Quick Setup Functions
// =============================================================================

/**
 * Quick setup: Create a full three-layer memory system with in-memory storage
 */
export async function createInMemoryThreeLayerMemory(options?: {
  enableSemantic?: boolean;
  enableWorkingMemory?: boolean;
  embedderDimensions?: number;
}): Promise<MemoryCoordinator> {
  const config: ThreeLayerMemoryConfig = {
    enabled: true,
    storage: { type: "memory" },
    conversationHistory: {
      enabled: true,
      enableSummarization: true,
    },
    semanticRecall:
      options?.enableSemantic !== false
        ? {
            enabled: true,
            vectorStore: {
              provider: "memory",
              config: {},
              collectionName: "neurolink_messages",
              metric: "cosine",
            },
            embedder: {
              provider: "ollama", // Will use mock embedder
              model: "mock-embed",
              config: {
                dimensions: options?.embedderDimensions || 384,
              },
            },
            topK: 3,
            similarityThreshold: 0.7,
          }
        : undefined,
    workingMemory:
      options?.enableWorkingMemory !== false
        ? {
            enabled: true,
            maxTokens: 4096,
          }
        : undefined,
  };

  const coordinator = new MemoryCoordinator(config);

  // Set up semantic layer
  if (config.semanticRecall?.enabled) {
    const vectorStore = new InMemoryVectorStore();
    const embedder = new MockEmbedder(
      options?.embedderDimensions || 384,
      "mock-embed",
    );
    const semanticLayer = new SemanticMemoryLayer(
      vectorStore,
      embedder,
      config.semanticRecall,
    );
    coordinator.setSemanticLayer(semanticLayer);
  }

  // Set up working memory layer
  if (config.workingMemory?.enabled) {
    const storage = new InMemoryWorkingMemoryStorage();
    const workingMemoryLayer = new WorkingMemoryLayerImpl(
      storage,
      config.workingMemory,
    );
    coordinator.setWorkingMemoryLayer(workingMemoryLayer);
  }

  await coordinator.initialize();

  logger.info("[MemoryRegistry] Created in-memory three-layer memory", {
    layerStatus: coordinator.getLayerStatus(),
  });

  return coordinator;
}
