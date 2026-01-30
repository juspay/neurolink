# Three-Layer Memory System Implementation Guide

## Executive Summary

This document provides a comprehensive implementation guide for adding a Mastra-style three-layer memory system to NeuroLink. The proposed architecture enhances NeuroLink's existing conversation memory with semantic recall (vector-based) and working memory (structured knowledge) capabilities.

**Target Architecture:**

1. **Conversation History Layer** - Message persistence across threads (EXISTING - enhanced)
2. **Semantic Recall Layer** - Vector-based similarity search using embeddings (NEW)
3. **Working Memory Layer** - Structured knowledge storage with templates or schemas (NEW)

---

## Table of Contents

1. [Current NeuroLink Memory Analysis](#1-current-neurolink-memory-analysis)
2. [Gap Analysis vs Mastra](#2-gap-analysis-vs-mastra)
3. [Three-Layer Memory Architecture](#3-three-layer-memory-architecture)
4. [TypeScript Interfaces](#4-typescript-interfaces)
5. [Conversation History Layer (Enhanced)](#5-conversation-history-layer-enhanced)
6. [Semantic Recall Layer](#6-semantic-recall-layer)
7. [Working Memory Layer](#7-working-memory-layer)
8. [Vector Store Integration](#8-vector-store-integration)
9. [Embedding Provider Integration](#9-embedding-provider-integration)
10. [Storage Integration](#10-storage-integration)
11. [Memory Manager Unified API](#11-memory-manager-unified-api)
12. [Code Examples](#12-code-examples)
13. [Implementation Plan](#13-implementation-plan)
14. [Migration Strategy](#14-migration-strategy)

---

## 1. Current NeuroLink Memory Analysis

### Existing Memory Components

NeuroLink currently implements a **single-layer conversation memory system** with the following components:

#### Core Files

| File                                             | Purpose                              |
| ------------------------------------------------ | ------------------------------------ |
| `src/lib/core/conversationMemoryManager.ts`      | In-memory conversation storage       |
| `src/lib/core/redisConversationMemoryManager.ts` | Redis-based persistent storage       |
| `src/lib/core/conversationMemoryFactory.ts`      | Factory for creating memory managers |
| `src/lib/core/conversationMemoryInitializer.ts`  | Initialization and configuration     |
| `src/lib/memory/mem0Initializer.ts`              | Mem0 cloud API integration           |
| `src/lib/types/conversation.ts`                  | Type definitions                     |
| `src/lib/config/conversationMemory.ts`           | Configuration defaults               |
| `src/lib/utils/conversationMemory.ts`            | Utility functions                    |
| `src/lib/utils/redis.ts`                         | Redis utility functions              |

> **⚠️ DEPRECATION:** Mem0 integration is scheduled for removal. See 00-MASTER-IMPLEMENTATION-GUIDE.md for migration details.

#### Current Architecture

```typescript
// Current Session Memory Structure
type SessionMemory = {
  sessionId: string;
  userId?: string;
  title?: string;
  messages: ChatMessage[];
  createdAt: number;
  lastActivity: number;
  summarizedUpToMessageId?: string;  // Pointer-based summarization
  summarizedMessage?: string;
  tokenThreshold?: number;
  lastTokenCount?: number;
  lastCountedAt?: number;
  metadata?: { userRole?: string; tags?: string[]; customData?: Record<string, unknown> };
};

// Current Chat Message Structure
type ChatMessage = {
  id: string;
  role: "user" | "assistant" | "system" | "tool_call" | "tool_result";
  content: string;
  timestamp?: string;
  tool?: string;
  args?: Record<string, unknown>;
  result?: { success?: boolean; result?: unknown; error?: string };
  events?: StreamEventSequence[];
  metadata?: { isSummary?: boolean; summarizesFrom?: string; summarizesTo?: string; ... };
};
```

#### Current Features

**Strengths:**

- Token-based summarization with pointer system (non-destructive)
- Dual storage backends (in-memory + Redis)
- Session-scoped conversation isolation
- Auto-generated conversation titles
- Tool call/result tracking
- Event sequence tracking for stream reconstruction
- Configurable summarization provider/model
- TTL-based session expiration (Redis)

**Limitations:**

- No semantic/vector-based message retrieval
- No cross-thread/cross-session search
- No structured working memory (user profiles, preferences)
- No embedding integration
- Limited to recent message context only
- Mem0 integration is external cloud-only, not local

> **⚠️ DEPRECATION:** Mem0 integration is scheduled for removal. See 00-MASTER-IMPLEMENTATION-GUIDE.md for migration details.

### Existing Storage Patterns

```typescript
// Redis Key Structure
const sessionKey = `${keyPrefix}${userId || "randomUser"}:${sessionId}`;
const userSessionsKey = `${userSessionsKeyPrefix}${userId}`;

// Serialization/Deserialization
function serializeConversation(conversation: RedisConversationObject): string;
function deserializeConversation(
  data: string | null,
): RedisConversationObject | null;
```

### Existing NeuroLink Memory Features

> **Note:** NeuroLink already has robust memory infrastructure that should be leveraged for the three-layer system:

| Component                          | Location                                           | Description                                                   |
| ---------------------------------- | -------------------------------------------------- | ------------------------------------------------------------- |
| **ConversationMemoryManager**      | `src/lib/memory/conversationMemoryManager.ts`      | In-memory conversation storage with token-based summarization |
| **RedisConversationMemoryManager** | `src/lib/memory/redisConversationMemoryManager.ts` | Redis-backed persistent memory with TTL support               |
| **Mem0 Integration**               | `src/lib/memory/mem0Memory.ts`                     | External cloud-based semantic memory (production-ready)       |
| **Session Management**             | `src/lib/memory/`                                  | User and session scoping for conversation isolation           |
| **Summarization**                  | `src/lib/memory/`                                  | Token-threshold based conversation summarization              |

> **⚠️ DEPRECATION:** Mem0 integration is scheduled for removal. See 00-MASTER-IMPLEMENTATION-GUIDE.md for migration details.

The three-layer memory implementation should extend these existing components rather than replacing them.

---

## 2. Gap Analysis vs Mastra

### Feature Comparison Matrix

| Feature                     | NeuroLink Current      | Mastra                    | Gap                       |
| --------------------------- | ---------------------- | ------------------------- | ------------------------- |
| **Conversation History**    | Yes (token-based)      | Yes (lastMessages config) | Minor enhancements needed |
| **Semantic Recall**         | No                     | Yes (vector search)       | **Full implementation**   |
| **Working Memory**          | No                     | Yes (template/schema)     | **Full implementation**   |
| **Vector Store**            | No                     | 17+ integrations          | **Full implementation**   |
| **Embedding Models**        | No                     | Multi-provider            | **Full implementation**   |
| **Cross-Thread Search**     | No                     | Yes (scope: resource)     | **Full implementation**   |
| **Thread/Resource Scoping** | Partial (session/user) | Yes (thread/resource)     | Enhancement needed        |
| **Memory Processors**       | Yes (summarization)    | Yes (trim/filter)         | Similar capability        |
| **Read-Only Mode**          | No                     | Yes                       | Minor addition            |
| **Auto Title Generation**   | Yes                    | Yes                       | Already implemented       |

### Critical Gaps

1. **Semantic Recall Layer**
   - No vector storage integration
   - No embedding generation
   - No similarity search capability
   - No messageRange context retrieval

2. **Working Memory Layer**
   - No persistent user profile storage
   - No template-based memory format
   - No schema-based (Zod) memory format
   - No agent-driven memory updates

3. **Vector Infrastructure**
   - No vector store abstraction
   - No embedding model abstraction
   - No index management

---

## 3. Three-Layer Memory Architecture

### High-Level Architecture

```
                                    NeuroLink Memory System
                                           |
                    +----------------------+----------------------+
                    |                      |                      |
            Conversation              Semantic                Working
               History                 Recall                 Memory
                    |                      |                      |
            +-------+-------+       +------+------+       +-------+-------+
            |               |       |             |       |               |
        In-Memory       Redis    Vector Store  Embedder  Template      Schema
                                     |             |       (MD)         (Zod)
                              +------+------+      |
                              |      |      |      |
                           Qdrant  Redis  PGVector  +-- OpenAI
                           Chroma  Pinecone        +-- Vertex
                                                   +-- Anthropic
                                                   +-- Local (FastEmbed)
```

### Data Flow

```
User Message → NeuroLink.generate()
                    |
                    ↓
            ┌───────────────────┐
            │  Memory Manager   │
            └───────────────────┘
                    |
        +-----------+-----------+
        |           |           |
        ↓           ↓           ↓
┌───────────┐ ┌───────────┐ ┌───────────┐
│Conversation│ │ Semantic  │ │  Working  │
│  History   │ │  Recall   │ │  Memory   │
└───────────┘ └───────────┘ └───────────┘
        |           |           |
        ↓           ↓           ↓
   Recent Msgs   Similar    User Profile
   + Summary     Messages   + Preferences
        |           |           |
        +-----------+-----------+
                    |
                    ↓
            ┌───────────────────┐
            │  Context Assembly │
            │   (Token-aware)   │
            └───────────────────┘
                    |
                    ↓
              AI Provider
```

### Scoping Model

Following Mastra's two-tier scoping:

```typescript
// Thread-scoped: Isolated per conversation
{
  threadId: "conversation-123",
  scope: "thread"
}

// Resource-scoped: Shared across all threads for a user/entity
{
  threadId: "conversation-123",
  resourceId: "user-alice-456",
  scope: "resource"
}
```

---

## 4. TypeScript Interfaces

### Core Memory Types

```typescript
// src/lib/types/memory.ts

import type { z } from "zod";
import type { JSONSchema7 } from "json-schema";

/**
 * Memory scope determines data isolation boundaries
 */
export type MemoryScope = "thread" | "resource";

/**
 * Memory layer identifiers
 */
export type MemoryLayerType = "conversation" | "semantic" | "working";

/**
 * Unified memory configuration
 */
export type ThreeLayerMemoryConfig = {
  /** Enable the three-layer memory system */
  enabled: boolean;

  /** Storage backend configuration */
  storage: MemoryStorageConfig;

  /** Conversation history layer configuration */
  conversationHistory?: ConversationHistoryConfig;

  /** Semantic recall layer configuration */
  semanticRecall?: SemanticRecallConfig;

  /** Working memory layer configuration */
  workingMemory?: WorkingMemoryConfig;

  /** Memory processors for context assembly */
  processors?: MemoryProcessorConfig[];
};

/**
 * Storage backend configuration
 */
export type MemoryStorageConfig = {
  /** Storage type */
  type: "memory" | "redis" | "postgres" | "libsql";

  /** Redis-specific configuration */
  redis?: RedisStorageConfig;

  /** PostgreSQL-specific configuration */
  postgres?: PostgresStorageConfig;

  /** LibSQL-specific configuration */
  libsql?: LibSQLStorageConfig;
};

/**
 * Conversation history layer configuration
 */
export type ConversationHistoryConfig = {
  /** Enable conversation history (default: true) */
  enabled?: boolean;

  /** Number of recent messages to retrieve (default: 20, false to disable) */
  lastMessages?: number | false;

  /** Enable automatic summarization */
  enableSummarization?: boolean;

  /** Token threshold for summarization trigger */
  tokenThreshold?: number;

  /** Provider for summarization */
  summarizationProvider?: string;

  /** Model for summarization */
  summarizationModel?: string;

  /** Read-only mode (no message persistence) */
  readOnly?: boolean;
};

/**
 * Semantic recall layer configuration
 */
export type SemanticRecallConfig = {
  /** Enable semantic recall (default: false) */
  enabled?: boolean;

  /** Vector store configuration */
  vectorStore: VectorStoreConfig;

  /** Embedding model configuration */
  embedder: EmbedderConfig;

  /** Number of semantically similar messages to retrieve (default: 3) */
  topK?: number;

  /** Context range around matched messages */
  messageRange?: number | { before: number; after: number };

  /** Search scope: thread-only or all user threads */
  scope?: MemoryScope;

  /** Minimum similarity threshold (0-1) */
  similarityThreshold?: number;

  /** Exclude certain message roles from indexing */
  excludeRoles?: Array<"system" | "tool_call" | "tool_result">;
};

/**
 * Working memory layer configuration
 */
export type WorkingMemoryConfig = {
  /** Enable working memory (default: false) */
  enabled?: boolean;

  /** Storage scope for working memory */
  scope?: MemoryScope;

  /** Template-based configuration (Markdown format) */
  template?: string;

  /** Schema-based configuration (Zod or JSON Schema) */
  schema?: z.ZodObject<z.ZodRawShape> | JSONSchema7;

  /** Auto-update instructions for the agent */
  updateInstructions?: string;

  /** Maximum size in tokens */
  maxTokens?: number;
};

/**
 * Vector store configuration
 */
export type VectorStoreConfig = {
  /** Vector store provider */
  provider: VectorStoreProvider;

  /** Provider-specific configuration */
  config: VectorStoreProviderConfig;

  /** Collection/index name */
  collectionName?: string;

  /** Vector dimensions (auto-detected from embedder if not specified) */
  dimensions?: number;

  /** Distance metric */
  metric?: "cosine" | "euclidean" | "dotProduct";
};

/**
 * Supported vector store providers
 */
export type VectorStoreProvider =
  | "redis"
  | "qdrant"
  | "pinecone"
  | "chroma"
  | "pgvector"
  | "mongodb"
  | "elasticsearch"
  | "weaviate"
  | "milvus"
  | "memory";

/**
 * Vector store provider-specific configurations
 */
export type VectorStoreProviderConfig =
  | RedisVectorConfig
  | QdrantVectorConfig
  | PineconeVectorConfig
  | ChromaVectorConfig
  | PGVectorConfig
  | MemoryVectorConfig;

export type RedisVectorConfig = {
  url?: string;
  host?: string;
  port?: number;
  password?: string;
  indexName?: string;
};

export type QdrantVectorConfig = {
  url: string;
  apiKey?: string;
  collectionName: string;
};

export type PineconeVectorConfig = {
  apiKey: string;
  environment: string;
  indexName: string;
  namespace?: string;
};

export type ChromaVectorConfig = {
  path?: string;
  host?: string;
  port?: number;
  collectionName: string;
};

export type PGVectorConfig = {
  connectionString: string;
  tableName?: string;
  schemaName?: string;
  indexType?: "ivfflat" | "hnsw";
};

export type MemoryVectorConfig = {
  /** No additional config needed for in-memory */
};

/**
 * Embedding model configuration
 */
export type EmbedderConfig = {
  /** Embedding provider */
  provider: EmbeddingProvider;

  /** Model name */
  model: string;

  /** Provider-specific configuration */
  config?: EmbedderProviderConfig;

  /** Batch size for embedding requests */
  batchSize?: number;
};

/**
 * Supported embedding providers
 */
export type EmbeddingProvider =
  | "openai"
  | "vertex"
  | "anthropic"
  | "mistral"
  | "cohere"
  | "huggingface"
  | "ollama"
  | "fastembed"
  | "bedrock";

export type EmbedderProviderConfig = {
  apiKey?: string;
  baseUrl?: string;
  projectId?: string;
  region?: string;
  dimensions?: number;
};

/**
 * Memory processor configuration
 */
export type MemoryProcessorConfig = {
  /** Processor type */
  type: "tokenLimit" | "roleFilter" | "timeWindow" | "custom";

  /** Processor-specific options */
  options: MemoryProcessorOptions;
};

export type MemoryProcessorOptions = {
  /** Token limit for trimming */
  maxTokens?: number;

  /** Roles to include/exclude */
  includeRoles?: string[];
  excludeRoles?: string[];

  /** Time window in milliseconds */
  timeWindowMs?: number;

  /** Custom processor function */
  processor?: (messages: ChatMessage[]) => ChatMessage[];
};
```

### Thread and Resource Types

```typescript
// src/lib/types/memory.ts (continued)

/**
 * Memory thread (conversation container)
 */
export type MemoryThread = {
  /** Unique thread identifier */
  id: string;

  /** Resource (user/entity) this thread belongs to */
  resourceId?: string;

  /** Auto-generated or custom title */
  title: string;

  /** Creation timestamp (ISO 8601) */
  createdAt: string;

  /** Last update timestamp (ISO 8601) */
  updatedAt: string;

  /** Thread-specific metadata */
  metadata?: ThreadMetadata;
};

export type ThreadMetadata = {
  /** Custom tags */
  tags?: string[];

  /** Source/channel identifier */
  source?: string;

  /** Thread status */
  status?: "active" | "archived" | "deleted";

  /** Custom key-value data */
  [key: string]: unknown;
};

/**
 * Memory resource (user/entity container)
 */
export type MemoryResource = {
  /** Unique resource identifier */
  id: string;

  /** Resource type (user, organization, etc.) */
  type: string;

  /** Resource display name */
  name?: string;

  /** Working memory content */
  workingMemory?: string | Record<string, unknown>;

  /** Creation timestamp */
  createdAt: string;

  /** Last update timestamp */
  updatedAt: string;

  /** Resource metadata */
  metadata?: ResourceMetadata;
};

export type ResourceMetadata = {
  /** Email address */
  email?: string;

  /** External system ID */
  externalId?: string;

  /** Custom attributes */
  [key: string]: unknown;
};

/**
 * Context for memory operations
 */
export type MemoryContext = {
  /** Thread identifier */
  threadId: string;

  /** Resource identifier (user/entity) */
  resourceId?: string;

  /** Scope for retrieval operations */
  scope?: MemoryScope;

  /** Additional context metadata */
  metadata?: Record<string, unknown>;
};

/**
 * Retrieved memory context for AI generation
 */
export type RetrievedMemoryContext = {
  /** Assembled context messages */
  messages: ChatMessage[];

  /** Working memory content (if enabled) */
  workingMemory?: string | Record<string, unknown>;

  /** Semantically retrieved messages */
  semanticMatches?: SemanticMatch[];

  /** Token count of assembled context */
  tokenCount: number;

  /** Debug information */
  debug?: MemoryDebugInfo;
};

export type SemanticMatch = {
  /** Original message */
  message: ChatMessage;

  /** Similarity score (0-1) */
  score: number;

  /** Thread ID where message was found */
  threadId: string;

  /** Context messages around the match */
  contextMessages?: ChatMessage[];
};

export type MemoryDebugInfo = {
  /** Time taken for each layer retrieval */
  layerTimings: {
    conversationHistory?: number;
    semanticRecall?: number;
    workingMemory?: number;
  };

  /** Messages retrieved from each layer */
  layerCounts: {
    conversationHistory: number;
    semanticRecall: number;
  };

  /** Processing steps applied */
  processors: string[];
};
```

### Vector Store Interfaces

```typescript
// src/lib/types/vectorStore.ts

/**
 * Abstract vector store interface
 */
export type VectorStore = {
  /** Initialize the vector store connection */
  initialize(): Promise<void>;

  /** Create or ensure collection/index exists */
  ensureCollection(config: CollectionConfig): Promise<void>;

  /** Upsert vectors into the store */
  upsert(vectors: VectorEntry[]): Promise<void>;

  /** Search for similar vectors */
  search(query: VectorSearchQuery): Promise<VectorSearchResult[]>;

  /** Delete vectors by ID or filter */
  delete(filter: VectorDeleteFilter): Promise<number>;

  /** Get collection statistics */
  getStats(): Promise<VectorStoreStats>;

  /** Close connections */
  close(): Promise<void>;
};

export type CollectionConfig = {
  name: string;
  dimensions: number;
  metric: "cosine" | "euclidean" | "dotProduct";
  indexConfig?: Record<string, unknown>;
};

export type VectorEntry = {
  id: string;
  vector: number[];
  metadata: VectorMetadata;
};

export type VectorMetadata = {
  /** Message ID */
  messageId: string;

  /** Thread ID */
  threadId: string;

  /** Resource ID */
  resourceId?: string;

  /** Message role */
  role: string;

  /** Message timestamp */
  timestamp: string;

  /** Content preview (for debugging) */
  contentPreview?: string;

  /** Additional metadata */
  [key: string]: unknown;
};

export type VectorSearchQuery = {
  /** Query vector */
  vector: number[];

  /** Number of results */
  topK: number;

  /** Minimum similarity threshold */
  threshold?: number;

  /** Metadata filters */
  filter?: VectorFilter;
};

export type VectorFilter = {
  /** Filter by thread ID */
  threadId?: string | string[];

  /** Filter by resource ID */
  resourceId?: string;

  /** Filter by role */
  role?: string | string[];

  /** Time range filter */
  timestampRange?: { start?: string; end?: string };
};

export type VectorSearchResult = {
  id: string;
  score: number;
  metadata: VectorMetadata;
};

export type VectorDeleteFilter = {
  /** Delete by IDs */
  ids?: string[];

  /** Delete by thread */
  threadId?: string;

  /** Delete by resource */
  resourceId?: string;
};

export type VectorStoreStats = {
  vectorCount: number;
  dimensions: number;
  indexSize?: number;
};
```

### Embedder Interfaces

```typescript
// src/lib/types/embedder.ts

/**
 * Abstract embedder interface
 */
export type Embedder = {
  /** Initialize the embedder */
  initialize(): Promise<void>;

  /** Get dimensions of the embedding model */
  getDimensions(): number;

  /** Embed a single text */
  embed(text: string): Promise<number[]>;

  /** Embed multiple texts in batch */
  embedBatch(texts: string[]): Promise<number[][]>;

  /** Get model information */
  getModelInfo(): EmbedderModelInfo;
};

export type EmbedderModelInfo = {
  provider: EmbeddingProvider;
  model: string;
  dimensions: number;
  maxTokens: number;
};

/**
 * Embedding result with metadata
 */
export type EmbeddingResult = {
  vector: number[];
  tokenCount: number;
  modelInfo: EmbedderModelInfo;
};
```

---

## 5. Conversation History Layer (Enhanced)

The conversation history layer builds upon NeuroLink's existing `ConversationMemoryManager` and `RedisConversationMemoryManager` with enhanced capabilities.

### Enhanced Conversation Manager

```typescript
// src/lib/memory/layers/conversationHistoryLayer.ts

import type {
  ChatMessage,
  ConversationHistoryConfig,
  MemoryContext,
  MemoryThread,
} from "../types/memory.js";
import type { ConversationMemoryManager } from "../core/conversationMemoryManager.js";
import type { RedisConversationMemoryManager } from "../core/redisConversationMemoryManager.js";
import { logger } from "../utils/logger.js";
import { TokenUtils } from "../constants/tokens.js";

/**
 * Conversation History Layer
 *
 * Provides recent message retrieval with optional summarization.
 * Wraps existing NeuroLink conversation memory managers.
 */
export class ConversationHistoryLayer {
  private manager: ConversationMemoryManager | RedisConversationMemoryManager;
  private config: Required<ConversationHistoryConfig>;

  constructor(
    manager: ConversationMemoryManager | RedisConversationMemoryManager,
    config: ConversationHistoryConfig,
  ) {
    this.manager = manager;
    this.config = this.normalizeConfig(config);
  }

  private normalizeConfig(
    config: ConversationHistoryConfig,
  ): Required<ConversationHistoryConfig> {
    return {
      enabled: config.enabled ?? true,
      lastMessages: config.lastMessages ?? 20,
      enableSummarization: config.enableSummarization ?? true,
      tokenThreshold: config.tokenThreshold ?? 50000,
      summarizationProvider: config.summarizationProvider ?? "vertex",
      summarizationModel: config.summarizationModel ?? "gemini-2.5-flash",
      readOnly: config.readOnly ?? false,
    };
  }

  /**
   * Retrieve recent conversation messages
   */
  async retrieve(context: MemoryContext): Promise<ChatMessage[]> {
    if (!this.config.enabled || this.config.lastMessages === false) {
      return [];
    }

    const startTime = Date.now();

    try {
      // Use existing buildContextMessages from the underlying manager
      const messages = await this.manager.buildContextMessages(
        context.threadId,
        context.resourceId,
        this.config.enableSummarization,
      );

      // Apply lastMessages limit if specified
      const limitedMessages = this.config.lastMessages
        ? messages.slice(-this.config.lastMessages)
        : messages;

      logger.debug("[ConversationHistoryLayer] Retrieved messages", {
        threadId: context.threadId,
        totalMessages: messages.length,
        returnedMessages: limitedMessages.length,
        durationMs: Date.now() - startTime,
      });

      return limitedMessages;
    } catch (error) {
      logger.error("[ConversationHistoryLayer] Failed to retrieve messages", {
        threadId: context.threadId,
        error: error instanceof Error ? error.message : String(error),
      });
      return [];
    }
  }

  /**
   * Store a message (respects readOnly mode)
   */
  async store(
    context: MemoryContext,
    userMessage: string,
    aiResponse: string,
    options?: {
      events?: Array<{
        type: string;
        seq: number;
        timestamp: number;
        [key: string]: unknown;
      }>;
      providerDetails?: { provider: string; model: string };
    },
  ): Promise<void> {
    if (this.config.readOnly) {
      logger.debug(
        "[ConversationHistoryLayer] Read-only mode, skipping store",
        {
          threadId: context.threadId,
        },
      );
      return;
    }

    await this.manager.storeConversationTurn({
      sessionId: context.threadId,
      userId: context.resourceId,
      userMessage,
      aiResponse,
      enableSummarization: this.config.enableSummarization,
      events: options?.events,
      providerDetails: options?.providerDetails,
    });
  }

  /**
   * Get or create a thread
   */
  async getOrCreateThread(
    threadId: string,
    resourceId?: string,
  ): Promise<MemoryThread> {
    // Check if thread exists (for Redis manager)
    if ("getUserSessionObject" in this.manager && resourceId) {
      const existing = await this.manager.getUserSessionObject(
        resourceId,
        threadId,
      );
      if (existing) {
        return {
          id: existing.sessionId,
          resourceId: existing.userId,
          title: existing.title,
          createdAt: existing.createdAt,
          updatedAt: existing.updatedAt,
        };
      }
    }

    // Return a new thread placeholder (actual creation happens on first message)
    return {
      id: threadId,
      resourceId,
      title: "New Conversation",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }

  /**
   * List threads for a resource
   */
  async listThreads(resourceId: string): Promise<MemoryThread[]> {
    if ("getUserAllSessionsHistory" in this.manager) {
      const sessions = await this.manager.getUserAllSessionsHistory(resourceId);
      return sessions.map((s) => ({
        id: s.id,
        resourceId,
        title: s.title,
        createdAt: s.createdAt,
        updatedAt: s.updatedAt,
      }));
    }
    return [];
  }

  /**
   * Clear a thread's messages
   */
  async clearThread(threadId: string, resourceId?: string): Promise<boolean> {
    return this.manager.clearSession(threadId, resourceId);
  }
}
```

---

## 6. Semantic Recall Layer

The semantic recall layer provides vector-based message retrieval for long-term context.

### Semantic Recall Implementation

```typescript
// src/lib/memory/layers/semanticRecallLayer.ts

import type {
  ChatMessage,
  SemanticRecallConfig,
  MemoryContext,
  SemanticMatch,
  VectorEntry,
  VectorSearchQuery,
} from "../types/memory.js";
import type { VectorStore } from "../types/vectorStore.js";
import type { Embedder } from "../types/embedder.js";
import { logger } from "../utils/logger.js";
import { randomUUID } from "crypto";

/**
 * Semantic Recall Layer
 *
 * Provides vector-based similarity search for retrieving
 * contextually relevant messages from conversation history.
 */
export class SemanticRecallLayer {
  private vectorStore: VectorStore;
  private embedder: Embedder;
  private config: Required<SemanticRecallConfig>;
  private isInitialized: boolean = false;

  constructor(
    vectorStore: VectorStore,
    embedder: Embedder,
    config: SemanticRecallConfig,
  ) {
    this.vectorStore = vectorStore;
    this.embedder = embedder;
    this.config = this.normalizeConfig(config);
  }

  private normalizeConfig(
    config: SemanticRecallConfig,
  ): Required<SemanticRecallConfig> {
    return {
      enabled: config.enabled ?? true,
      vectorStore: config.vectorStore,
      embedder: config.embedder,
      topK: config.topK ?? 3,
      messageRange: config.messageRange ?? { before: 2, after: 2 },
      scope: config.scope ?? "thread",
      similarityThreshold: config.similarityThreshold ?? 0.7,
      excludeRoles: config.excludeRoles ?? ["tool_call", "tool_result"],
    };
  }

  /**
   * Initialize the semantic recall layer
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    await this.vectorStore.initialize();
    await this.embedder.initialize();

    // Ensure collection exists with correct dimensions
    await this.vectorStore.ensureCollection({
      name: this.config.vectorStore.collectionName ?? "neurolink_messages",
      dimensions: this.embedder.getDimensions(),
      metric: this.config.vectorStore.metric ?? "cosine",
    });

    this.isInitialized = true;
    logger.info("[SemanticRecallLayer] Initialized successfully", {
      dimensions: this.embedder.getDimensions(),
      provider: this.config.embedder.provider,
      model: this.config.embedder.model,
    });
  }

  /**
   * Index a message for semantic search
   */
  async indexMessage(
    message: ChatMessage,
    threadId: string,
    resourceId?: string,
  ): Promise<void> {
    if (!this.config.enabled) return;

    // Skip excluded roles
    if (this.config.excludeRoles?.includes(message.role as never)) {
      return;
    }

    // Skip empty content
    if (!message.content || message.content.trim().length === 0) {
      return;
    }

    try {
      // Generate embedding
      const vector = await this.embedder.embed(message.content);

      // Create vector entry
      const entry: VectorEntry = {
        id: message.id || randomUUID(),
        vector,
        metadata: {
          messageId: message.id,
          threadId,
          resourceId,
          role: message.role,
          timestamp: message.timestamp || new Date().toISOString(),
          contentPreview: message.content.substring(0, 100),
        },
      };

      // Upsert to vector store
      await this.vectorStore.upsert([entry]);

      logger.debug("[SemanticRecallLayer] Indexed message", {
        messageId: message.id,
        threadId,
        role: message.role,
      });
    } catch (error) {
      logger.error("[SemanticRecallLayer] Failed to index message", {
        messageId: message.id,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Index multiple messages in batch
   */
  async indexMessages(
    messages: ChatMessage[],
    threadId: string,
    resourceId?: string,
  ): Promise<void> {
    if (!this.config.enabled || messages.length === 0) return;

    // Filter out excluded roles and empty messages
    const filteredMessages = messages.filter(
      (m) =>
        !this.config.excludeRoles?.includes(m.role as never) &&
        m.content &&
        m.content.trim().length > 0,
    );

    if (filteredMessages.length === 0) return;

    try {
      // Generate embeddings in batch
      const texts = filteredMessages.map((m) => m.content);
      const vectors = await this.embedder.embedBatch(texts);

      // Create vector entries
      const entries: VectorEntry[] = filteredMessages.map((message, index) => ({
        id: message.id || randomUUID(),
        vector: vectors[index],
        metadata: {
          messageId: message.id,
          threadId,
          resourceId,
          role: message.role,
          timestamp: message.timestamp || new Date().toISOString(),
          contentPreview: message.content.substring(0, 100),
        },
      }));

      // Upsert to vector store
      await this.vectorStore.upsert(entries);

      logger.debug("[SemanticRecallLayer] Indexed message batch", {
        count: entries.length,
        threadId,
      });
    } catch (error) {
      logger.error("[SemanticRecallLayer] Failed to index message batch", {
        count: messages.length,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Retrieve semantically similar messages
   */
  async retrieve(
    query: string,
    context: MemoryContext,
    conversationMessages?: ChatMessage[],
  ): Promise<SemanticMatch[]> {
    if (!this.config.enabled) return [];

    const startTime = Date.now();

    try {
      // Generate query embedding
      const queryVector = await this.embedder.embed(query);

      // Build search filter based on scope
      const filter: VectorSearchQuery["filter"] = {};

      if (this.config.scope === "thread") {
        filter.threadId = context.threadId;
      } else if (this.config.scope === "resource" && context.resourceId) {
        filter.resourceId = context.resourceId;
      }

      // Search vector store
      const searchQuery: VectorSearchQuery = {
        vector: queryVector,
        topK: this.config.topK,
        threshold: this.config.similarityThreshold,
        filter,
      };

      const results = await this.vectorStore.search(searchQuery);

      // Fetch context messages around each match
      const matches = await this.enrichWithContext(
        results,
        conversationMessages || [],
      );

      logger.debug("[SemanticRecallLayer] Retrieved semantic matches", {
        threadId: context.threadId,
        queryLength: query.length,
        matchCount: matches.length,
        durationMs: Date.now() - startTime,
      });

      return matches;
    } catch (error) {
      logger.error("[SemanticRecallLayer] Failed to retrieve matches", {
        threadId: context.threadId,
        error: error instanceof Error ? error.message : String(error),
      });
      return [];
    }
  }

  /**
   * Enrich search results with surrounding context messages
   */
  private async enrichWithContext(
    results: Array<{
      id: string;
      score: number;
      metadata: Record<string, unknown>;
    }>,
    conversationMessages: ChatMessage[],
  ): Promise<SemanticMatch[]> {
    const matches: SemanticMatch[] = [];
    const messageRange =
      typeof this.config.messageRange === "number"
        ? { before: this.config.messageRange, after: this.config.messageRange }
        : this.config.messageRange;

    for (const result of results) {
      const metadata = result.metadata;
      const messageId = metadata.messageId as string;

      // Find the message in conversation history
      const messageIndex = conversationMessages.findIndex(
        (m) => m.id === messageId,
      );

      let message: ChatMessage;
      let contextMessages: ChatMessage[] = [];

      if (messageIndex !== -1) {
        message = conversationMessages[messageIndex];

        // Get surrounding context
        const startIdx = Math.max(0, messageIndex - messageRange.before);
        const endIdx = Math.min(
          conversationMessages.length,
          messageIndex + messageRange.after + 1,
        );
        contextMessages = conversationMessages.slice(startIdx, endIdx);
      } else {
        // Message not in current conversation - reconstruct from metadata
        message = {
          id: messageId,
          role: metadata.role as ChatMessage["role"],
          content: (metadata.contentPreview as string) || "",
          timestamp: metadata.timestamp as string,
        };
      }

      matches.push({
        message,
        score: result.score,
        threadId: metadata.threadId as string,
        contextMessages:
          contextMessages.length > 0 ? contextMessages : undefined,
      });
    }

    return matches;
  }

  /**
   * Delete indexed messages for a thread
   */
  async deleteThread(threadId: string): Promise<void> {
    await this.vectorStore.delete({ threadId });
    logger.debug("[SemanticRecallLayer] Deleted thread index", { threadId });
  }

  /**
   * Delete indexed messages for a resource
   */
  async deleteResource(resourceId: string): Promise<void> {
    await this.vectorStore.delete({ resourceId });
    logger.debug("[SemanticRecallLayer] Deleted resource index", {
      resourceId,
    });
  }

  /**
   * Get statistics about indexed vectors
   */
  async getStats(): Promise<{ vectorCount: number }> {
    const stats = await this.vectorStore.getStats();
    return { vectorCount: stats.vectorCount };
  }
}
```

---

## 7. Working Memory Layer

The working memory layer provides structured, persistent storage for user profiles and preferences.

### Working Memory Implementation

```typescript
// src/lib/memory/layers/workingMemoryLayer.ts

import type { z } from "zod";
import type { JSONSchema7 } from "json-schema";
import type {
  WorkingMemoryConfig,
  MemoryContext,
  MemoryResource,
} from "../types/memory.js";
import { logger } from "../utils/logger.js";

/**
 * Working Memory Storage Interface
 * Abstracts the underlying storage mechanism
 */
type WorkingMemoryStorage = {
  get(
    resourceId: string,
    threadId?: string,
  ): Promise<string | Record<string, unknown> | null>;
  set(
    resourceId: string,
    threadId: string | undefined,
    data: string | Record<string, unknown>,
  ): Promise<void>;
  delete(resourceId: string, threadId?: string): Promise<void>;
};

/**
 * Working Memory Layer
 *
 * Provides persistent structured storage for user profiles,
 * preferences, and other continuously relevant information.
 *
 * Supports two formats:
 * - Template-based (Markdown): Free-form text with replace semantics
 * - Schema-based (Zod/JSON Schema): Structured JSON with merge semantics
 */
export class WorkingMemoryLayer {
  private storage: WorkingMemoryStorage;
  private config: Required<WorkingMemoryConfig>;
  private mode: "template" | "schema";
  private zodSchema?: z.ZodObject<z.ZodRawShape>;
  private jsonSchema?: JSONSchema7;

  constructor(storage: WorkingMemoryStorage, config: WorkingMemoryConfig) {
    this.storage = storage;
    this.config = this.normalizeConfig(config);

    // Determine mode
    if (config.schema) {
      this.mode = "schema";
      if (this.isZodSchema(config.schema)) {
        this.zodSchema = config.schema;
      } else {
        this.jsonSchema = config.schema;
      }
    } else {
      this.mode = "template";
    }
  }

  private normalizeConfig(
    config: WorkingMemoryConfig,
  ): Required<WorkingMemoryConfig> {
    return {
      enabled: config.enabled ?? true,
      scope: config.scope ?? "resource",
      template: config.template ?? this.getDefaultTemplate(),
      schema: config.schema,
      updateInstructions:
        config.updateInstructions ?? this.getDefaultUpdateInstructions(),
      maxTokens: config.maxTokens ?? 2000,
    };
  }

  private isZodSchema(schema: unknown): schema is z.ZodObject<z.ZodRawShape> {
    return (
      typeof schema === "object" &&
      schema !== null &&
      "_def" in schema &&
      typeof (schema as { _def: unknown })._def === "object"
    );
  }

  private getDefaultTemplate(): string {
    return `# User Profile
- Name: [Unknown]
- Preferences: [None recorded]
- Goals: [None stated]
- Important Context: [None]

# Conversation Notes
- Key Topics: [None]
- Decisions Made: [None]
- Follow-up Items: [None]`;
  }

  private getDefaultUpdateInstructions(): string {
    return `When you learn new information about the user (name, preferences, goals, etc.),
use the updateWorkingMemory tool to save it. This helps maintain context across conversations.
Only update when you learn something meaningful that should persist.`;
  }

  /**
   * Retrieve working memory for a context
   */
  async retrieve(
    context: MemoryContext,
  ): Promise<string | Record<string, unknown> | null> {
    if (!this.config.enabled) return null;

    const startTime = Date.now();

    try {
      const key = this.getStorageKey(context);
      const data = await this.storage.get(
        context.resourceId || "default",
        this.config.scope === "thread" ? context.threadId : undefined,
      );

      if (!data) {
        // Return initial template/schema if no data exists
        return this.mode === "template"
          ? this.config.template
          : this.getEmptySchemaValue();
      }

      logger.debug("[WorkingMemoryLayer] Retrieved working memory", {
        resourceId: context.resourceId,
        threadId: context.threadId,
        scope: this.config.scope,
        mode: this.mode,
        durationMs: Date.now() - startTime,
      });

      return data;
    } catch (error) {
      logger.error("[WorkingMemoryLayer] Failed to retrieve working memory", {
        resourceId: context.resourceId,
        error: error instanceof Error ? error.message : String(error),
      });
      return null;
    }
  }

  /**
   * Update working memory
   *
   * Template mode: Replace semantics (full content replacement)
   * Schema mode: Merge semantics (deep merge with existing data)
   */
  async update(
    context: MemoryContext,
    data: string | Record<string, unknown>,
    reason?: string,
  ): Promise<void> {
    if (!this.config.enabled) return;

    try {
      let finalData: string | Record<string, unknown>;

      if (this.mode === "schema" && typeof data === "object") {
        // Schema mode: Merge with existing data
        const existing = await this.retrieve(context);
        if (existing && typeof existing === "object") {
          finalData = this.deepMerge(existing as Record<string, unknown>, data);
        } else {
          finalData = data;
        }

        // Validate against schema
        if (this.zodSchema) {
          this.zodSchema.parse(finalData);
        }
      } else {
        // Template mode: Replace semantics
        finalData = data;
      }

      await this.storage.set(
        context.resourceId || "default",
        this.config.scope === "thread" ? context.threadId : undefined,
        finalData,
      );

      logger.info("[WorkingMemoryLayer] Updated working memory", {
        resourceId: context.resourceId,
        threadId: context.threadId,
        mode: this.mode,
        reason,
      });
    } catch (error) {
      logger.error("[WorkingMemoryLayer] Failed to update working memory", {
        resourceId: context.resourceId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Clear working memory for a context
   */
  async clear(context: MemoryContext): Promise<void> {
    await this.storage.delete(
      context.resourceId || "default",
      this.config.scope === "thread" ? context.threadId : undefined,
    );

    logger.debug("[WorkingMemoryLayer] Cleared working memory", {
      resourceId: context.resourceId,
      scope: this.config.scope,
    });
  }

  /**
   * Get the update instructions for the agent
   */
  getUpdateInstructions(): string {
    return this.config.updateInstructions;
  }

  /**
   * Get the schema/template definition for the agent
   */
  getDefinition(): {
    mode: "template" | "schema";
    definition: string | JSONSchema7;
  } {
    if (this.mode === "schema") {
      if (this.zodSchema) {
        // Convert Zod schema to JSON Schema for the agent
        return {
          mode: "schema",
          definition: this.zodToJsonSchema(this.zodSchema),
        };
      } else if (this.jsonSchema) {
        return { mode: "schema", definition: this.jsonSchema };
      }
    }

    return { mode: "template", definition: this.config.template };
  }

  /**
   * Format working memory for inclusion in system prompt
   */
  formatForPrompt(data: string | Record<string, unknown> | null): string {
    if (!data) return "";

    if (typeof data === "string") {
      return `\n\n## Working Memory\n${data}`;
    }

    return `\n\n## Working Memory\n\`\`\`json\n${JSON.stringify(data, null, 2)}\n\`\`\``;
  }

  private getStorageKey(context: MemoryContext): string {
    if (this.config.scope === "thread") {
      return `${context.resourceId || "default"}:${context.threadId}`;
    }
    return context.resourceId || "default";
  }

  private getEmptySchemaValue(): Record<string, unknown> {
    return {};
  }

  private deepMerge(
    target: Record<string, unknown>,
    source: Record<string, unknown>,
  ): Record<string, unknown> {
    const result = { ...target };

    for (const key of Object.keys(source)) {
      if (
        source[key] !== null &&
        typeof source[key] === "object" &&
        !Array.isArray(source[key]) &&
        target[key] !== null &&
        typeof target[key] === "object" &&
        !Array.isArray(target[key])
      ) {
        result[key] = this.deepMerge(
          target[key] as Record<string, unknown>,
          source[key] as Record<string, unknown>,
        );
      } else {
        result[key] = source[key];
      }
    }

    return result;
  }

  private zodToJsonSchema(schema: z.ZodObject<z.ZodRawShape>): JSONSchema7 {
    // Basic Zod to JSON Schema conversion
    // In production, use a library like zod-to-json-schema
    const shape = schema.shape;
    const properties: Record<string, JSONSchema7> = {};

    for (const [key, value] of Object.entries(shape)) {
      properties[key] = this.zodFieldToJsonSchema(value as z.ZodTypeAny);
    }

    return {
      type: "object",
      properties,
    };
  }

  private zodFieldToJsonSchema(field: z.ZodTypeAny): JSONSchema7 {
    const typeName = field._def.typeName;

    switch (typeName) {
      case "ZodString":
        return { type: "string" };
      case "ZodNumber":
        return { type: "number" };
      case "ZodBoolean":
        return { type: "boolean" };
      case "ZodArray":
        return {
          type: "array",
          items: this.zodFieldToJsonSchema(field._def.type),
        };
      case "ZodObject":
        return this.zodToJsonSchema(field as z.ZodObject<z.ZodRawShape>);
      case "ZodOptional":
        return this.zodFieldToJsonSchema(field._def.innerType);
      default:
        return {};
    }
  }
}
```

### Working Memory Tool

```typescript
// src/lib/memory/tools/updateWorkingMemoryTool.ts

import type { z } from "zod";
import type { WorkingMemoryLayer } from "../layers/workingMemoryLayer.js";
import type { MemoryContext } from "../types/memory.js";

/**
 * Create the updateWorkingMemory tool for agents
 */
export function createUpdateWorkingMemoryTool(
  workingMemoryLayer: WorkingMemoryLayer,
  context: MemoryContext,
) {
  const definition = workingMemoryLayer.getDefinition();

  if (definition.mode === "template") {
    return {
      name: "updateWorkingMemory",
      description: `Update the working memory with new information about the user or conversation.
The working memory uses a template format. You must provide the COMPLETE updated content.

Current template structure:
${definition.definition}

When updating, include all existing information plus your changes.`,
      parameters: {
        type: "object",
        properties: {
          content: {
            type: "string",
            description: "The complete updated working memory content",
          },
          reason: {
            type: "string",
            description: "Brief explanation of what was updated and why",
          },
        },
        required: ["content", "reason"],
      },
      execute: async (args: { content: string; reason: string }) => {
        await workingMemoryLayer.update(context, args.content, args.reason);
        return {
          success: true,
          message: `Working memory updated: ${args.reason}`,
        };
      },
    };
  }

  // Schema mode
  return {
    name: "updateWorkingMemory",
    description: `Update the working memory with new information about the user or conversation.
The working memory uses a structured JSON format. You only need to include fields you want to update.

Schema:
${JSON.stringify(definition.definition, null, 2)}

Existing fields will be preserved unless you explicitly update them.`,
    parameters: {
      type: "object",
      properties: {
        updates: {
          type: "object",
          description: "The fields to update in the working memory",
        },
        reason: {
          type: "string",
          description: "Brief explanation of what was updated and why",
        },
      },
      required: ["updates", "reason"],
    },
    execute: async (args: {
      updates: Record<string, unknown>;
      reason: string;
    }) => {
      await workingMemoryLayer.update(context, args.updates, args.reason);
      return {
        success: true,
        message: `Working memory updated: ${args.reason}`,
      };
    },
  };
}
```

---

## 8. Vector Store Integration

### Vector Store Factory

```typescript
// src/lib/memory/vectorStores/vectorStoreFactory.ts

import type { VectorStore, VectorStoreConfig } from "../types/memory.js";
import { logger } from "../utils/logger.js";

/**
 * Create a vector store instance based on configuration
 */
export async function createVectorStore(
  config: VectorStoreConfig,
): Promise<VectorStore> {
  logger.debug("[VectorStoreFactory] Creating vector store", {
    provider: config.provider,
    collectionName: config.collectionName,
  });

  switch (config.provider) {
    case "redis":
      const { RedisVectorStore } = await import("./redisVectorStore.js");
      return new RedisVectorStore(config.config as never);

    case "qdrant":
      const { QdrantVectorStore } = await import("./qdrantVectorStore.js");
      return new QdrantVectorStore(config.config as never);

    case "pinecone":
      const { PineconeVectorStore } = await import("./pineconeVectorStore.js");
      return new PineconeVectorStore(config.config as never);

    case "chroma":
      const { ChromaVectorStore } = await import("./chromaVectorStore.js");
      return new ChromaVectorStore(config.config as never);

    case "pgvector":
      const { PGVectorStore } = await import("./pgvectorStore.js");
      return new PGVectorStore(config.config as never);

    case "memory":
    default:
      const { InMemoryVectorStore } = await import("./inMemoryVectorStore.js");
      return new InMemoryVectorStore();
  }
}
```

### In-Memory Vector Store Implementation

```typescript
// src/lib/memory/vectorStores/inMemoryVectorStore.ts

import type {
  VectorStore,
  CollectionConfig,
  VectorEntry,
  VectorSearchQuery,
  VectorSearchResult,
  VectorDeleteFilter,
  VectorStoreStats,
} from "../types/memory.js";
import { logger } from "../utils/logger.js";

/**
 * In-memory vector store for development and testing
 */
export class InMemoryVectorStore implements VectorStore {
  private vectors: Map<string, VectorEntry> = new Map();
  private collectionConfig?: CollectionConfig;

  async initialize(): Promise<void> {
    logger.debug("[InMemoryVectorStore] Initialized");
  }

  async ensureCollection(config: CollectionConfig): Promise<void> {
    this.collectionConfig = config;
    logger.debug("[InMemoryVectorStore] Collection configured", {
      name: config.name,
      dimensions: config.dimensions,
    });
  }

  async upsert(vectors: VectorEntry[]): Promise<void> {
    for (const entry of vectors) {
      this.vectors.set(entry.id, entry);
    }
    logger.debug("[InMemoryVectorStore] Upserted vectors", {
      count: vectors.length,
    });
  }

  async search(query: VectorSearchQuery): Promise<VectorSearchResult[]> {
    const results: VectorSearchResult[] = [];

    for (const [id, entry] of this.vectors) {
      // Apply filters
      if (query.filter) {
        if (query.filter.threadId) {
          const threadIds = Array.isArray(query.filter.threadId)
            ? query.filter.threadId
            : [query.filter.threadId];
          if (!threadIds.includes(entry.metadata.threadId)) continue;
        }
        if (
          query.filter.resourceId &&
          entry.metadata.resourceId !== query.filter.resourceId
        ) {
          continue;
        }
        if (query.filter.role) {
          const roles = Array.isArray(query.filter.role)
            ? query.filter.role
            : [query.filter.role];
          if (!roles.includes(entry.metadata.role)) continue;
        }
      }

      // Calculate cosine similarity
      const similarity = this.cosineSimilarity(query.vector, entry.vector);

      if (!query.threshold || similarity >= query.threshold) {
        results.push({
          id,
          score: similarity,
          metadata: entry.metadata,
        });
      }
    }

    // Sort by score descending and limit to topK
    return results.sort((a, b) => b.score - a.score).slice(0, query.topK);
  }

  async delete(filter: VectorDeleteFilter): Promise<number> {
    let deleted = 0;

    if (filter.ids) {
      for (const id of filter.ids) {
        if (this.vectors.delete(id)) deleted++;
      }
    }

    if (filter.threadId) {
      for (const [id, entry] of this.vectors) {
        if (entry.metadata.threadId === filter.threadId) {
          this.vectors.delete(id);
          deleted++;
        }
      }
    }

    if (filter.resourceId) {
      for (const [id, entry] of this.vectors) {
        if (entry.metadata.resourceId === filter.resourceId) {
          this.vectors.delete(id);
          deleted++;
        }
      }
    }

    return deleted;
  }

  async getStats(): Promise<VectorStoreStats> {
    return {
      vectorCount: this.vectors.size,
      dimensions: this.collectionConfig?.dimensions ?? 0,
    };
  }

  async close(): Promise<void> {
    this.vectors.clear();
    logger.debug("[InMemoryVectorStore] Closed");
  }

  private cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) return 0;

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
```

### Redis Vector Store Implementation

```typescript
// src/lib/memory/vectorStores/redisVectorStore.ts

import type {
  VectorStore,
  CollectionConfig,
  VectorEntry,
  VectorSearchQuery,
  VectorSearchResult,
  VectorDeleteFilter,
  VectorStoreStats,
  RedisVectorConfig,
} from "../types/memory.js";
import { createClient, type RedisClientType } from "redis";
import { logger } from "../utils/logger.js";

/**
 * Redis vector store using Redis Stack with RediSearch
 */
export class RedisVectorStore implements VectorStore {
  private client: RedisClientType | null = null;
  private config: RedisVectorConfig;
  private collectionConfig?: CollectionConfig;
  private indexName: string;

  constructor(config: RedisVectorConfig) {
    this.config = config;
    this.indexName = config.indexName ?? "neurolink_vectors";
  }

  async initialize(): Promise<void> {
    const url =
      this.config.url ??
      `redis://${this.config.host ?? "localhost"}:${this.config.port ?? 6379}`;

    this.client = createClient({
      url,
      password: this.config.password,
    });

    await this.client.connect();
    logger.info("[RedisVectorStore] Connected to Redis");
  }

  async ensureCollection(config: CollectionConfig): Promise<void> {
    this.collectionConfig = config;

    if (!this.client) throw new Error("Redis client not initialized");

    try {
      // Check if index exists
      await this.client.ft.info(this.indexName);
      logger.debug("[RedisVectorStore] Index already exists", {
        indexName: this.indexName,
      });
    } catch {
      // Create index
      await this.client.ft.create(
        this.indexName,
        {
          "$.vector": {
            type: "VECTOR",
            AS: "vector",
            ALGORITHM: "HNSW",
            TYPE: "FLOAT32",
            DIM: config.dimensions,
            DISTANCE_METRIC:
              config.metric === "cosine"
                ? "COSINE"
                : config.metric === "euclidean"
                  ? "L2"
                  : "IP",
          },
          "$.metadata.threadId": { type: "TAG", AS: "threadId" },
          "$.metadata.resourceId": { type: "TAG", AS: "resourceId" },
          "$.metadata.role": { type: "TAG", AS: "role" },
          "$.metadata.timestamp": { type: "TEXT", AS: "timestamp" },
        },
        {
          ON: "JSON",
          PREFIX: `${this.indexName}:`,
        },
      );

      logger.info("[RedisVectorStore] Created index", {
        indexName: this.indexName,
        dimensions: config.dimensions,
      });
    }
  }

  async upsert(vectors: VectorEntry[]): Promise<void> {
    if (!this.client) throw new Error("Redis client not initialized");

    const pipeline = this.client.multi();

    for (const entry of vectors) {
      const key = `${this.indexName}:${entry.id}`;
      pipeline.json.set(key, "$", {
        id: entry.id,
        vector: entry.vector,
        metadata: entry.metadata,
      });
    }

    await pipeline.exec();

    logger.debug("[RedisVectorStore] Upserted vectors", {
      count: vectors.length,
    });
  }

  async search(query: VectorSearchQuery): Promise<VectorSearchResult[]> {
    if (!this.client) throw new Error("Redis client not initialized");

    // Build filter string
    const filters: string[] = [];
    if (query.filter?.threadId) {
      const threadIds = Array.isArray(query.filter.threadId)
        ? query.filter.threadId
        : [query.filter.threadId];
      filters.push(`@threadId:{${threadIds.join("|")}}`);
    }
    if (query.filter?.resourceId) {
      filters.push(`@resourceId:{${query.filter.resourceId}}`);
    }
    if (query.filter?.role) {
      const roles = Array.isArray(query.filter.role)
        ? query.filter.role
        : [query.filter.role];
      filters.push(`@role:{${roles.join("|")}}`);
    }

    const filterStr = filters.length > 0 ? filters.join(" ") : "*";

    // Convert vector to bytes for Redis
    const vectorBytes = Buffer.from(new Float32Array(query.vector).buffer);

    const results = await this.client.ft.search(
      this.indexName,
      `(${filterStr})=>[KNN ${query.topK} @vector $BLOB AS score]`,
      {
        PARAMS: { BLOB: vectorBytes },
        SORTBY: { BY: "score", DIRECTION: "ASC" },
        DIALECT: 2,
        RETURN: ["$.id", "$.metadata", "score"],
      },
    );

    return results.documents.map((doc) => ({
      id: doc.value["$.id"] as string,
      score: 1 - parseFloat(doc.value.score as string), // Convert distance to similarity
      metadata: JSON.parse(doc.value["$.metadata"] as string),
    }));
  }

  async delete(filter: VectorDeleteFilter): Promise<number> {
    if (!this.client) throw new Error("Redis client not initialized");

    let deleted = 0;

    if (filter.ids) {
      for (const id of filter.ids) {
        const result = await this.client.json.del(`${this.indexName}:${id}`);
        if (result) deleted++;
      }
    }

    // For thread/resource deletion, we need to search and delete
    if (filter.threadId || filter.resourceId) {
      const searchFilter = filter.threadId
        ? `@threadId:{${filter.threadId}}`
        : `@resourceId:{${filter.resourceId}}`;

      const results = await this.client.ft.search(
        this.indexName,
        searchFilter,
        {
          RETURN: ["$.id"],
          LIMIT: { from: 0, size: 10000 },
        },
      );

      for (const doc of results.documents) {
        const id = doc.value["$.id"] as string;
        await this.client.json.del(`${this.indexName}:${id}`);
        deleted++;
      }
    }

    return deleted;
  }

  async getStats(): Promise<VectorStoreStats> {
    if (!this.client) throw new Error("Redis client not initialized");

    const info = await this.client.ft.info(this.indexName);
    return {
      vectorCount: info.numDocs ?? 0,
      dimensions: this.collectionConfig?.dimensions ?? 0,
      indexSize: info.indexMemUsageMb
        ? info.indexMemUsageMb * 1024 * 1024
        : undefined,
    };
  }

  async close(): Promise<void> {
    if (this.client) {
      await this.client.quit();
      this.client = null;
    }
    logger.debug("[RedisVectorStore] Closed connection");
  }
}
```

---

## 9. Embedding Provider Integration

### Embedder Factory

```typescript
// src/lib/memory/embedders/embedderFactory.ts

import type { Embedder, EmbedderConfig } from "../types/memory.js";
import { logger } from "../utils/logger.js";

/**
 * Create an embedder instance based on configuration
 */
export async function createEmbedder(
  config: EmbedderConfig,
): Promise<Embedder> {
  logger.debug("[EmbedderFactory] Creating embedder", {
    provider: config.provider,
    model: config.model,
  });

  switch (config.provider) {
    case "openai":
      const { OpenAIEmbedder } = await import("./openaiEmbedder.js");
      return new OpenAIEmbedder(config);

    case "vertex":
      const { VertexEmbedder } = await import("./vertexEmbedder.js");
      return new VertexEmbedder(config);

    case "ollama":
      const { OllamaEmbedder } = await import("./ollamaEmbedder.js");
      return new OllamaEmbedder(config);

    case "mistral":
      const { MistralEmbedder } = await import("./mistralEmbedder.js");
      return new MistralEmbedder(config);

    case "cohere":
      const { CohereEmbedder } = await import("./cohereEmbedder.js");
      return new CohereEmbedder(config);

    case "bedrock":
      const { BedrockEmbedder } = await import("./bedrockEmbedder.js");
      return new BedrockEmbedder(config);

    default:
      throw new Error(`Unsupported embedding provider: ${config.provider}`);
  }
}
```

### OpenAI Embedder Implementation

```typescript
// src/lib/memory/embedders/openaiEmbedder.ts

import type {
  Embedder,
  EmbedderConfig,
  EmbedderModelInfo,
} from "../types/memory.js";
import { logger } from "../utils/logger.js";

/**
 * OpenAI embedding model specifications
 */
const OPENAI_EMBEDDING_MODELS: Record<
  string,
  { dimensions: number; maxTokens: number }
> = {
  "text-embedding-3-small": { dimensions: 1536, maxTokens: 8191 },
  "text-embedding-3-large": { dimensions: 3072, maxTokens: 8191 },
  "text-embedding-ada-002": { dimensions: 1536, maxTokens: 8191 },
};

/**
 * OpenAI embedder using the OpenAI API
 */
export class OpenAIEmbedder implements Embedder {
  private config: EmbedderConfig;
  private apiKey: string;
  private baseUrl: string;
  private modelInfo: EmbedderModelInfo;

  constructor(config: EmbedderConfig) {
    this.config = config;
    this.apiKey = config.config?.apiKey ?? process.env.OPENAI_API_KEY ?? "";
    this.baseUrl = config.config?.baseUrl ?? "https://api.openai.com/v1";

    const modelSpec = OPENAI_EMBEDDING_MODELS[config.model] ?? {
      dimensions: config.config?.dimensions ?? 1536,
      maxTokens: 8191,
    };

    this.modelInfo = {
      provider: "openai",
      model: config.model,
      dimensions: modelSpec.dimensions,
      maxTokens: modelSpec.maxTokens,
    };
  }

  async initialize(): Promise<void> {
    if (!this.apiKey) {
      throw new Error("OpenAI API key not configured");
    }
    logger.debug("[OpenAIEmbedder] Initialized", {
      model: this.config.model,
      dimensions: this.modelInfo.dimensions,
    });
  }

  getDimensions(): number {
    return this.modelInfo.dimensions;
  }

  async embed(text: string): Promise<number[]> {
    const response = await fetch(`${this.baseUrl}/embeddings`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: this.config.model,
        input: text,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`OpenAI embedding failed: ${error}`);
    }

    const result = await response.json();
    return result.data[0].embedding;
  }

  async embedBatch(texts: string[]): Promise<number[][]> {
    const batchSize = this.config.batchSize ?? 100;
    const results: number[][] = [];

    for (let i = 0; i < texts.length; i += batchSize) {
      const batch = texts.slice(i, i + batchSize);

      const response = await fetch(`${this.baseUrl}/embeddings`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: this.config.model,
          input: batch,
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`OpenAI batch embedding failed: ${error}`);
      }

      const result = await response.json();
      const embeddings = result.data
        .sort((a: { index: number }, b: { index: number }) => a.index - b.index)
        .map((d: { embedding: number[] }) => d.embedding);

      results.push(...embeddings);
    }

    return results;
  }

  getModelInfo(): EmbedderModelInfo {
    return this.modelInfo;
  }
}
```

### Google Vertex Embedder Implementation

```typescript
// src/lib/memory/embedders/vertexEmbedder.ts

import type {
  Embedder,
  EmbedderConfig,
  EmbedderModelInfo,
} from "../types/memory.js";
import { logger } from "../utils/logger.js";

/**
 * Vertex AI embedding model specifications
 */
const VERTEX_EMBEDDING_MODELS: Record<
  string,
  { dimensions: number; maxTokens: number }
> = {
  "text-embedding-004": { dimensions: 768, maxTokens: 3072 },
  "textembedding-gecko@003": { dimensions: 768, maxTokens: 3072 },
  "text-embedding-005": { dimensions: 768, maxTokens: 3072 },
  "text-multilingual-embedding-002": { dimensions: 768, maxTokens: 2048 },
};

/**
 * Google Vertex AI embedder
 */
export class VertexEmbedder implements Embedder {
  private config: EmbedderConfig;
  private projectId: string;
  private region: string;
  private modelInfo: EmbedderModelInfo;
  private accessToken: string | null = null;

  constructor(config: EmbedderConfig) {
    this.config = config;
    this.projectId =
      config.config?.projectId ?? process.env.GOOGLE_CLOUD_PROJECT ?? "";
    this.region =
      config.config?.region ?? process.env.GOOGLE_CLOUD_REGION ?? "us-central1";

    const modelSpec = VERTEX_EMBEDDING_MODELS[config.model] ?? {
      dimensions: config.config?.dimensions ?? 768,
      maxTokens: 3072,
    };

    this.modelInfo = {
      provider: "vertex",
      model: config.model,
      dimensions: modelSpec.dimensions,
      maxTokens: modelSpec.maxTokens,
    };
  }

  async initialize(): Promise<void> {
    if (!this.projectId) {
      throw new Error("Google Cloud project ID not configured");
    }

    // Get access token using ADC or service account
    await this.refreshAccessToken();

    logger.debug("[VertexEmbedder] Initialized", {
      model: this.config.model,
      dimensions: this.modelInfo.dimensions,
      projectId: this.projectId,
      region: this.region,
    });
  }

  private async refreshAccessToken(): Promise<void> {
    // Use Google Auth library in production
    // For simplicity, assuming GOOGLE_APPLICATION_CREDENTIALS is set
    const { GoogleAuth } = await import("google-auth-library");
    const auth = new GoogleAuth({
      scopes: ["https://www.googleapis.com/auth/cloud-platform"],
    });
    const client = await auth.getClient();
    const token = await client.getAccessToken();
    this.accessToken = token.token ?? null;
  }

  getDimensions(): number {
    return this.modelInfo.dimensions;
  }

  async embed(text: string): Promise<number[]> {
    const endpoint = `https://${this.region}-aiplatform.googleapis.com/v1/projects/${this.projectId}/locations/${this.region}/publishers/google/models/${this.config.model}:predict`;

    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.accessToken}`,
      },
      body: JSON.stringify({
        instances: [{ content: text }],
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Vertex embedding failed: ${error}`);
    }

    const result = await response.json();
    return result.predictions[0].embeddings.values;
  }

  async embedBatch(texts: string[]): Promise<number[][]> {
    const batchSize = this.config.batchSize ?? 100;
    const results: number[][] = [];

    for (let i = 0; i < texts.length; i += batchSize) {
      const batch = texts.slice(i, i + batchSize);

      const endpoint = `https://${this.region}-aiplatform.googleapis.com/v1/projects/${this.projectId}/locations/${this.region}/publishers/google/models/${this.config.model}:predict`;

      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.accessToken}`,
        },
        body: JSON.stringify({
          instances: batch.map((text) => ({ content: text })),
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Vertex batch embedding failed: ${error}`);
      }

      const result = await response.json();
      const embeddings = result.predictions.map(
        (p: { embeddings: { values: number[] } }) => p.embeddings.values,
      );

      results.push(...embeddings);
    }

    return results;
  }

  getModelInfo(): EmbedderModelInfo {
    return this.modelInfo;
  }
}
```

---

## 10. Storage Integration

### Working Memory Storage Implementations

```typescript
// src/lib/memory/storage/workingMemoryStorage.ts

import type { RedisStorageConfig } from "../types/conversation.js";
import { createRedisClient, getNormalizedConfig } from "../utils/redis.js";
import { logger } from "../utils/logger.js";

/**
 * Working Memory Storage Interface
 */
export type WorkingMemoryStorage = {
  get(
    resourceId: string,
    threadId?: string,
  ): Promise<string | Record<string, unknown> | null>;
  set(
    resourceId: string,
    threadId: string | undefined,
    data: string | Record<string, unknown>,
  ): Promise<void>;
  delete(resourceId: string, threadId?: string): Promise<void>;
  close(): Promise<void>;
};

/**
 * In-memory working memory storage
 */
export class InMemoryWorkingMemoryStorage implements WorkingMemoryStorage {
  private data: Map<string, string | Record<string, unknown>> = new Map();

  private getKey(resourceId: string, threadId?: string): string {
    return threadId ? `${resourceId}:${threadId}` : resourceId;
  }

  async get(
    resourceId: string,
    threadId?: string,
  ): Promise<string | Record<string, unknown> | null> {
    const key = this.getKey(resourceId, threadId);
    return this.data.get(key) ?? null;
  }

  async set(
    resourceId: string,
    threadId: string | undefined,
    data: string | Record<string, unknown>,
  ): Promise<void> {
    const key = this.getKey(resourceId, threadId);
    this.data.set(key, data);
  }

  async delete(resourceId: string, threadId?: string): Promise<void> {
    const key = this.getKey(resourceId, threadId);
    this.data.delete(key);
  }

  async close(): Promise<void> {
    this.data.clear();
  }
}

/**
 * Redis-based working memory storage
 */
export class RedisWorkingMemoryStorage implements WorkingMemoryStorage {
  private client: Awaited<ReturnType<typeof createRedisClient>> | null = null;
  private config: Required<RedisStorageConfig>;
  private keyPrefix: string;

  constructor(
    redisConfig: RedisStorageConfig,
    keyPrefix: string = "neurolink:working_memory:",
  ) {
    this.config = getNormalizedConfig(redisConfig);
    this.keyPrefix = keyPrefix;
  }

  async initialize(): Promise<void> {
    if (!this.client) {
      this.client = await createRedisClient(this.config);
    }
  }

  private getKey(resourceId: string, threadId?: string): string {
    return threadId
      ? `${this.keyPrefix}${resourceId}:${threadId}`
      : `${this.keyPrefix}${resourceId}`;
  }

  async get(
    resourceId: string,
    threadId?: string,
  ): Promise<string | Record<string, unknown> | null> {
    await this.initialize();
    if (!this.client) return null;

    const key = this.getKey(resourceId, threadId);
    const data = await this.client.get(key);

    if (!data) return null;

    try {
      return JSON.parse(data);
    } catch {
      return data;
    }
  }

  async set(
    resourceId: string,
    threadId: string | undefined,
    data: string | Record<string, unknown>,
  ): Promise<void> {
    await this.initialize();
    if (!this.client) return;

    const key = this.getKey(resourceId, threadId);
    const serialized = typeof data === "string" ? data : JSON.stringify(data);

    await this.client.set(key, serialized);

    if (this.config.ttl > 0) {
      await this.client.expire(key, this.config.ttl);
    }
  }

  async delete(resourceId: string, threadId?: string): Promise<void> {
    await this.initialize();
    if (!this.client) return;

    const key = this.getKey(resourceId, threadId);
    await this.client.del(key);
  }

  async close(): Promise<void> {
    if (this.client) {
      await this.client.quit();
      this.client = null;
    }
  }
}
```

---

## 11. Memory Manager Unified API

### Three-Layer Memory Manager

```typescript
// src/lib/memory/threeLayerMemoryManager.ts

import type {
  ThreeLayerMemoryConfig,
  MemoryContext,
  RetrievedMemoryContext,
  ChatMessage,
  MemoryThread,
  SemanticMatch,
} from "./types/memory.js";
import { ConversationHistoryLayer } from "./layers/conversationHistoryLayer.js";
import { SemanticRecallLayer } from "./layers/semanticRecallLayer.js";
import { WorkingMemoryLayer } from "./layers/workingMemoryLayer.js";
import { createVectorStore } from "./vectorStores/vectorStoreFactory.js";
import { createEmbedder } from "./embedders/embedderFactory.js";
import {
  createConversationMemoryManager,
  getStorageType,
  getRedisConfigFromEnv,
} from "../core/conversationMemoryFactory.js";
import {
  InMemoryWorkingMemoryStorage,
  RedisWorkingMemoryStorage,
} from "./storage/workingMemoryStorage.js";
import { TokenUtils } from "../constants/tokens.js";
import { logger } from "../utils/logger.js";

/**
 * Three-Layer Memory Manager
 *
 * Unified interface for NeuroLink's enhanced memory system combining:
 * 1. Conversation History - Recent messages with summarization
 * 2. Semantic Recall - Vector-based similarity search
 * 3. Working Memory - Persistent structured knowledge
 */
export class ThreeLayerMemoryManager {
  private config: ThreeLayerMemoryConfig;
  private conversationHistory?: ConversationHistoryLayer;
  private semanticRecall?: SemanticRecallLayer;
  private workingMemory?: WorkingMemoryLayer;
  private isInitialized: boolean = false;

  constructor(config: ThreeLayerMemoryConfig) {
    this.config = config;
  }

  /**
   * Initialize all memory layers
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    const startTime = Date.now();
    logger.info("[ThreeLayerMemoryManager] Initializing memory layers...");

    // Initialize Conversation History Layer
    if (this.config.conversationHistory?.enabled !== false) {
      const storageType = getStorageType();
      const redisConfig =
        storageType === "redis" ? getRedisConfigFromEnv() : undefined;

      const baseManager = createConversationMemoryManager(
        {
          enabled: true,
          maxSessions: 100,
          enableSummarization:
            this.config.conversationHistory?.enableSummarization ?? true,
          tokenThreshold: this.config.conversationHistory?.tokenThreshold,
          summarizationProvider:
            this.config.conversationHistory?.summarizationProvider,
          summarizationModel:
            this.config.conversationHistory?.summarizationModel,
        },
        storageType,
        redisConfig,
      );

      await baseManager.initialize();

      this.conversationHistory = new ConversationHistoryLayer(
        baseManager,
        this.config.conversationHistory ?? { enabled: true },
      );

      logger.debug(
        "[ThreeLayerMemoryManager] Conversation history layer initialized",
      );
    }

    // Initialize Semantic Recall Layer
    if (this.config.semanticRecall?.enabled) {
      const vectorStore = await createVectorStore(
        this.config.semanticRecall.vectorStore,
      );
      const embedder = await createEmbedder(
        this.config.semanticRecall.embedder,
      );

      this.semanticRecall = new SemanticRecallLayer(
        vectorStore,
        embedder,
        this.config.semanticRecall,
      );

      await this.semanticRecall.initialize();

      logger.debug(
        "[ThreeLayerMemoryManager] Semantic recall layer initialized",
      );
    }

    // Initialize Working Memory Layer
    if (this.config.workingMemory?.enabled) {
      const storageType = getStorageType();
      const storage =
        storageType === "redis"
          ? new RedisWorkingMemoryStorage(getRedisConfigFromEnv())
          : new InMemoryWorkingMemoryStorage();

      this.workingMemory = new WorkingMemoryLayer(
        storage,
        this.config.workingMemory,
      );

      logger.debug(
        "[ThreeLayerMemoryManager] Working memory layer initialized",
      );
    }

    this.isInitialized = true;
    logger.info("[ThreeLayerMemoryManager] All layers initialized", {
      durationMs: Date.now() - startTime,
      layers: {
        conversationHistory: !!this.conversationHistory,
        semanticRecall: !!this.semanticRecall,
        workingMemory: !!this.workingMemory,
      },
    });
  }

  /**
   * Retrieve memory context for AI generation
   */
  async retrieve(
    query: string,
    context: MemoryContext,
    maxTokens?: number,
  ): Promise<RetrievedMemoryContext> {
    await this.ensureInitialized();

    const startTime = Date.now();
    const layerTimings: RetrievedMemoryContext["debug"]["layerTimings"] = {};
    const messages: ChatMessage[] = [];

    // 1. Retrieve conversation history
    let conversationMessages: ChatMessage[] = [];
    if (this.conversationHistory) {
      const historyStart = Date.now();
      conversationMessages = await this.conversationHistory.retrieve(context);
      layerTimings.conversationHistory = Date.now() - historyStart;
    }

    // 2. Retrieve working memory
    let workingMemoryContent: string | Record<string, unknown> | null = null;
    if (this.workingMemory) {
      const wmStart = Date.now();
      workingMemoryContent = await this.workingMemory.retrieve(context);
      layerTimings.workingMemory = Date.now() - wmStart;
    }

    // 3. Retrieve semantic matches
    let semanticMatches: SemanticMatch[] = [];
    if (this.semanticRecall) {
      const semanticStart = Date.now();
      semanticMatches = await this.semanticRecall.retrieve(
        query,
        context,
        conversationMessages,
      );
      layerTimings.semanticRecall = Date.now() - semanticStart;
    }

    // 4. Assemble context with token awareness
    const assembledContext = this.assembleContext(
      conversationMessages,
      semanticMatches,
      workingMemoryContent,
      maxTokens,
    );

    const result: RetrievedMemoryContext = {
      messages: assembledContext.messages,
      workingMemory: workingMemoryContent ?? undefined,
      semanticMatches: semanticMatches.length > 0 ? semanticMatches : undefined,
      tokenCount: assembledContext.tokenCount,
      debug: {
        layerTimings,
        layerCounts: {
          conversationHistory: conversationMessages.length,
          semanticRecall: semanticMatches.length,
        },
        processors: assembledContext.processorsApplied,
      },
    };

    logger.debug("[ThreeLayerMemoryManager] Retrieved memory context", {
      threadId: context.threadId,
      totalMessages: result.messages.length,
      tokenCount: result.tokenCount,
      durationMs: Date.now() - startTime,
    });

    return result;
  }

  /**
   * Store a conversation turn and index for semantic search
   */
  async store(
    context: MemoryContext,
    userMessage: string,
    aiResponse: string,
    options?: {
      events?: Array<{
        type: string;
        seq: number;
        timestamp: number;
        [key: string]: unknown;
      }>;
      providerDetails?: { provider: string; model: string };
    },
  ): Promise<void> {
    await this.ensureInitialized();

    // Store in conversation history
    if (this.conversationHistory) {
      await this.conversationHistory.store(
        context,
        userMessage,
        aiResponse,
        options,
      );
    }

    // Index messages for semantic recall
    if (this.semanticRecall) {
      const messages: ChatMessage[] = [
        {
          id: `user-${Date.now()}`,
          role: "user",
          content: userMessage,
          timestamp: new Date().toISOString(),
        },
        {
          id: `assistant-${Date.now()}`,
          role: "assistant",
          content: aiResponse,
          timestamp: new Date().toISOString(),
        },
      ];

      await this.semanticRecall.indexMessages(
        messages,
        context.threadId,
        context.resourceId,
      );
    }
  }

  /**
   * Update working memory
   */
  async updateWorkingMemory(
    context: MemoryContext,
    data: string | Record<string, unknown>,
    reason?: string,
  ): Promise<void> {
    if (!this.workingMemory) {
      throw new Error("Working memory is not enabled");
    }

    await this.workingMemory.update(context, data, reason);
  }

  /**
   * Get or create a thread
   */
  async getOrCreateThread(
    threadId: string,
    resourceId?: string,
  ): Promise<MemoryThread> {
    await this.ensureInitialized();

    if (this.conversationHistory) {
      return this.conversationHistory.getOrCreateThread(threadId, resourceId);
    }

    return {
      id: threadId,
      resourceId,
      title: "New Conversation",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }

  /**
   * List threads for a resource
   */
  async listThreads(resourceId: string): Promise<MemoryThread[]> {
    await this.ensureInitialized();

    if (this.conversationHistory) {
      return this.conversationHistory.listThreads(resourceId);
    }

    return [];
  }

  /**
   * Clear all memory for a thread
   */
  async clearThread(threadId: string, resourceId?: string): Promise<void> {
    await this.ensureInitialized();

    if (this.conversationHistory) {
      await this.conversationHistory.clearThread(threadId, resourceId);
    }

    if (this.semanticRecall) {
      await this.semanticRecall.deleteThread(threadId);
    }

    if (this.workingMemory && this.config.workingMemory?.scope === "thread") {
      await this.workingMemory.clear({ threadId, resourceId });
    }
  }

  /**
   * Get the working memory layer for tool creation
   */
  getWorkingMemoryLayer(): WorkingMemoryLayer | undefined {
    return this.workingMemory;
  }

  /**
   * Get statistics about the memory system
   */
  async getStats(): Promise<{
    conversationHistory?: { totalSessions: number; totalTurns: number };
    semanticRecall?: { vectorCount: number };
  }> {
    const stats: Awaited<ReturnType<typeof this.getStats>> = {};

    // Note: Would need to expose getStats on conversation history layer
    if (this.semanticRecall) {
      stats.semanticRecall = await this.semanticRecall.getStats();
    }

    return stats;
  }

  /**
   * Close all connections
   */
  async close(): Promise<void> {
    // Close semantic recall (vector store + embedder)
    // Close working memory storage
    // Close conversation memory manager

    logger.info("[ThreeLayerMemoryManager] Closed all connections");
  }

  private async ensureInitialized(): Promise<void> {
    if (!this.isInitialized) {
      await this.initialize();
    }
  }

  /**
   * Assemble final context from all layers with token awareness
   */
  private assembleContext(
    conversationMessages: ChatMessage[],
    semanticMatches: SemanticMatch[],
    workingMemory: string | Record<string, unknown> | null,
    maxTokens?: number,
  ): {
    messages: ChatMessage[];
    tokenCount: number;
    processorsApplied: string[];
  } {
    const processorsApplied: string[] = [];
    const targetTokens = maxTokens ?? 50000;

    // Start with conversation history
    let messages = [...conversationMessages];
    let currentTokens = this.estimateTokens(messages);

    // Add working memory as system message if it fits
    if (workingMemory) {
      const wmContent =
        this.workingMemory?.formatForPrompt(workingMemory) ?? "";
      const wmTokens = TokenUtils.estimateTokenCount(wmContent);

      if (currentTokens + wmTokens < targetTokens) {
        messages.unshift({
          id: "working-memory",
          role: "system",
          content: wmContent,
          timestamp: new Date().toISOString(),
          metadata: { source: "working-memory" },
        });
        currentTokens += wmTokens;
        processorsApplied.push("working-memory-injection");
      }
    }

    // Add semantic matches that don't duplicate recent messages
    if (semanticMatches.length > 0) {
      const recentIds = new Set(messages.map((m) => m.id));
      const uniqueMatches = semanticMatches.filter(
        (match) => !recentIds.has(match.message.id),
      );

      for (const match of uniqueMatches) {
        const matchTokens = TokenUtils.estimateTokenCount(
          match.message.content,
        );

        if (currentTokens + matchTokens < targetTokens) {
          // Add as system context
          messages.unshift({
            id: `semantic-${match.message.id}`,
            role: "system",
            content: `[Relevant context from previous conversation (similarity: ${match.score.toFixed(2)})]:\n${match.message.content}`,
            timestamp: match.message.timestamp,
            metadata: { source: "semantic-recall", score: match.score },
          });
          currentTokens += matchTokens;
        }
      }

      if (uniqueMatches.length > 0) {
        processorsApplied.push("semantic-injection");
      }
    }

    // Apply token limit if exceeded
    if (currentTokens > targetTokens) {
      messages = this.trimToTokenLimit(messages, targetTokens);
      currentTokens = this.estimateTokens(messages);
      processorsApplied.push("token-limit-trim");
    }

    return {
      messages,
      tokenCount: currentTokens,
      processorsApplied,
    };
  }

  private estimateTokens(messages: ChatMessage[]): number {
    return messages.reduce(
      (total, msg) => total + TokenUtils.estimateTokenCount(msg.content),
      0,
    );
  }

  private trimToTokenLimit(
    messages: ChatMessage[],
    maxTokens: number,
  ): ChatMessage[] {
    // Preserve system messages and recent messages, trim from middle
    const systemMessages = messages.filter((m) => m.role === "system");
    const nonSystemMessages = messages.filter((m) => m.role !== "system");

    let currentTokens = this.estimateTokens(systemMessages);
    const result = [...systemMessages];

    // Add messages from most recent backwards
    for (let i = nonSystemMessages.length - 1; i >= 0; i--) {
      const msg = nonSystemMessages[i];
      const msgTokens = TokenUtils.estimateTokenCount(msg.content);

      if (currentTokens + msgTokens <= maxTokens) {
        result.push(msg);
        currentTokens += msgTokens;
      } else {
        break;
      }
    }

    // Restore chronological order
    return result.sort((a, b) => {
      const timeA = a.timestamp ? new Date(a.timestamp).getTime() : 0;
      const timeB = b.timestamp ? new Date(b.timestamp).getTime() : 0;
      return timeA - timeB;
    });
  }
}
```

---

## 12. Code Examples

### Basic Usage

```typescript
import { NeuroLink } from "@juspay/neurolink";
import { ThreeLayerMemoryManager } from "@juspay/neurolink/memory";

// Create NeuroLink with three-layer memory
const neurolink = new NeuroLink({
  memory: {
    enabled: true,
    storage: { type: "redis" },

    // Layer 1: Conversation History
    conversationHistory: {
      enabled: true,
      lastMessages: 20,
      enableSummarization: true,
    },

    // Layer 2: Semantic Recall
    semanticRecall: {
      enabled: true,
      vectorStore: {
        provider: "redis",
        config: { indexName: "my_vectors" },
      },
      embedder: {
        provider: "openai",
        model: "text-embedding-3-small",
      },
      topK: 3,
      messageRange: { before: 2, after: 2 },
      scope: "resource", // Cross-thread search
    },

    // Layer 3: Working Memory
    workingMemory: {
      enabled: true,
      scope: "resource",
      template: `# User Profile
- Name: [Unknown]
- Preferences: [None]
- Goals: [None]`,
    },
  },
});

// Generate with memory context
const result = await neurolink.generate({
  input: {
    text: "Remember my name is Alice and I prefer formal communication",
  },
  provider: "vertex",
  model: "gemini-2.5-flash",
  context: {
    threadId: "conversation-123",
    resourceId: "user-alice-456",
  },
});

console.log(result.content);
```

### Working Memory with Zod Schema

```typescript
import { z } from "zod";
import { NeuroLink } from "@juspay/neurolink";

const userProfileSchema = z.object({
  name: z.string().optional(),
  email: z.string().email().optional(),
  preferences: z
    .object({
      communicationStyle: z.enum(["formal", "casual", "technical"]).optional(),
      language: z.string().optional(),
      timezone: z.string().optional(),
    })
    .optional(),
  goals: z.array(z.string()).optional(),
  recentTopics: z.array(z.string()).optional(),
});

const neurolink = new NeuroLink({
  memory: {
    enabled: true,
    storage: { type: "memory" },
    workingMemory: {
      enabled: true,
      scope: "resource",
      schema: userProfileSchema, // Type-safe structured memory
    },
  },
});

// Agent can update specific fields without replacing entire memory
// Schema mode uses merge semantics
```

### Semantic Search Across Threads

```typescript
const neurolink = new NeuroLink({
  memory: {
    enabled: true,
    storage: { type: "redis" },
    semanticRecall: {
      enabled: true,
      vectorStore: {
        provider: "qdrant",
        config: {
          url: "http://localhost:6333",
          collectionName: "user_memories",
        },
      },
      embedder: {
        provider: "vertex",
        model: "text-embedding-004",
      },
      scope: "resource", // Search across all user's threads
      topK: 5,
      similarityThreshold: 0.75,
    },
  },
});

// Query: "What did we discuss about the project deadline?"
// Semantic recall will find relevant messages from ANY thread
// belonging to the same resourceId (user)
```

### Streaming with Memory

```typescript
const stream = await neurolink.stream({
  input: { text: "Continue our discussion about the API design" },
  provider: "anthropic",
  model: "claude-sonnet-4-5",
  context: {
    threadId: "design-review-thread",
    resourceId: "team-alpha",
  },
});

for await (const chunk of stream) {
  if (chunk.type === "text") {
    process.stdout.write(chunk.content);
  }
}

// Memory automatically stores the conversation turn
// and indexes it for semantic recall
```

---

## 13. Implementation Plan

### Phase 1: Foundation (Week 1-2)

**Goals:**

- Define type system
- Create abstract interfaces
- Implement in-memory vector store

**Tasks:**

1. Create `src/lib/types/memory.ts` with all type definitions
2. Create `src/lib/types/vectorStore.ts` with vector store interfaces
3. Create `src/lib/types/embedder.ts` with embedder interfaces
4. Implement `InMemoryVectorStore`
5. Write unit tests for in-memory vector store

**Deliverables:**

- [ ] Type definitions
- [ ] In-memory vector store implementation
- [ ] Unit tests

### Phase 2: Embedding Layer (Week 2-3)

**Goals:**

- Implement embedding abstraction
- Support OpenAI and Vertex embeddings

**Tasks:**

1. Create embedder factory
2. Implement OpenAI embedder
3. Implement Vertex embedder
4. Add batch embedding support
5. Write unit tests

**Deliverables:**

- [ ] Embedder factory
- [ ] OpenAI embedder
- [ ] Vertex embedder
- [ ] Unit tests

### Phase 3: Semantic Recall Layer (Week 3-4)

**Goals:**

- Implement semantic recall layer
- Integrate with conversation history

**Tasks:**

1. Implement `SemanticRecallLayer` class
2. Add message indexing functionality
3. Add similarity search with filtering
4. Add context window retrieval
5. Write integration tests

**Deliverables:**

- [ ] Semantic recall layer
- [ ] Message indexing
- [ ] Similarity search
- [ ] Integration tests

### Phase 4: Working Memory Layer (Week 4-5)

**Goals:**

- Implement working memory layer
- Support template and schema modes

**Tasks:**

1. Implement `WorkingMemoryLayer` class
2. Add template-based (Markdown) support
3. Add schema-based (Zod) support
4. Implement storage backends
5. Create `updateWorkingMemory` tool
6. Write unit tests

**Deliverables:**

- [ ] Working memory layer
- [ ] Template mode
- [ ] Schema mode
- [ ] Update tool
- [ ] Unit tests

### Phase 5: Unified Memory Manager (Week 5-6)

**Goals:**

- Create unified memory manager
- Integrate all three layers

**Tasks:**

1. Implement `ThreeLayerMemoryManager`
2. Add context assembly logic
3. Add token-aware trimming
4. Integrate with `NeuroLink.generate()`
5. Write integration tests

**Deliverables:**

- [ ] Three-layer memory manager
- [ ] Context assembly
- [ ] NeuroLink integration
- [ ] Integration tests

### Phase 6: Vector Store Implementations (Week 6-8)

**Goals:**

- Add production vector store implementations

**Tasks:**

1. Implement Redis vector store
2. Implement Qdrant vector store
3. Implement PGVector store
4. Implement Pinecone vector store
5. Write integration tests

**Deliverables:**

- [ ] Redis vector store
- [ ] Qdrant vector store
- [ ] PGVector store
- [ ] Pinecone vector store
- [ ] Integration tests

### Phase 7: Documentation and Polish (Week 8-9)

**Goals:**

- Complete documentation
- Performance optimization

**Tasks:**

1. Write SDK documentation
2. Create usage examples
3. Add observability/tracing
4. Performance benchmarks
5. Memory leak testing

**Deliverables:**

- [ ] SDK documentation
- [ ] Usage examples
- [ ] Performance benchmarks
- [ ] Production readiness checklist

---

## 14. Migration Strategy

### Backward Compatibility

The three-layer memory system is designed to be fully backward compatible with existing NeuroLink conversation memory:

1. **Default Behavior**: If no `memory` config is provided, existing `conversationMemory` config continues to work unchanged.

2. **Gradual Adoption**: Users can enable individual layers:

   ```typescript
   // Enable only semantic recall, keep existing conversation memory
   memory: {
     semanticRecall: { enabled: true, ... },
   }
   ```

3. **Migration Path**:

   ```typescript
   // Old config
   conversationMemory: {
     enabled: true,
     maxTurnsPerSession: 20,
     enableSummarization: true,
   }

   // New config (equivalent)
   memory: {
     enabled: true,
     conversationHistory: {
       enabled: true,
       lastMessages: 20,
       enableSummarization: true,
     },
   }
   ```

### Data Migration

For existing Redis data:

1. Conversation history data format is unchanged
2. Add migration script to index existing messages for semantic recall
3. Working memory is new, no migration needed

```typescript
// Example migration script
async function migrateToSemanticRecall(
  memory: ThreeLayerMemoryManager,
  resourceId: string,
): Promise<void> {
  const threads = await memory.listThreads(resourceId);

  for (const thread of threads) {
    const messages = await memory.conversationHistory?.retrieve({
      threadId: thread.id,
      resourceId,
    });

    if (messages && memory.semanticRecall) {
      await memory.semanticRecall.indexMessages(
        messages,
        thread.id,
        resourceId,
      );
    }
  }
}
```

---

## Summary

This implementation guide provides a comprehensive roadmap for adding Mastra-style three-layer memory to NeuroLink:

1. **Conversation History Layer** - Enhanced version of existing conversation memory with better thread/resource scoping
2. **Semantic Recall Layer** - New vector-based similarity search for long-term context retrieval
3. **Working Memory Layer** - New structured knowledge storage for persistent user profiles and preferences

The architecture follows NeuroLink's existing patterns:

- Factory pattern for creating storage backends and embedders
- Dynamic imports for optional dependencies
- TypeScript-first with comprehensive type definitions
- Support for both in-memory and Redis storage
- Token-aware context assembly

The implementation plan spans approximately 9 weeks and maintains full backward compatibility with existing NeuroLink applications.

---

## References

- [Mastra Memory Overview](https://mastra.ai/docs/memory/overview)
- [Mastra Semantic Recall](https://mastra.ai/en/docs/memory/semantic-recall)
- [Mastra Working Memory](https://mastra.ai/docs/memory/working-memory)
- [Mastra Memory Class Reference](https://mastra.ai/reference/memory/memory-class)
- [NeuroLink CLAUDE.md](../CLAUDE.md)
- [NeuroLink Conversation Memory](./conversation-memory.md)
