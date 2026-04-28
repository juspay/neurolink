/**
 * Memory Layers
 *
 * Layer implementations for the three-layer memory system:
 * 1. Conversation History Layer (adapter to existing conversation memory)
 * 2. Semantic Recall Layer (vector-based similarity search)
 * 3. Working Memory Layer (structured knowledge storage)
 */

// Semantic Memory Layer
export {
  SemanticMemoryLayer,
  InMemoryVectorStore,
  MockEmbedder,
  createInMemorySemanticLayer,
} from "./SemanticMemoryLayer.js";

// Working Memory Layer
export {
  WorkingMemoryLayerImpl,
  InMemoryWorkingMemoryStorage,
  RedisWorkingMemoryStorage,
  createInMemoryWorkingMemoryLayer,
  createRedisWorkingMemoryLayer,
} from "./WorkingMemoryLayerImpl.js";
