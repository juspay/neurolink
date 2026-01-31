/**
 * Memory Module Exports
 *
 * Central export point for the three-layer memory system.
 *
 * @module memory
 * @since 9.0.0
 */

// =============================================================================
// Main Manager
// =============================================================================

export {
  createThreeLayerMemoryManager,
  ThreeLayerMemoryManager,
} from "./threeLayerMemoryManager.js";

// =============================================================================
// Memory Coordinator (Factory+Registry Pattern)
// =============================================================================

export {
  MemoryCoordinator,
  createMemoryCoordinator,
} from "./MemoryCoordinator.js";

// =============================================================================
// Memory Factory (BaseFactory Pattern)
// =============================================================================

export {
  // Factory singletons
  VectorStoreFactory,
  EmbedderFactory,
  WorkingMemoryStorageBackendFactory,

  // Factory functions
  createVectorStore as createVectorStoreFromFactory,
  createEmbedder as createEmbedderFromFactory,
  createWorkingMemoryStorageBackend as createWorkingMemoryStorageBackendFromFactory,

  // Custom registration
  registerCustomVectorStore,
  registerCustomEmbedder,
  registerCustomWorkingMemoryStorageBackend,

  // Status functions
  getAvailableVectorStores,
  getAvailableEmbedders,
  getAvailableWorkingMemoryStorageBackends,
} from "./MemoryFactory.js";

// =============================================================================
// Memory Registry (BaseRegistry Pattern)
// =============================================================================

export {
  // Registry singletons
  MemoryCoordinatorRegistry,
  VectorStoreRegistry,
  EmbedderRegistry,
  WorkingMemoryStorageRegistry,

  // Registry functions
  initializeMemoryRegistries,
  clearMemoryRegistries,
  getRegistrySummary,

  // Quick setup functions
  createInMemoryThreeLayerMemory,
} from "./MemoryRegistry.js";

// =============================================================================
// Semantic Memory Layer (BaseFactory Pattern)
// =============================================================================

export {
  SemanticMemoryLayer,
  InMemoryVectorStore as InMemoryVectorStoreImpl,
  MockEmbedder,
  createInMemorySemanticLayer,
} from "./layers/SemanticMemoryLayer.js";

// =============================================================================
// Working Memory Layer (BaseFactory Pattern)
// =============================================================================

export {
  WorkingMemoryLayerImpl,
  InMemoryWorkingMemoryStorage as InMemoryWorkingMemoryStorageImpl,
  RedisWorkingMemoryStorage as RedisWorkingMemoryStorageImpl,
  createInMemoryWorkingMemoryLayer,
  createRedisWorkingMemoryLayer,
} from "./layers/WorkingMemoryLayerImpl.js";

// =============================================================================
// Layers
// =============================================================================

export { ConversationHistoryLayer } from "./layers/conversationHistoryLayer.js";
export { SemanticRecallLayer } from "./layers/semanticRecallLayer.js";
export { WorkingMemoryLayer } from "./layers/workingMemoryLayer.js";

// =============================================================================
// Vector Stores
// =============================================================================

export { InMemoryVectorStore } from "./vectorStores/inMemoryVectorStore.js";
export { RedisVectorStore } from "./vectorStores/redisVectorStore.js";
export { QdrantVectorStore } from "./vectorStores/qdrantVectorStore.js";
export { PGVectorStore } from "./vectorStores/pgvectorStore.js";
export { PineconeVectorStore } from "./vectorStores/pineconeVectorStore.js";
export {
  createVectorStore,
  getSupportedVectorStoreProviders,
} from "./vectorStores/vectorStoreFactory.js";

// =============================================================================
// Embedders
// =============================================================================

export {
  createEmbedder,
  getSupportedEmbeddingProviders,
} from "./embedders/embedderFactory.js";
export { OpenAIEmbedder } from "./embedders/openaiEmbedder.js";
export { VertexEmbedder } from "./embedders/vertexEmbedder.js";
export { MistralEmbedder } from "./embedders/mistralEmbedder.js";
export { CohereEmbedder } from "./embedders/cohereEmbedder.js";
export { OllamaEmbedder } from "./embedders/ollamaEmbedder.js";
export { BedrockEmbedder } from "./embedders/bedrockEmbedder.js";

// =============================================================================
// Storage
// =============================================================================

export {
  createWorkingMemoryStorage,
  InMemoryWorkingMemoryStorage,
  RedisWorkingMemoryStorage,
} from "./storage/workingMemoryStorage.js";

// =============================================================================
// Processors
// =============================================================================

export {
  applyProcessors,
  CustomProcessor,
  createProcessor,
  createProcessorChain,
  RoleFilterProcessor,
  TimeWindowProcessor,
  TokenLimitProcessor,
} from "./processors/processorFactory.js";
export { createRoleFilterProcessor } from "./processors/roleFilterProcessor.js";
export { createTokenLimitProcessor } from "./processors/tokenLimitProcessor.js";

// =============================================================================
// Tools
// =============================================================================

export { createUpdateWorkingMemoryTool } from "./tools/updateWorkingMemoryTool.js";

// =============================================================================
// Compatibility
// =============================================================================

export {
  convertLegacyConfig,
  extractRedisConfig,
  isLegacyMemoryConfig,
  isRedisEnabled,
  normalizeMemoryConfig,
} from "./compatibilityLayer.js";
