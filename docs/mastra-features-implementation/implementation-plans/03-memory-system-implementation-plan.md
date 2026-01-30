# Three-Layer Memory System Implementation Plan

## Document Information

| Field                | Value                                                                 |
| -------------------- | --------------------------------------------------------------------- |
| **Feature**          | Three-Layer Memory System (Mastra-style)                              |
| **Status**           | Planning                                                              |
| **Author**           | NeuroLink Team                                                        |
| **Created**          | 2026-01-22                                                            |
| **Related Document** | [03-three-layer-memory-system.md](../03-three-layer-memory-system.md) |

---

## Executive Summary

This implementation plan details the phased approach for adding a Mastra-style three-layer memory system to NeuroLink. The system enhances the existing conversation memory with semantic recall (vector-based) and working memory (structured knowledge) capabilities while maintaining full backward compatibility.

**Key Objectives:**

1. Extend existing conversation memory with thread/resource scoping
2. Add vector-based semantic search for long-term context retrieval
3. Implement structured working memory for persistent user profiles
4. Support multiple vector store and embedding provider backends
5. Maintain 100% backward compatibility with existing implementations

---

## 1. Prerequisites and Dependencies

### 1.1 Existing NeuroLink Components Required

| Component                      | File Path                                        | Status |
| ------------------------------ | ------------------------------------------------ | ------ |
| ConversationMemoryManager      | `src/lib/core/conversationMemoryManager.ts`      | Exists |
| RedisConversationMemoryManager | `src/lib/core/redisConversationMemoryManager.ts` | Exists |
| ConversationMemoryFactory      | `src/lib/core/conversationMemoryFactory.ts`      | Exists |
| Conversation Types             | `src/lib/types/conversation.ts`                  | Exists |
| Redis Utilities                | `src/lib/utils/redis.ts`                         | Exists |
| Token Utilities                | `src/lib/constants/tokens.ts`                    | Exists |
| Logger                         | `src/lib/utils/logger.ts`                        | Exists |

### 1.2 New External Dependencies

| Package                       | Version   | Purpose                                           | Optional          |
| ----------------------------- | --------- | ------------------------------------------------- | ----------------- |
| `zod`                         | `^3.22.0` | Schema validation for working memory              | Yes (schema mode) |
| `zod-to-json-schema`          | `^3.22.0` | Zod to JSON Schema conversion                     | Yes (schema mode) |
| `@qdrant/js-client-rest`      | `^1.7.0`  | Qdrant vector store client                        | Yes               |
| `@pinecone-database/pinecone` | `^2.0.0`  | Pinecone vector store client                      | Yes               |
| `chromadb`                    | `^1.7.0`  | ChromaDB client                                   | Yes               |
| `pg`                          | `^8.11.0` | PostgreSQL client for PGVector                    | Yes               |
| `google-auth-library`         | `^9.0.0`  | Google Cloud authentication for Vertex embeddings | Yes               |

### 1.3 Environment Requirements

```bash
# Core (existing)
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=optional

# Embedding Providers (at least one required for semantic recall)
OPENAI_API_KEY=sk-...
GOOGLE_CLOUD_PROJECT=my-project
GOOGLE_CLOUD_REGION=us-central1

# Vector Stores (optional, based on chosen backend)
QDRANT_URL=http://localhost:6333
QDRANT_API_KEY=optional
PINECONE_API_KEY=pc-...
PINECONE_ENVIRONMENT=us-east1-gcp
```

### 1.4 Technical Prerequisites

1. **Familiarity Required:**
   - NeuroLink's factory pattern architecture
   - Existing conversation memory system
   - Redis data structures
   - Vector embeddings and similarity search concepts

2. **Infrastructure Considerations:**
   - Redis Stack (with RediSearch) for Redis vector store
   - External vector store service (Qdrant, Pinecone, etc.) or PostgreSQL with pgvector
   - Sufficient memory for in-memory vector operations during development

### 1.5 Existing NeuroLink Features to Leverage

NeuroLink already provides comprehensive memory management capabilities that the Three-Layer Memory System should build upon:

| Component                      | File Path                                        | Purpose                                           |
| ------------------------------ | ------------------------------------------------ | ------------------------------------------------- |
| ConversationMemoryManager      | `src/lib/core/conversationMemoryManager.ts`      | In-memory conversation storage with summarization |
| RedisConversationMemoryManager | `src/lib/core/redisConversationMemoryManager.ts` | Redis-backed distributed memory with TTL          |
| ConversationMemoryFactory      | `src/lib/core/conversationMemoryFactory.ts`      | Factory for creating memory managers              |
| ~~Mem0 Integration~~           | ~~`src/lib/memory/mem0Initializer.ts`~~          | **⚠️ DEPRECATED - SCHEDULED FOR REMOVAL**         |

> **⚠️ Mem0 Removal Notice**
>
> The Mem0 cloud integration (`mem0ai` package) will be **completely removed**. It provides limited value and adds unnecessary external dependency complexity.
>
> **Files to delete:**
>
> - `src/lib/memory/mem0Initializer.ts` (entire file)
> - Remove `mem0Enabled`, `mem0Config` from `src/lib/types/conversation.ts`
> - Remove all Mem0 code from `src/lib/neurolink.ts` (~100 lines)
> - Remove `"mem0ai": "^2.1.38"` from `package.json`
>
> The new three-layer memory system will replace Mem0 functionality with local vector store integration.

**Integration Notes:**

- The new `ConversationHistoryLayer` should wrap existing `ConversationMemoryManager` / `RedisConversationMemoryManager` to maintain backward compatibility
- Leverage existing token counting and summarization logic from `TokenUtils` and `buildContextMessages()`
- The `WorkingMemoryStorage` Redis implementation should follow patterns from `RedisConversationMemoryManager`
- The new `SemanticRecallLayer` will replace Mem0 with local vector store integration (Pinecone, Qdrant, pgvector)

---

## 2. Phase 1: Memory Interface Redesign

**Duration:** 1 week
**Priority:** Critical
**Dependencies:** None

### 2.1 Objectives

- Create comprehensive type system for three-layer memory
- Design backward-compatible configuration interface
- Establish abstract interfaces for extensibility

### 2.2 Files to Create

| File                           | Purpose                            |
| ------------------------------ | ---------------------------------- |
| `src/lib/types/memory.ts`      | Core memory type definitions       |
| `src/lib/types/vectorStore.ts` | Vector store interface definitions |
| `src/lib/types/embedder.ts`    | Embedder interface definitions     |

### 2.3 Detailed Tasks

#### Task 1.1: Create Memory Type Definitions

```typescript
// src/lib/types/memory.ts - Key types to implement

export type MemoryScope = "thread" | "resource";
export type MemoryLayerType = "conversation" | "semantic" | "working";

export type ThreeLayerMemoryConfig = {
  enabled: boolean;
  storage: MemoryStorageConfig;
  conversationHistory?: ConversationHistoryConfig;
  semanticRecall?: SemanticRecallConfig;
  workingMemory?: WorkingMemoryConfig;
  processors?: MemoryProcessorConfig[];
};

export type MemoryContext = {
  threadId: string;
  resourceId?: string;
  scope?: MemoryScope;
  metadata?: Record<string, unknown>;
};

export type RetrievedMemoryContext = {
  messages: ChatMessage[];
  workingMemory?: string | Record<string, unknown>;
  semanticMatches?: SemanticMatch[];
  tokenCount: number;
  debug?: MemoryDebugInfo;
};
```

**Acceptance Criteria:**

- [ ] All type definitions compile without errors
- [ ] Types are exported from `src/lib/types/index.ts`
- [ ] JSDoc documentation for all public types
- [ ] Backward compatibility with existing `ConversationMemoryConfig`

#### Task 1.2: Create Vector Store Interfaces

```typescript
// src/lib/types/vectorStore.ts - Key interfaces

export type VectorStore = {
  initialize(): Promise<void>;
  ensureCollection(config: CollectionConfig): Promise<void>;
  upsert(vectors: VectorEntry[]): Promise<void>;
  search(query: VectorSearchQuery): Promise<VectorSearchResult[]>;
  delete(filter: VectorDeleteFilter): Promise<number>;
  getStats(): Promise<VectorStoreStats>;
  close(): Promise<void>;
};
```

**Acceptance Criteria:**

- [ ] Interface supports all planned vector store backends
- [ ] Filter types support thread/resource scoping
- [ ] Metadata schema is flexible but typed

#### Task 1.3: Create Embedder Interfaces

```typescript
// src/lib/types/embedder.ts - Key interfaces

export type Embedder = {
  initialize(): Promise<void>;
  getDimensions(): number;
  embed(text: string): Promise<number[]>;
  embedBatch(texts: string[]): Promise<number[][]>;
  getModelInfo(): EmbedderModelInfo;
};
```

**Acceptance Criteria:**

- [ ] Interface supports batch operations
- [ ] Model info includes dimensions and token limits
- [ ] Provider-agnostic design

### 2.4 Testing Requirements

```typescript
// test/unit/types/memory.test.ts
describe("Memory Types", () => {
  it("should allow minimal config for backward compatibility");
  it("should validate ThreeLayerMemoryConfig structure");
  it("should support partial layer enablement");
});
```

### 2.5 Deliverables

- [ ] `src/lib/types/memory.ts` with full type definitions
- [ ] `src/lib/types/vectorStore.ts` with vector store interfaces
- [ ] `src/lib/types/embedder.ts` with embedder interfaces
- [ ] Updated `src/lib/types/index.ts` with new exports
- [ ] Unit tests for type validation

### 2.6 Estimated Effort

| Task                    | Effort     |
| ----------------------- | ---------- |
| Memory type definitions | 2 days     |
| Vector store interfaces | 1 day      |
| Embedder interfaces     | 1 day      |
| Documentation and tests | 1 day      |
| **Total**               | **5 days** |

---

## 3. Phase 2: History Layer Implementation

**Duration:** 1 week
**Priority:** High
**Dependencies:** Phase 1

### 3.1 Objectives

- Create wrapper layer around existing conversation memory managers
- Add enhanced thread/resource scoping
- Implement read-only mode support
- Maintain full backward compatibility

### 3.2 Files to Create/Modify

| File                                                | Action | Purpose                       |
| --------------------------------------------------- | ------ | ----------------------------- |
| `src/lib/memory/layers/conversationHistoryLayer.ts` | Create | History layer implementation  |
| `src/lib/core/conversationMemoryManager.ts`         | Modify | Add missing interface methods |
| `src/lib/core/redisConversationMemoryManager.ts`    | Modify | Add missing interface methods |

### 3.3 Detailed Tasks

#### Task 2.1: Implement ConversationHistoryLayer

```typescript
// src/lib/memory/layers/conversationHistoryLayer.ts

export class ConversationHistoryLayer {
  private manager: ConversationMemoryManager | RedisConversationMemoryManager;
  private config: Required<ConversationHistoryConfig>;

  constructor(manager, config: ConversationHistoryConfig);

  // Core methods
  async retrieve(context: MemoryContext): Promise<ChatMessage[]>;
  async store(
    context: MemoryContext,
    userMessage: string,
    aiResponse: string,
    options?,
  ): Promise<void>;
  async getOrCreateThread(
    threadId: string,
    resourceId?: string,
  ): Promise<MemoryThread>;
  async listThreads(resourceId: string): Promise<MemoryThread[]>;
  async clearThread(threadId: string, resourceId?: string): Promise<boolean>;
}
```

**Implementation Notes:**

- Wraps existing managers without modifying their core behavior
- `lastMessages` config limits retrieved messages
- `readOnly` mode skips persistence
- Respects existing summarization settings

#### Task 2.2: Enhance Existing Managers

Add missing methods to existing managers for uniform interface:

```typescript
// Methods to add to ConversationMemoryManager
async getUserAllSessionsHistory(userId: string): Promise<SessionMetadata[]>;
async getUserSessionObject(userId: string, sessionId: string): Promise<SessionMemory | null>;

// These already exist in RedisConversationMemoryManager
```

#### Task 2.3: Thread/Resource Mapping

Map existing session/user concepts to thread/resource:

| Existing Concept | New Concept  | Notes          |
| ---------------- | ------------ | -------------- |
| `sessionId`      | `threadId`   | 1:1 mapping    |
| `userId`         | `resourceId` | 1:1 mapping    |
| Session          | Thread       | Same structure |

### 3.4 Testing Requirements

```typescript
// test/unit/memory/conversationHistoryLayer.test.ts
describe("ConversationHistoryLayer", () => {
  describe("retrieve", () => {
    it("should return recent messages up to lastMessages limit");
    it("should return empty array when disabled");
    it("should include summary when summarization is enabled");
  });

  describe("store", () => {
    it("should persist messages to underlying manager");
    it("should skip persistence in readOnly mode");
  });

  describe("backward compatibility", () => {
    it("should work with existing ConversationMemoryConfig");
  });
});
```

### 3.5 Deliverables

- [ ] `src/lib/memory/layers/conversationHistoryLayer.ts`
- [ ] Updated conversation memory managers
- [ ] Unit tests with >90% coverage
- [ ] Integration tests with Redis

### 3.6 Estimated Effort

| Task                                    | Effort     |
| --------------------------------------- | ---------- |
| ConversationHistoryLayer implementation | 2 days     |
| Manager enhancements                    | 1 day      |
| Unit tests                              | 1 day      |
| Integration tests                       | 1 day      |
| **Total**                               | **5 days** |

---

## 4. Phase 3: Semantic Recall Layer

**Duration:** 2 weeks
**Priority:** High
**Dependencies:** Phase 1, Phase 2

### 4.1 Objectives

- Implement vector-based similarity search for messages
- Support message indexing and retrieval
- Add context window extraction around matches
- Support both thread-scoped and resource-scoped search

### 4.2 Files to Create

| File                                                 | Purpose                             |
| ---------------------------------------------------- | ----------------------------------- |
| `src/lib/memory/layers/semanticRecallLayer.ts`       | Main semantic recall implementation |
| `src/lib/memory/vectorStores/vectorStoreFactory.ts`  | Factory for creating vector stores  |
| `src/lib/memory/vectorStores/inMemoryVectorStore.ts` | In-memory vector store              |
| `src/lib/memory/embedders/embedderFactory.ts`        | Factory for creating embedders      |
| `src/lib/memory/embedders/openaiEmbedder.ts`         | OpenAI embedding implementation     |
| `src/lib/memory/embedders/vertexEmbedder.ts`         | Vertex AI embedding implementation  |

### 4.3 Detailed Tasks

#### Task 3.1: Implement SemanticRecallLayer

```typescript
// src/lib/memory/layers/semanticRecallLayer.ts

export class SemanticRecallLayer {
  private vectorStore: VectorStore;
  private embedder: Embedder;
  private config: Required<SemanticRecallConfig>;

  constructor(
    vectorStore: VectorStore,
    embedder: Embedder,
    config: SemanticRecallConfig,
  );

  async initialize(): Promise<void>;
  async indexMessage(
    message: ChatMessage,
    threadId: string,
    resourceId?: string,
  ): Promise<void>;
  async indexMessages(
    messages: ChatMessage[],
    threadId: string,
    resourceId?: string,
  ): Promise<void>;
  async retrieve(
    query: string,
    context: MemoryContext,
    conversationMessages?: ChatMessage[],
  ): Promise<SemanticMatch[]>;
  async deleteThread(threadId: string): Promise<void>;
  async deleteResource(resourceId: string): Promise<void>;
  async getStats(): Promise<{ vectorCount: number }>;
}
```

**Key Features:**

- Automatic message embedding on store
- Batch embedding support for efficiency
- Context window extraction (configurable before/after)
- Similarity threshold filtering
- Role exclusion (tool_call, tool_result by default)

#### Task 3.2: Implement In-Memory Vector Store

```typescript
// src/lib/memory/vectorStores/inMemoryVectorStore.ts

export class InMemoryVectorStore implements VectorStore {
  private vectors: Map<string, VectorEntry> = new Map();

  // Implement cosine similarity search
  // Support metadata filtering
  // Suitable for development/testing
}
```

**Implementation Notes:**

- Use simple Map-based storage
- Implement brute-force cosine similarity (acceptable for <10k vectors)
- Support all filter types (threadId, resourceId, role)

#### Task 3.3: Implement Vector Store Factory

```typescript
// src/lib/memory/vectorStores/vectorStoreFactory.ts

export async function createVectorStore(
  config: VectorStoreConfig,
): Promise<VectorStore> {
  switch (config.provider) {
    case "memory":
      return new InMemoryVectorStore();
    case "redis": // Dynamic import
    case "qdrant": // Dynamic import
    case "pinecone": // Dynamic import
    case "pgvector": // Dynamic import
    default:
      throw new Error(`Unsupported provider: ${config.provider}`);
  }
}
```

#### Task 3.4: Implement Embedder Factory

```typescript
// src/lib/memory/embedders/embedderFactory.ts

export async function createEmbedder(
  config: EmbedderConfig,
): Promise<Embedder> {
  switch (config.provider) {
    case "openai": // Dynamic import
    case "vertex": // Dynamic import
    case "mistral": // Dynamic import
    case "cohere": // Dynamic import
    case "ollama": // Dynamic import
    case "bedrock": // Dynamic import
    default:
      throw new Error(`Unsupported provider: ${config.provider}`);
  }
}
```

#### Task 3.5: Implement OpenAI Embedder

```typescript
// src/lib/memory/embedders/openaiEmbedder.ts

const OPENAI_EMBEDDING_MODELS = {
  "text-embedding-3-small": { dimensions: 1536, maxTokens: 8191 },
  "text-embedding-3-large": { dimensions: 3072, maxTokens: 8191 },
  "text-embedding-ada-002": { dimensions: 1536, maxTokens: 8191 },
};

export class OpenAIEmbedder implements Embedder {
  // Use fetch API for embeddings endpoint
  // Support batch operations
  // Handle rate limiting
}
```

#### Task 3.6: Implement Vertex Embedder

```typescript
// src/lib/memory/embedders/vertexEmbedder.ts

const VERTEX_EMBEDDING_MODELS = {
  "text-embedding-004": { dimensions: 768, maxTokens: 3072 },
  "text-embedding-005": { dimensions: 768, maxTokens: 3072 },
};

export class VertexEmbedder implements Embedder {
  // Use Google Auth library for authentication
  // Support batch predictions
  // Handle token refresh
}
```

### 4.4 Testing Requirements

```typescript
// test/unit/memory/semanticRecallLayer.test.ts
describe("SemanticRecallLayer", () => {
  describe("indexMessage", () => {
    it("should generate embedding and store in vector store");
    it("should skip excluded roles");
    it("should skip empty content");
  });

  describe("retrieve", () => {
    it("should return top-K similar messages");
    it("should apply similarity threshold");
    it("should filter by thread scope");
    it("should filter by resource scope");
    it("should include context messages");
  });
});

// test/unit/memory/embedders/openaiEmbedder.test.ts
describe("OpenAIEmbedder", () => {
  it("should generate embeddings for single text");
  it("should batch embed multiple texts");
  it("should handle rate limiting");
});
```

### 4.5 Deliverables

- [ ] `src/lib/memory/layers/semanticRecallLayer.ts`
- [ ] `src/lib/memory/vectorStores/vectorStoreFactory.ts`
- [ ] `src/lib/memory/vectorStores/inMemoryVectorStore.ts`
- [ ] `src/lib/memory/embedders/embedderFactory.ts`
- [ ] `src/lib/memory/embedders/openaiEmbedder.ts`
- [ ] `src/lib/memory/embedders/vertexEmbedder.ts`
- [ ] Unit tests with mocked embeddings
- [ ] Integration tests with real embeddings (marked as slow)

### 4.6 Estimated Effort

| Task                   | Effort                |
| ---------------------- | --------------------- |
| SemanticRecallLayer    | 3 days                |
| In-memory vector store | 2 days                |
| Factories              | 1 day                 |
| OpenAI embedder        | 2 days                |
| Vertex embedder        | 2 days                |
| Unit tests             | 2 days                |
| Integration tests      | 2 days                |
| **Total**              | **14 days (2 weeks)** |

---

## 5. Phase 4: Working Memory Layer

**Duration:** 1.5 weeks
**Priority:** High
**Dependencies:** Phase 1

### 5.1 Objectives

- Implement persistent structured storage for user profiles
- Support template-based (Markdown) format
- Support schema-based (Zod/JSON Schema) format
- Create agent tool for memory updates
- Implement storage backends (in-memory, Redis)

### 5.2 Files to Create

| File                                              | Purpose                             |
| ------------------------------------------------- | ----------------------------------- |
| `src/lib/memory/layers/workingMemoryLayer.ts`     | Working memory layer implementation |
| `src/lib/memory/storage/workingMemoryStorage.ts`  | Storage backend implementations     |
| `src/lib/memory/tools/updateWorkingMemoryTool.ts` | Agent tool for updates              |

### 5.3 Detailed Tasks

#### Task 4.1: Implement WorkingMemoryLayer

```typescript
// src/lib/memory/layers/workingMemoryLayer.ts

export class WorkingMemoryLayer {
  private storage: WorkingMemoryStorage;
  private config: Required<WorkingMemoryConfig>;
  private mode: "template" | "schema";

  constructor(storage: WorkingMemoryStorage, config: WorkingMemoryConfig);

  async retrieve(
    context: MemoryContext,
  ): Promise<string | Record<string, unknown> | null>;
  async update(
    context: MemoryContext,
    data: string | Record<string, unknown>,
    reason?: string,
  ): Promise<void>;
  async clear(context: MemoryContext): Promise<void>;
  getUpdateInstructions(): string;
  getDefinition(): {
    mode: "template" | "schema";
    definition: string | JSONSchema7;
  };
  formatForPrompt(data: string | Record<string, unknown> | null): string;
}
```

**Key Features:**

- Template mode: Full replacement semantics
- Schema mode: Deep merge semantics
- Zod schema validation
- Resource vs thread scoping
- Token limit enforcement

#### Task 4.2: Implement Storage Backends

```typescript
// src/lib/memory/storage/workingMemoryStorage.ts

export type WorkingMemoryStorage = {
  get(resourceId: string, threadId?: string): Promise<string | Record<string, unknown> | null>;
  set(resourceId: string, threadId: string | undefined, data: string | Record<string, unknown>): Promise<void>;
  delete(resourceId: string, threadId?: string): Promise<void>;
  close(): Promise<void>;
};

export class InMemoryWorkingMemoryStorage implements WorkingMemoryStorage { ... }
export class RedisWorkingMemoryStorage implements WorkingMemoryStorage { ... }
```

#### Task 4.3: Implement Update Tool

```typescript
// src/lib/memory/tools/updateWorkingMemoryTool.ts

export function createUpdateWorkingMemoryTool(
  workingMemoryLayer: WorkingMemoryLayer,
  context: MemoryContext,
) {
  const definition = workingMemoryLayer.getDefinition();

  // Return tool with appropriate parameters based on mode
  // Template mode: accepts full content string
  // Schema mode: accepts partial updates object
}
```

**Tool Registration:**

- Register with MCPToolRegistry as built-in tool
- Only active when working memory is enabled
- Include update instructions in tool description

### 5.4 Testing Requirements

```typescript
// test/unit/memory/workingMemoryLayer.test.ts
describe("WorkingMemoryLayer", () => {
  describe("template mode", () => {
    it("should return default template when no data exists");
    it("should replace entire content on update");
  });

  describe("schema mode", () => {
    it("should merge updates with existing data");
    it("should validate against Zod schema");
    it("should convert Zod to JSON Schema for tool");
  });

  describe("scoping", () => {
    it("should isolate thread-scoped memory");
    it("should share resource-scoped memory");
  });
});
```

### 5.5 Deliverables

- [ ] `src/lib/memory/layers/workingMemoryLayer.ts`
- [ ] `src/lib/memory/storage/workingMemoryStorage.ts`
- [ ] `src/lib/memory/tools/updateWorkingMemoryTool.ts`
- [ ] Unit tests
- [ ] Integration tests with Redis

### 5.6 Estimated Effort

| Task               | Effort                 |
| ------------------ | ---------------------- |
| WorkingMemoryLayer | 3 days                 |
| Storage backends   | 2 days                 |
| Update tool        | 1 day                  |
| Zod integration    | 1 day                  |
| Unit tests         | 1 day                  |
| Integration tests  | 1 day                  |
| **Total**          | **9 days (1.5 weeks)** |

---

## 6. Phase 5: Memory Processors

**Duration:** 1 week
**Priority:** Medium
**Dependencies:** Phase 2, Phase 3, Phase 4

### 6.1 Objectives

- Implement configurable memory processors
- Support token limit trimming
- Support role filtering
- Support time window filtering
- Support custom processors

### 6.2 Files to Create

| File                                               | Purpose                         |
| -------------------------------------------------- | ------------------------------- |
| `src/lib/memory/processors/processorFactory.ts`    | Factory for creating processors |
| `src/lib/memory/processors/tokenLimitProcessor.ts` | Token-based trimming            |
| `src/lib/memory/processors/roleFilterProcessor.ts` | Role-based filtering            |
| `src/lib/memory/processors/timeWindowProcessor.ts` | Time-based filtering            |
| `src/lib/memory/processors/types.ts`               | Processor type definitions      |

### 6.3 Detailed Tasks

#### Task 5.1: Define Processor Interface

```typescript
// src/lib/memory/processors/types.ts

export type MemoryProcessor = {
  name: string;
  process(messages: ChatMessage[], context: ProcessorContext): ChatMessage[];
};

export type ProcessorContext = {
  maxTokens?: number;
  currentTokens: number;
  config: MemoryProcessorOptions;
};
```

#### Task 5.2: Implement Token Limit Processor

```typescript
// src/lib/memory/processors/tokenLimitProcessor.ts

export class TokenLimitProcessor implements MemoryProcessor {
  name = "tokenLimit";

  process(messages: ChatMessage[], context: ProcessorContext): ChatMessage[] {
    // Preserve system messages
    // Trim from middle, keeping recent messages
    // Return messages within token budget
  }
}
```

#### Task 5.3: Implement Role Filter Processor

```typescript
// src/lib/memory/processors/roleFilterProcessor.ts

export class RoleFilterProcessor implements MemoryProcessor {
  name = "roleFilter";

  process(messages: ChatMessage[], context: ProcessorContext): ChatMessage[] {
    // Filter by includeRoles or excludeRoles
  }
}
```

### 6.4 Testing Requirements

```typescript
describe("MemoryProcessors", () => {
  describe("TokenLimitProcessor", () => {
    it("should trim messages to fit token budget");
    it("should preserve system messages");
    it("should keep recent messages");
  });

  describe("RoleFilterProcessor", () => {
    it("should include only specified roles");
    it("should exclude specified roles");
  });
});
```

### 6.5 Deliverables

- [ ] Processor factory and implementations
- [ ] Unit tests
- [ ] Documentation for custom processors

### 6.6 Estimated Effort

| Task                            | Effort     |
| ------------------------------- | ---------- |
| Processor interface and factory | 1 day      |
| Token limit processor           | 1 day      |
| Role filter processor           | 0.5 day    |
| Time window processor           | 0.5 day    |
| Custom processor support        | 1 day      |
| Tests                           | 1 day      |
| **Total**                       | **5 days** |

---

## 7. Phase 6: Storage Backend Integration

**Duration:** 2 weeks
**Priority:** Medium
**Dependencies:** Phase 3

### 7.1 Objectives

- Implement production-ready vector store backends
- Support Redis Stack (RediSearch)
- Support Qdrant
- Support PGVector
- Support Pinecone (optional)

### 7.2 Files to Create

| File                                                 | Purpose                     |
| ---------------------------------------------------- | --------------------------- |
| `src/lib/memory/vectorStores/redisVectorStore.ts`    | Redis Stack with RediSearch |
| `src/lib/memory/vectorStores/qdrantVectorStore.ts`   | Qdrant cloud/self-hosted    |
| `src/lib/memory/vectorStores/pgvectorStore.ts`       | PostgreSQL with pgvector    |
| `src/lib/memory/vectorStores/pineconeVectorStore.ts` | Pinecone cloud              |

### 7.3 Detailed Tasks

#### Task 6.1: Implement Redis Vector Store

```typescript
// src/lib/memory/vectorStores/redisVectorStore.ts

export class RedisVectorStore implements VectorStore {
  // Use redis-stack with FT.CREATE for vector index
  // Support HNSW algorithm
  // Use JSON storage with metadata
  // Implement KNN search with filters
}
```

**Redis Index Schema:**

```
FT.CREATE neurolink_vectors
  ON JSON PREFIX 1 neurolink_vectors:
  SCHEMA
    $.vector VECTOR HNSW 6 DIM {dimensions} DISTANCE_METRIC COSINE
    $.metadata.threadId TAG
    $.metadata.resourceId TAG
    $.metadata.role TAG
    $.metadata.timestamp TEXT
```

#### Task 6.2: Implement Qdrant Vector Store

```typescript
// src/lib/memory/vectorStores/qdrantVectorStore.ts

export class QdrantVectorStore implements VectorStore {
  // Use @qdrant/js-client-rest
  // Create collection with vector config
  // Support payload filtering
  // Handle connection errors gracefully
}
```

#### Task 6.3: Implement PGVector Store

```typescript
// src/lib/memory/vectorStores/pgvectorStore.ts

export class PGVectorStore implements VectorStore {
  // Use pg client
  // Create table with vector column
  // Use ivfflat or hnsw index
  // Implement <=> operator for cosine distance
}
```

**PostgreSQL Schema:**

```sql
CREATE TABLE neurolink_vectors (
  id TEXT PRIMARY KEY,
  vector vector(768),
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX ON neurolink_vectors USING ivfflat (vector vector_cosine_ops);
```

#### Task 6.4: Implement Pinecone Vector Store

```typescript
// src/lib/memory/vectorStores/pineconeVectorStore.ts

export class PineconeVectorStore implements VectorStore {
  // Use @pinecone-database/pinecone
  // Handle namespace scoping
  // Support metadata filtering
}
```

### 7.4 Testing Requirements

```typescript
// test/integration/vectorStores/redis.test.ts
describe("RedisVectorStore", () => {
  // Requires Redis Stack running
  it("should create index");
  it("should upsert vectors");
  it("should search with filters");
  it("should delete by filter");
});

// Similar tests for each backend
```

### 7.5 Deliverables

- [ ] Redis vector store implementation
- [ ] Qdrant vector store implementation
- [ ] PGVector store implementation
- [ ] Pinecone vector store implementation (optional)
- [ ] Integration tests for each backend
- [ ] Docker compose for local testing

### 7.6 Estimated Effort

| Task                  | Effort                |
| --------------------- | --------------------- |
| Redis vector store    | 3 days                |
| Qdrant vector store   | 2 days                |
| PGVector store        | 3 days                |
| Pinecone vector store | 2 days                |
| Integration tests     | 2 days                |
| Docker setup          | 1 day                 |
| **Total**             | **13 days (2 weeks)** |

---

## 8. Phase 7: Testing and Migration

**Duration:** 2 weeks
**Priority:** Critical
**Dependencies:** All previous phases

### 8.1 Objectives

- Comprehensive integration testing
- Performance benchmarking
- Migration utilities for existing data
- Documentation completion

### 8.2 Testing Strategy

#### 8.2.1 Unit Tests

| Component        | Target Coverage |
| ---------------- | --------------- |
| Type definitions | 100%            |
| Memory layers    | 90%             |
| Processors       | 90%             |
| Storage backends | 85%             |

#### 8.2.2 Integration Tests

| Test Suite                   | Description                |
| ---------------------------- | -------------------------- |
| `memory-integration.test.ts` | Full three-layer flow      |
| `backward-compat.test.ts`    | Existing API compatibility |
| `redis-integration.test.ts`  | Redis-based storage        |
| `semantic-recall.test.ts`    | Vector search accuracy     |

#### 8.2.3 Performance Benchmarks

| Benchmark                     | Target                  |
| ----------------------------- | ----------------------- |
| Single message indexing       | < 100ms                 |
| Batch indexing (100 msgs)     | < 2s                    |
| Semantic search (10k vectors) | < 500ms                 |
| Context assembly              | < 50ms                  |
| Memory overhead               | < 100MB for 10k vectors |

### 8.3 Migration Utilities

#### Task 7.1: Create Migration Script

```typescript
// scripts/migrate-to-three-layer-memory.ts

async function migrateToSemanticRecall(
  oldRedisUrl: string,
  memory: ThreeLayerMemoryManager,
  options: MigrationOptions,
): Promise<MigrationResult> {
  // 1. List all existing sessions
  // 2. For each session, retrieve messages
  // 3. Index messages in semantic recall layer
  // 4. Report progress
}
```

#### Task 7.2: Backward Compatibility Layer

```typescript
// src/lib/memory/compatibilityLayer.ts

export function createMemoryFromLegacyConfig(
  config: ConversationMemoryConfig,
): ThreeLayerMemoryConfig {
  return {
    enabled: config.enabled,
    storage: { type: "memory" },
    conversationHistory: {
      enabled: true,
      lastMessages: config.maxTurnsPerSession ?? 20,
      enableSummarization: config.enableSummarization,
      tokenThreshold: config.tokenThreshold,
      summarizationProvider: config.summarizationProvider,
      summarizationModel: config.summarizationModel,
    },
  };
}
```

### 8.4 Documentation Updates

| Document                             | Updates                       |
| ------------------------------------ | ----------------------------- |
| `docs/features/memory.md`            | Full three-layer memory guide |
| `docs/sdk/api-reference.md`          | Memory API reference          |
| `docs/migration/memory-migration.md` | Migration guide               |
| `CLAUDE.md`                          | Memory section update         |

### 8.5 Deliverables

- [ ] Complete test suite with >85% coverage
- [ ] Performance benchmark suite
- [ ] Migration script
- [ ] Compatibility layer
- [ ] Updated documentation
- [ ] Release notes

### 8.6 Estimated Effort

| Task                   | Effort                |
| ---------------------- | --------------------- |
| Unit tests             | 3 days                |
| Integration tests      | 3 days                |
| Performance benchmarks | 2 days                |
| Migration utilities    | 2 days                |
| Documentation          | 2 days                |
| Bug fixes and polish   | 2 days                |
| **Total**              | **14 days (2 weeks)** |

---

## 9. Estimated Total Effort

| Phase                                 | Duration        | Dependencies  |
| ------------------------------------- | --------------- | ------------- |
| Phase 1: Memory Interface Redesign    | 1 week          | None          |
| Phase 2: History Layer Implementation | 1 week          | Phase 1       |
| Phase 3: Semantic Recall Layer        | 2 weeks         | Phase 1, 2    |
| Phase 4: Working Memory Layer         | 1.5 weeks       | Phase 1       |
| Phase 5: Memory Processors            | 1 week          | Phase 2, 3, 4 |
| Phase 6: Storage Backend Integration  | 2 weeks         | Phase 3       |
| Phase 7: Testing and Migration        | 2 weeks         | All           |
| **Total**                             | **~10.5 weeks** |               |

### 9.1 Parallel Execution Opportunities

```
Week 1-2:  Phase 1 (Foundation)
Week 2-3:  Phase 2 (History Layer)
Week 3-5:  Phase 3 (Semantic Recall) | Phase 4 (Working Memory) [Parallel]
Week 5-6:  Phase 5 (Processors)
Week 6-8:  Phase 6 (Storage Backends)
Week 8-10: Phase 7 (Testing and Migration)
```

**With parallel execution: ~8-9 weeks**

### 9.2 Resource Requirements

| Resource         | Allocation                      |
| ---------------- | ------------------------------- |
| Senior Developer | Full-time lead                  |
| Developer        | Part-time support (Phases 3, 6) |
| QA Engineer      | Part-time (Phases 5, 7)         |
| Technical Writer | Part-time (Phase 7)             |

---

## 10. Risk Assessment and Backward Compatibility

### 10.1 Risk Matrix

| Risk                             | Likelihood | Impact | Mitigation                                              |
| -------------------------------- | ---------- | ------ | ------------------------------------------------------- |
| Breaking changes to existing API | Low        | High   | Comprehensive compatibility layer, deprecation warnings |
| Performance regression           | Medium     | High   | Benchmarks, lazy loading, optional features             |
| Vector store vendor lock-in      | Medium     | Medium | Abstract interface, multiple backends                   |
| Memory leaks with vector storage | Medium     | High   | Careful resource management, close() methods            |
| Embedding API rate limits        | High       | Medium | Batch operations, caching, retry logic                  |
| Redis Stack dependency           | Medium     | Low    | Fallback to in-memory, clear documentation              |
| Schema migration complexity      | Low        | Medium | Non-destructive changes, migration script               |

### 10.2 Backward Compatibility Guarantees

#### 10.2.1 API Compatibility

| Existing API                | Status     | Notes                           |
| --------------------------- | ---------- | ------------------------------- |
| `ConversationMemoryConfig`  | Maintained | Mapped to new config internally |
| `conversationMemory` option | Maintained | Works as before                 |
| `storeConversationTurn()`   | Maintained | Same interface                  |
| `buildContextMessages()`    | Maintained | Same return type                |
| Session/User ID concepts    | Maintained | Mapped to Thread/Resource       |

#### 10.2.2 Data Compatibility

| Data Store         | Status           | Notes             |
| ------------------ | ---------------- | ----------------- |
| Redis session data | Fully compatible | No schema changes |
| In-memory sessions | Fully compatible | No changes        |
| Message format     | Fully compatible | No changes        |

#### 10.2.3 Breaking Changes (None Planned)

The implementation specifically avoids:

- Changing existing type signatures
- Requiring new configuration for existing functionality
- Modifying Redis data schemas
- Removing any existing methods

#### 10.2.4 Deprecation Strategy

```typescript
// Deprecation warning example
export type ConversationMemoryConfig = {
  /** @deprecated Use tokenThreshold instead */
  maxTurnsPerSession?: number;
};
```

Deprecated features will:

1. Continue to work for at least 2 major versions
2. Log warnings when used
3. Be documented in migration guide

### 10.3 Rollback Plan

If issues arise during deployment:

1. **Configuration Rollback:**

   ```typescript
   // Disable new features, use only conversation history
   memory: {
     enabled: true,
     semanticRecall: { enabled: false },
     workingMemory: { enabled: false },
   }
   ```

2. **Code Rollback:**
   - All changes in separate files
   - Factory pattern allows runtime switching
   - Feature flags for gradual rollout

3. **Data Rollback:**
   - Vector indexes can be dropped without affecting conversation data
   - Working memory is new data, no impact on existing
   - Conversation history unchanged

### 10.4 Security Considerations

| Concern             | Mitigation                                        |
| ------------------- | ------------------------------------------------- |
| API key exposure    | Use environment variables, never log              |
| Vector data leakage | Respect thread/resource boundaries in all queries |
| Redis security      | Support password authentication, TLS              |
| Memory exhaustion   | Token limits, vector count limits, TTL            |

---

## 11. Success Criteria

### 11.1 Functional Requirements

- [ ] All three memory layers functional
- [ ] Backward compatibility with existing applications
- [ ] Support for Redis and in-memory storage
- [ ] At least 2 embedding providers supported
- [ ] At least 2 vector store backends supported

### 11.2 Non-Functional Requirements

- [ ] No performance regression for existing functionality
- [ ] Semantic search latency < 500ms for 10k vectors
- [ ] Memory overhead < 100MB for typical usage
- [ ] Test coverage > 85%

### 11.3 Documentation Requirements

- [ ] API reference complete
- [ ] Migration guide available
- [ ] Usage examples for all features
- [ ] CLAUDE.md updated

---

## Appendix A: File Structure

```
src/lib/
├── memory/
│   ├── layers/
│   │   ├── conversationHistoryLayer.ts
│   │   ├── semanticRecallLayer.ts
│   │   └── workingMemoryLayer.ts
│   ├── vectorStores/
│   │   ├── vectorStoreFactory.ts
│   │   ├── inMemoryVectorStore.ts
│   │   ├── redisVectorStore.ts
│   │   ├── qdrantVectorStore.ts
│   │   └── pgvectorStore.ts
│   ├── embedders/
│   │   ├── embedderFactory.ts
│   │   ├── openaiEmbedder.ts
│   │   └── vertexEmbedder.ts
│   ├── processors/
│   │   ├── processorFactory.ts
│   │   ├── tokenLimitProcessor.ts
│   │   └── roleFilterProcessor.ts
│   ├── storage/
│   │   └── workingMemoryStorage.ts
│   ├── tools/
│   │   └── updateWorkingMemoryTool.ts
│   └── threeLayerMemoryManager.ts
├── types/
│   ├── memory.ts
│   ├── vectorStore.ts
│   └── embedder.ts
└── core/
    ├── conversationMemoryManager.ts (enhanced)
    └── redisConversationMemoryManager.ts (enhanced)
```

---

## Appendix B: Configuration Examples

### Minimal Configuration (Existing Behavior)

```typescript
const neurolink = new NeuroLink({
  conversationMemory: {
    enabled: true,
    enableSummarization: true,
  },
});
```

### Full Three-Layer Configuration

```typescript
const neurolink = new NeuroLink({
  memory: {
    enabled: true,
    storage: { type: "redis" },
    conversationHistory: {
      enabled: true,
      lastMessages: 30,
      enableSummarization: true,
      tokenThreshold: 50000,
    },
    semanticRecall: {
      enabled: true,
      vectorStore: {
        provider: "redis",
        config: { indexName: "neurolink_vectors" },
      },
      embedder: {
        provider: "openai",
        model: "text-embedding-3-small",
      },
      topK: 5,
      messageRange: { before: 2, after: 2 },
      scope: "resource",
      similarityThreshold: 0.7,
    },
    workingMemory: {
      enabled: true,
      scope: "resource",
      template: `# User Profile
- Name: [Unknown]
- Preferences: [None]`,
    },
  },
});
```

---

## Appendix C: Dependencies Summary

### Required (Existing)

- `redis` - Already in project
- `crypto` - Node.js built-in

### Optional (New)

- `zod` - Schema validation
- `zod-to-json-schema` - Schema conversion
- `@qdrant/js-client-rest` - Qdrant
- `pg` - PostgreSQL
- `@pinecone-database/pinecone` - Pinecone
- `google-auth-library` - Vertex authentication

All optional dependencies use dynamic imports to avoid bundle bloat.

---

---

## 12. Lessons from NeuroLink Memory Evolution

This section captures key learnings from analyzing NeuroLink's memory system git history (August 2025 - December 2025), providing battle-tested patterns to inform the three-layer implementation.

### 12.1 Proven Design Patterns

#### Factory Pattern for Storage Selection

The existing factory pattern has proven invaluable for extensibility:

```typescript
// This pattern successfully enabled Redis addition without breaking in-memory users
export function createConversationMemoryManager(
  config: ConversationMemoryConfig,
  storageType: StorageType = "memory",
  redisConfig?: RedisStorageConfig,
): ConversationMemoryManager | RedisConversationMemoryManager;
```

**Apply to Three-Layer System:**

- Extend factory to support vector store selection
- Add embedder provider selection
- Maintain same configuration-driven approach

#### Token-Based Management Over Turn-Based

The evolution from turn-based (`maxTurnsPerSession: 50`) to token-based (`tokenThreshold: 50000`) proved critical for accurate context window management:

| Approach    | Pros                     | Cons                                   |
| ----------- | ------------------------ | -------------------------------------- |
| Turn-based  | Simple, predictable      | Inaccurate for varying message sizes   |
| Token-based | Accurate, provider-aware | Requires token counting infrastructure |

**Apply to Three-Layer System:**

- Use token-based limits for all layers
- Leverage existing `TokenUtils` infrastructure
- Provider-aware thresholds using `getEffectiveTokenThreshold()`

#### Async Background Summarization

The `setImmediate()` pattern for non-blocking summarization eliminated user-facing latency:

```typescript
// Non-blocking pattern that eliminated latency issues
if (shouldSummarize && !this.summarizationInProgress.has(sessionId)) {
  setImmediate(async () => {
    await this.checkAndSummarize(session, tokenThreshold);
  });
}
```

**Apply to Three-Layer System:**

- Background vector indexing for semantic recall
- Async working memory updates
- Non-blocking memory processors

#### Race Condition Prevention

The `summarizationInProgress` Set pattern prevented duplicate summarization:

```typescript
private summarizationInProgress: Set<string> = new Set();

if (!this.summarizationInProgress.has(sessionId)) {
  this.summarizationInProgress.add(sessionId);
  try { ... } finally { this.summarizationInProgress.delete(sessionId); }
}
```

**Apply to Three-Layer System:**

- Use similar locks for vector indexing operations
- Prevent duplicate embedding generation
- Coordinate cross-layer operations

### 12.2 Configuration Hierarchy

NeuroLink established a clear priority order for configuration:

1. **Runtime/SDK parameters** (highest priority)
2. **Session-level overrides** (e.g., `session.tokenThreshold`)
3. **Environment variables**
4. **Hardcoded defaults** (lowest priority)

**Apply to Three-Layer System:**

```typescript
// Maintain same hierarchy for new memory layers
const effectiveConfig = {
  ...DEFAULT_SEMANTIC_CONFIG, // Hardcoded defaults
  ...getEnvSemanticConfig(), // Environment variables
  ...globalConfig.semanticRecall, // SDK-level config
  ...sessionConfig?.semanticRecall, // Session overrides
  ...runtimeParams?.semanticRecall, // Runtime parameters
};
```

### 12.3 Timestamp Conventions to Preserve

NeuroLink uses two timestamp formats that must be maintained:

| Format            | Usage                             | Example                      |
| ----------------- | --------------------------------- | ---------------------------- |
| Unix milliseconds | Internal storage, performance ops | `1735689600000`              |
| ISO 8601 string   | Human-readable, API responses     | `"2025-01-01T00:00:00.000Z"` |

**Apply to Three-Layer System:**

- Vector metadata: Unix milliseconds for filtering/sorting
- API responses: ISO 8601 for readability
- Use existing conversion utilities

### 12.4 Graceful Degradation Lessons

> **Note:** The Mem0 integration referenced below is deprecated and will be removed. However, the graceful degradation pattern remains valuable for any external service integration.

The graceful degradation pattern (previously demonstrated by Mem0) should be applied to all external services:

```typescript
// Pattern: Continue operation even if external service fails
const memoryContext = vectorStoreClient
  ? await this.searchSemanticContext(userId, prompt).catch(() => null)
  : null;

// Generate response with or without semantic memory
const response = await this.generate({
  context: memoryContext ? [...baseContext, memoryContext] : baseContext,
});
```

**Apply to Three-Layer System:**

- Semantic recall failure → Fall back to conversation history only
- Vector store unavailable → Queue for later indexing
- Embedder failure → Log and continue without semantic features

### 12.5 Message Structure Evolution

The `ChatMessage` type evolved to support token-based memory:

```typescript
// Enhanced structure that must be preserved
type ChatMessage = {
  id: string; // UUID - required for summarization tracking
  role: "user" | "assistant" | "system" | "tool_call" | "tool_result";
  content: string;
  timestamp?: string; // ISO 8601
  metadata?: {
    isSummary?: boolean;
    summarizesFrom?: string; // First message ID summarized
    summarizesTo?: string; // Last message ID summarized
    truncated?: boolean;
    timestamp?: number; // Unix ms for internal tracking
  };
};
```

**Apply to Three-Layer System:**

- Add `vectorId?: string` for semantic recall tracking
- Add `workingMemoryVersion?: number` for working memory snapshots
- Preserve all existing metadata fields

---

## 13. RAG Best Practices Integration

Based on comprehensive RAG research (2024-2025), this section defines best practices for the semantic recall layer implementation.

### 13.1 Chunking Strategy for Conversation Memory

Unlike document RAG, conversation memory has unique characteristics:

| Document RAG                   | Conversation Memory                       |
| ------------------------------ | ----------------------------------------- |
| Large documents need splitting | Messages already discrete units           |
| Semantic boundaries unclear    | Turn boundaries are natural               |
| 512-1024 token chunks typical  | Individual messages vary (1-1000+ tokens) |

**Recommended Approach: Message-Level Indexing with Context Windows**

```typescript
type SemanticRecallConfig = {
  // Index entire messages, not chunks
  indexingUnit: "message" | "turn"; // Default: "message"

  // Retrieve context around matches
  messageRange: {
    before: number; // Messages before match (default: 2)
    after: number; // Messages after match (default: 2)
  };

  // Optional: Combine short messages
  minMessageTokens?: number; // Combine if below threshold
  maxMessageTokens?: number; // Split if above threshold
};
```

**Rationale:**

- Conversation messages are natural semantic units
- Context windows preserve conversational flow
- Avoids artificial chunking boundaries

### 13.2 Hybrid Search Recommendation

Research shows hybrid search (dense + sparse) provides **15-30% better recall**:

```typescript
type SemanticRecallConfig = {
  retrieval: {
    type: "dense" | "hybrid"; // Default: "hybrid" for production

    // Dense (vector) search config
    dense: {
      topK: number; // Default: 50
      similarityThreshold: number; // Default: 0.7
    };

    // Sparse (BM25) search config - for hybrid mode
    sparse?: {
      topK: number; // Default: 50
      algorithm: "bm25";
    };

    // Fusion method for combining results
    fusion?: "rrf" | "linear"; // Default: "rrf" (Reciprocal Rank Fusion)
  };
};
```

**Implementation Phases:**

1. **Phase 1 (MVP):** Dense-only search with in-memory vector store
2. **Phase 2 (Production):** Add BM25 for hybrid search
3. **Phase 3 (Optimization):** Add reranking for top results

### 13.3 Reranking Integration (Optional Enhancement)

Cross-encoder reranking improves accuracy by **20-35%** but adds latency:

```typescript
type SemanticRecallConfig = {
  reranking?: {
    enabled: boolean;
    model: "ms-marco-MiniLM-L-6-v2" | "cohere-rerank-3" | "custom";
    topK: number; // Rerank top N results (default: 10)
  };
};
```

**Recommendation:** Make reranking optional, disabled by default. Enable for high-accuracy use cases.

### 13.4 Embedding Model Selection

Based on 2024-2025 benchmarks:

| Model                         | Dimensions | Best For                      | License    |
| ----------------------------- | ---------- | ----------------------------- | ---------- |
| `text-embedding-3-small`      | 1536       | Cost-sensitive, good accuracy | Commercial |
| `text-embedding-3-large`      | 3072       | Best accuracy                 | Commercial |
| `text-embedding-004` (Vertex) | 768        | Google ecosystem              | Commercial |
| `BGE-M3`                      | 1024       | Open source, multilingual     | Apache 2.0 |

**Default Recommendation:** `text-embedding-3-small` for balance of cost/accuracy.

### 13.5 Similarity Threshold Tuning

Research indicates optimal thresholds vary by use case:

| Use Case               | Recommended Threshold | Notes                   |
| ---------------------- | --------------------- | ----------------------- |
| Factoid queries        | 0.75-0.85             | Higher precision needed |
| Conversational context | 0.65-0.75             | More recall preferred   |
| Multi-hop reasoning    | 0.60-0.70             | Cast wider net          |

**Implementation:**

```typescript
const DEFAULT_SIMILARITY_THRESHOLD = 0.70;  // Balanced default

// Allow per-query adjustment
async retrieve(query: string, options?: {
  similarityThreshold?: number;  // Override default
}): Promise<SemanticMatch[]>
```

### 13.6 Context Window Optimization

With expanding LLM context windows (Gemini 1M+, GPT-4.1 1M+), balance retrieval with context usage:

```typescript
type ContextAssemblyConfig = {
  // Maximum tokens for semantic recall content
  maxSemanticTokens: number; // Default: 4000

  // Prioritization when over budget
  priority: "recency" | "relevance" | "balanced"; // Default: "balanced"

  // Compression for long contexts
  compression?: {
    enabled: boolean;
    strategy: "summarize" | "truncate";
  };
};
```

### 13.7 Evaluation Metrics to Track

Based on RAGAS framework, implement tracking for:

| Metric            | Purpose                                     | Target |
| ----------------- | ------------------------------------------- | ------ |
| Context Precision | Relevance of retrieved messages             | >85%   |
| Context Recall    | Coverage of relevant information            | >80%   |
| Faithfulness      | Generated responses match retrieved context | >90%   |

**Implementation:** Add optional evaluation mode for development/testing.

---

## 14. Mastra Memory Architecture Insights

Analysis of Mastra's three-layer memory approach reveals key architectural patterns to adopt and adapt for NeuroLink.

### 14.1 Three-Layer Architecture Overview

Mastra implements memory as three distinct but interconnected layers:

```
┌─────────────────────────────────────────────────────────────────┐
│                    MEMORY CONTEXT ASSEMBLY                       │
│  Combines all three layers into unified context for LLM         │
└─────────────────────────────────────────────────────────────────┘
                              ▲
        ┌─────────────────────┼─────────────────────┐
        │                     │                     │
        ▼                     ▼                     ▼
┌───────────────┐    ┌───────────────┐    ┌───────────────┐
│  CONVERSATION │    │   SEMANTIC    │    │    WORKING    │
│    HISTORY    │    │    RECALL     │    │    MEMORY     │
├───────────────┤    ├───────────────┤    ├───────────────┤
│ Recent turns  │    │ Vector-based  │    │ Structured    │
│ Thread-scoped │    │ similarity    │    │ user profile  │
│ Auto-expire   │    │ Long-term     │    │ Persistent    │
└───────────────┘    └───────────────┘    └───────────────┘
        │                     │                     │
        ▼                     ▼                     ▼
┌─────────────────────────────────────────────────────────────────┐
│                      STORAGE LAYER                               │
│  Memory/Redis     Vector Store         Memory/Redis/JSON        │
└─────────────────────────────────────────────────────────────────┘
```

### 14.2 Layer Characteristics

#### Conversation History Layer

- **Scope:** Thread-specific (one conversation)
- **Retention:** Configurable `lastMessages` limit
- **Format:** Chronological message array
- **Mastra Config:**

```typescript
conversationHistory: {
  lastMessages: 40,       // Recent message limit
  summarize: false,       // Optional summarization
}
```

#### Semantic Recall Layer

- **Scope:** Thread or resource (cross-conversation)
- **Retention:** Long-term with optional TTL
- **Format:** Vector embeddings with metadata
- **Mastra Config:**

```typescript
semanticRecall: {
  topK: 3,                // Number of matches
  messageRange: { before: 2, after: 1 },  // Context window
}
```

#### Working Memory Layer

- **Scope:** Resource (user profile) or thread
- **Retention:** Persistent until updated
- **Format:** Template (Markdown) or Schema (Zod)
- **Mastra Config:**

```typescript
workingMemory: {
  enabled: true,
  template: `# User Profile
- Name: [Unknown]
- Preferences: [None]
- Key facts: [None]`,
}
```

### 14.3 Scoping Model: Thread vs Resource

Mastra's dual-scope model maps cleanly to NeuroLink concepts:

| Mastra Concept | NeuroLink Equivalent | Description                     |
| -------------- | -------------------- | ------------------------------- |
| `threadId`     | `sessionId`          | Single conversation session     |
| `resourceId`   | `userId`             | User across all sessions        |
| Thread scope   | Per-session          | Isolated to one conversation    |
| Resource scope | Per-user             | Shared across all conversations |

**Key Insight:** Working memory typically uses resource scope (user profile persists), while conversation history uses thread scope (session-specific).

### 14.4 Working Memory Update Mechanism

Mastra provides an agent tool for working memory updates:

```typescript
// Tool automatically injected when working memory enabled
const updateWorkingMemoryTool = {
  name: "update_working_memory",
  description: `Update the user's profile based on new information.
  Current profile:
  ${currentWorkingMemory}

  Guidelines:
  - Only update with significant, lasting information
  - Merge new facts with existing ones
  - Remove outdated information`,

  parameters: workingMemorySchema, // Zod or JSON Schema

  execute: async (update) => {
    await workingMemoryLayer.update(context, update);
    return { success: true };
  },
};
```

**Key Pattern:** The LLM decides when and what to update based on conversation context.

### 14.5 Context Assembly Algorithm

Mastra's context assembly follows this priority:

```typescript
async function assembleContext(
  config: ThreeLayerMemoryConfig,
  context: MemoryContext,
  currentQuery: string,
): Promise<RetrievedMemoryContext> {
  const result: RetrievedMemoryContext = {
    messages: [],
    tokenCount: 0,
  };

  // 1. Working Memory (highest priority - always included if enabled)
  if (config.workingMemory?.enabled) {
    const workingMem = await workingMemoryLayer.retrieve(context);
    if (workingMem) {
      result.workingMemory = workingMem;
      result.tokenCount += estimateTokens(workingMem);
    }
  }

  // 2. Semantic Recall (include relevant past context)
  if (config.semanticRecall?.enabled) {
    const semanticMatches = await semanticRecallLayer.retrieve(
      currentQuery,
      context,
    );
    result.semanticMatches = semanticMatches;
    result.tokenCount += semanticMatches.reduce(
      (sum, m) => sum + estimateTokens(m.content),
      0,
    );
  }

  // 3. Conversation History (recent messages)
  if (config.conversationHistory?.enabled) {
    const messages = await conversationHistoryLayer.retrieve(context);
    result.messages = messages;
    result.tokenCount += messages.reduce(
      (sum, m) => sum + estimateTokens(m.content),
      0,
    );
  }

  return result;
}
```

### 14.6 Template vs Schema Mode for Working Memory

Mastra supports two working memory modes:

| Mode         | Format          | Update Semantics | Best For                 |
| ------------ | --------------- | ---------------- | ------------------------ |
| **Template** | Markdown string | Full replacement | Flexible, human-readable |
| **Schema**   | Zod/JSON Schema | Deep merge       | Structured, type-safe    |

**Template Mode Example:**

```markdown
# User Profile

- Name: John Doe
- Location: San Francisco
- Preferences: Dark mode, concise responses
- Key topics discussed: AI, TypeScript, Cloud
```

**Schema Mode Example:**

```typescript
const userProfileSchema = z.object({
  name: z.string().optional(),
  location: z.string().optional(),
  preferences: z
    .object({
      theme: z.enum(["light", "dark"]).optional(),
      responseStyle: z.enum(["concise", "detailed"]).optional(),
    })
    .optional(),
  topics: z.array(z.string()).optional(),
});
```

**Recommendation for NeuroLink:** Support both modes, default to template for simplicity.

### 14.7 Memory Processors Pipeline

Mastra applies processors after retrieval but before context assembly:

```typescript
// Processor pipeline
const processedMessages = await processors.reduce(
  async (msgs, processor) => processor.process(await msgs, processorContext),
  Promise.resolve(rawMessages),
);
```

**Default Processors:**

1. **TokenLimitProcessor:** Trim to fit context budget
2. **RoleFilterProcessor:** Exclude tool_call/tool_result if configured
3. **DeduplicationProcessor:** Remove duplicate semantic matches

### 14.8 Adoption Recommendations for NeuroLink

| Mastra Pattern          | NeuroLink Adaptation               |
| ----------------------- | ---------------------------------- |
| Thread/Resource scoping | Map to existing sessionId/userId   |
| Working memory tool     | Integrate with MCPToolRegistry     |
| Template mode           | Default for working memory         |
| Context assembly        | Extend `buildContextMessages()`    |
| Processor pipeline      | Add to existing summarization flow |

---

## 15. Updated Implementation Approach

Based on research findings, this section refines the implementation approach with specific recommendations.

### 15.1 Revised Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                    ThreeLayerMemoryManager                           │
│  - Coordinates all three layers                                      │
│  - Assembles unified context                                         │
│  - Manages lifecycle and cleanup                                     │
└─────────────────────────────────────────────────────────────────────┘
         │                    │                    │
         ▼                    ▼                    ▼
┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
│ Conversation    │  │ Semantic        │  │ Working         │
│ HistoryLayer    │  │ RecallLayer     │  │ MemoryLayer     │
├─────────────────┤  ├─────────────────┤  ├─────────────────┤
│ WRAPS existing: │  │ NEW components: │  │ NEW components: │
│ - Conversation  │  │ - Embedder      │  │ - Template/     │
│   MemoryManager │  │ - VectorStore   │  │   Schema store  │
│ - RedisConv.    │  │ - Retriever     │  │ - Update tool   │
│   MemoryManager │  │ - Indexer       │  │ - Merge logic   │
└─────────────────┘  └─────────────────┘  └─────────────────┘
         │                    │                    │
         ▼                    ▼                    ▼
┌─────────────────────────────────────────────────────────────────────┐
│                        Storage Backends                              │
│  In-Memory | Redis | PostgreSQL | Qdrant | Pinecone                 │
└─────────────────────────────────────────────────────────────────────┘
```

### 15.2 Backward Compatibility Strategy

**Critical Requirement:** Existing code using `ConversationMemoryConfig` must continue working without changes.

#### Compatibility Layer Implementation

```typescript
// src/lib/memory/compatibilityLayer.ts

/**
 * Convert legacy ConversationMemoryConfig to ThreeLayerMemoryConfig
 * Called automatically when legacy config detected
 */
export function createThreeLayerConfigFromLegacy(
  legacyConfig: ConversationMemoryConfig,
): ThreeLayerMemoryConfig {
  return {
    enabled: legacyConfig.enabled,

    // Default to existing storage type
    storage: {
      type: legacyConfig.redisConfig ? "redis" : "memory",
      redis: legacyConfig.redisConfig,
    },

    // Map conversation memory settings
    conversationHistory: {
      enabled: true,
      // Preserve all existing summarization settings
      enableSummarization: legacyConfig.enableSummarization,
      tokenThreshold: legacyConfig.tokenThreshold,
      summarizationProvider: legacyConfig.summarizationProvider,
      summarizationModel: legacyConfig.summarizationModel,
      // Map deprecated fields
      lastMessages: legacyConfig.maxTurnsPerSession
        ? legacyConfig.maxTurnsPerSession * 2 // Convert turns to messages
        : undefined,
    },

    // Semantic recall disabled by default for backward compatibility
    semanticRecall: {
      enabled: false,
    },

    // Working memory disabled by default for backward compatibility
    workingMemory: {
      enabled: false,
    },

    // NOTE: Mem0 integration is DEPRECATED and will be removed
    // Users should migrate to the new SemanticRecallLayer
    // mem0: legacyConfig.mem0Enabled ? { ... } : undefined, // REMOVED
  };
}

/**
 * Detect if config is legacy format
 */
export function isLegacyConfig(
  config: ConversationMemoryConfig | ThreeLayerMemoryConfig,
): config is ConversationMemoryConfig {
  return !("conversationHistory" in config) && !("semanticRecall" in config);
}
```

#### NeuroLink SDK Integration

```typescript
// In neurolink.ts constructor
export class NeuroLink {
  constructor(options: NeurolinkOptions) {
    // Handle both legacy and new config formats
    if (options.conversationMemory) {
      if (isLegacyConfig(options.conversationMemory)) {
        // Legacy config - convert automatically
        this.memoryConfig = createThreeLayerConfigFromLegacy(
          options.conversationMemory,
        );
      } else {
        // Already new format
        this.memoryConfig = options.conversationMemory;
      }
    }

    // Support new top-level memory config
    if (options.memory) {
      this.memoryConfig = options.memory;
    }
  }
}
```

### 15.3 Revised Type Definitions

```typescript
// src/lib/types/memory.ts

import type {
  ConversationMemoryConfig,
  RedisStorageConfig,
} from "./conversation.js";

/**
 * Scope for memory operations
 * - "thread": Isolated to single conversation (sessionId)
 * - "resource": Shared across all conversations for a user (userId)
 */
export type MemoryScope = "thread" | "resource";

/**
 * Memory context identifying the thread and resource
 */
export type MemoryContext = {
  /** Thread ID (maps to sessionId) */
  threadId: string;

  /** Resource ID (maps to userId) */
  resourceId?: string;

  /** Override scope for this operation */
  scope?: MemoryScope;

  /** Additional metadata */
  metadata?: Record<string, unknown>;
};

/**
 * Three-layer memory configuration
 * Extends and supersedes ConversationMemoryConfig
 */
export type ThreeLayerMemoryConfig = {
  /** Enable the memory system */
  enabled: boolean;

  /** Storage backend configuration */
  storage: {
    type: "memory" | "redis";
    redis?: RedisStorageConfig;
  };

  /** Conversation history layer (wraps existing managers) */
  conversationHistory?: ConversationHistoryConfig;

  /** Semantic recall layer (vector-based retrieval) */
  semanticRecall?: SemanticRecallConfig;

  /** Working memory layer (structured user profile) */
  workingMemory?: WorkingMemoryConfig;

  /** Memory processors to apply */
  processors?: MemoryProcessorConfig[];

  // NOTE: mem0 field REMOVED - Mem0 integration is deprecated
  // Users should migrate to semanticRecall layer with local vector stores
};

/**
 * Configuration for conversation history layer
 */
export type ConversationHistoryConfig = {
  enabled: boolean;

  /** Maximum recent messages to include (default: 40) */
  lastMessages?: number;

  /** Enable summarization of older messages */
  enableSummarization?: boolean;

  /** Token threshold for summarization trigger */
  tokenThreshold?: number;

  /** Provider for summarization */
  summarizationProvider?: string;

  /** Model for summarization */
  summarizationModel?: string;

  /** Read-only mode (don't persist new messages) */
  readOnly?: boolean;
};

/**
 * Configuration for semantic recall layer
 */
export type SemanticRecallConfig = {
  enabled: boolean;

  /** Vector store configuration */
  vectorStore: {
    provider: "memory" | "redis" | "qdrant" | "pinecone" | "pgvector";
    config?: Record<string, unknown>;
  };

  /** Embedding provider configuration */
  embedder: {
    provider: "openai" | "vertex" | "mistral" | "cohere" | "ollama" | "bedrock";
    model?: string;
    dimensions?: number;
  };

  /** Number of semantic matches to retrieve (default: 5) */
  topK?: number;

  /** Context window around matches */
  messageRange?: {
    before: number; // Default: 2
    after: number; // Default: 2
  };

  /** Scope for semantic search (default: "thread") */
  scope?: MemoryScope;

  /** Minimum similarity threshold (default: 0.70) */
  similarityThreshold?: number;

  /** Roles to exclude from indexing (default: ["tool_call", "tool_result"]) */
  excludeRoles?: Array<
    "user" | "assistant" | "system" | "tool_call" | "tool_result"
  >;

  /** Enable hybrid search with BM25 (default: false) */
  hybridSearch?: boolean;
};

/**
 * Configuration for working memory layer
 */
export type WorkingMemoryConfig = {
  enabled: boolean;

  /** Scope for working memory (default: "resource" for user profiles) */
  scope?: MemoryScope;

  /** Template-based working memory (Markdown format) */
  template?: string;

  /** Schema-based working memory (Zod or JSON Schema) */
  schema?: import("zod").ZodType | object;

  /** Maximum tokens for working memory content (default: 2000) */
  maxTokens?: number;

  /** Custom instructions for the update tool */
  updateInstructions?: string;
};

/**
 * Result from memory context assembly
 */
export type RetrievedMemoryContext = {
  /** Conversation history messages */
  messages: import("./conversation.js").ChatMessage[];

  /** Working memory content (template string or schema object) */
  workingMemory?: string | Record<string, unknown>;

  /** Semantic matches from vector search */
  semanticMatches?: SemanticMatch[];

  /** Total token count of retrieved context */
  tokenCount: number;

  /** Debug information (optional) */
  debug?: MemoryDebugInfo;
};

/**
 * A semantic match from vector search
 */
export type SemanticMatch = {
  /** Matched message */
  message: import("./conversation.js").ChatMessage;

  /** Similarity score (0-1) */
  similarity: number;

  /** Context messages (before and after) */
  context?: import("./conversation.js").ChatMessage[];

  /** Source thread ID */
  threadId: string;

  /** Source resource ID */
  resourceId?: string;
};
```

### 15.4 Revised Phase Timeline

Based on research findings, the phases are reordered for better parallelization:

```
Week 1:     Phase 1 (Memory Interface Redesign)
            ├── Type definitions
            ├── Compatibility layer
            └── Factory pattern extension

Week 2-3:   Phase 2 (History Layer) + Phase 4 (Working Memory) [PARALLEL]
            ├── History: Wrapper around existing managers
            └── Working: Template/schema storage and update tool

Week 3-5:   Phase 3 (Semantic Recall)
            ├── Embedder factory (OpenAI, Vertex)
            ├── Vector store factory (in-memory, Redis)
            ├── Indexing and retrieval
            └── Context window extraction

Week 5-6:   Phase 5 (Memory Processors)
            ├── Token limit processor
            ├── Role filter processor
            └── Custom processor support

Week 6-8:   Phase 6 (Storage Backend Integration)
            ├── Qdrant vector store
            ├── PGVector store
            └── Production optimizations

Week 8-10:  Phase 7 (Testing and Migration)
            ├── Integration tests
            ├── Performance benchmarks
            ├── Migration utilities
            └── Documentation
```

**Total: 8-10 weeks** (reduced from 10.5 weeks due to better parallelization)

### 15.5 Key Implementation Decisions

Based on research, these decisions are finalized:

| Decision                    | Choice                                | Rationale                             |
| --------------------------- | ------------------------------------- | ------------------------------------- |
| **Chunking strategy**       | Message-level with context windows    | Conversations have natural boundaries |
| **Default retrieval**       | Dense-only (MVP), Hybrid (Production) | Phased complexity                     |
| **Default embedder**        | OpenAI text-embedding-3-small         | Best cost/accuracy balance            |
| **Working memory mode**     | Template (default), Schema (optional) | Simplicity first                      |
| **Similarity threshold**    | 0.70 default, configurable            | Balanced recall/precision             |
| **Update mechanism**        | MCPToolRegistry integration           | Leverages existing infrastructure     |
| **Background processing**   | setImmediate pattern                  | Proven non-blocking approach          |
| **Race condition handling** | In-progress tracking Set              | Proven pattern from summarization     |

### 15.6 Integration with Existing Systems

#### ConversationMemoryManager Integration

```typescript
// ConversationHistoryLayer wraps existing manager
export class ConversationHistoryLayer {
  constructor(
    private manager: ConversationMemoryManager | RedisConversationMemoryManager,
    private config: ConversationHistoryConfig,
  ) {}

  // Delegate to existing implementation
  async retrieve(context: MemoryContext): Promise<ChatMessage[]> {
    const messages = await this.manager.buildContextMessages(context.threadId);

    // Apply lastMessages limit if configured
    if (
      this.config.lastMessages &&
      messages.length > this.config.lastMessages
    ) {
      return messages.slice(-this.config.lastMessages);
    }

    return messages;
  }

  async store(
    context: MemoryContext,
    userMessage: string,
    aiResponse: string,
    options?: StoreConversationTurnOptions,
  ): Promise<void> {
    if (this.config.readOnly) {
      return; // Skip persistence in read-only mode
    }

    await this.manager.storeConversationTurn({
      sessionId: context.threadId,
      userId: context.resourceId,
      userMessage,
      aiResponse,
      enableSummarization: this.config.enableSummarization,
      ...options,
    });
  }
}
```

#### MCPToolRegistry Integration for Working Memory

```typescript
// Register working memory update tool with MCPToolRegistry
export function registerWorkingMemoryTool(
  toolRegistry: MCPToolRegistry,
  workingMemoryLayer: WorkingMemoryLayer,
  context: MemoryContext,
): void {
  const tool = createUpdateWorkingMemoryTool(workingMemoryLayer, context);

  toolRegistry.registerBuiltInTool({
    name: "update_working_memory",
    description: tool.description,
    parameters: tool.parameters,
    execute: tool.execute,
  });
}
```

### 15.7 Success Metrics (Updated)

| Metric                       | Target                                | Measurement Method    |
| ---------------------------- | ------------------------------------- | --------------------- |
| **Backward Compatibility**   | 100% existing tests pass              | CI test suite         |
| **Semantic Search Latency**  | <200ms (in-memory), <500ms (external) | Performance benchmark |
| **Context Assembly Latency** | <50ms                                 | Performance benchmark |
| **Memory Overhead**          | <50MB for 10K vectors (in-memory)     | Memory profiling      |
| **Embedding Latency**        | <100ms per message                    | Performance benchmark |
| **Test Coverage**            | >85%                                  | Coverage report       |
| **RAGAS Context Precision**  | >80%                                  | Evaluation pipeline   |

---

## Version History

| Version | Date       | Author         | Changes                                                                                                                                         |
| ------- | ---------- | -------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| 1.0     | 2026-01-22 | NeuroLink Team | Initial draft                                                                                                                                   |
| 1.1     | 2026-01-23 | NeuroLink Team | Added research-based sections: Lessons from Memory Evolution, RAG Best Practices, Mastra Architecture Insights, Updated Implementation Approach |
