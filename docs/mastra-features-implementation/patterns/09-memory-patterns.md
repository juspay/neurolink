# Memory Patterns in NeuroLink

This document provides a comprehensive analysis of NeuroLink's memory/conversation patterns, including architecture, storage abstractions, context management, and best practices for implementing new memory backends.

## Table of Contents

1. [Memory Architecture Overview](#memory-architecture-overview)
2. [Core Components](#core-components)
3. [Storage Abstraction Patterns](#storage-abstraction-patterns)
4. [Message Format and Types](#message-format-and-types)
5. [Context Management Patterns](#context-management-patterns)
6. [Summarization Patterns](#summarization-patterns)
7. [Memory Persistence Patterns](#memory-persistence-patterns)
8. [Memory Retrieval Patterns](#memory-retrieval-patterns)
9. [Context Window Management](#context-window-management)
10. [Best Practices for Memory Extensions](#best-practices-for-memory-extensions)
11. [Template for New Memory Backends](#template-for-new-memory-backends)

---

## Memory Architecture Overview

NeuroLink implements a sophisticated conversation memory system that provides:

- **Dual Storage Backends**: In-memory (development) and Redis (production)
- **Token-Based Context Management**: Automatic summarization based on token thresholds
- **Session Management**: Multi-user, multi-session support with automatic cleanup
- **External Memory Integration**: Optional mem0 cloud API integration for enhanced memory capabilities (**DEPRECATED**: Mem0 integration is being removed in a future release)

### Architecture Diagram

```
                         +-------------------+
                         |    NeuroLink      |
                         |   (Main SDK)      |
                         +--------+----------+
                                  |
                    +-------------+-------------+
                    |                           |
          +---------v---------+      +----------v---------+
          | ConversationMemory|      |   Mem0Initializer  |
          |    Initializer    |      |   (DEPRECATED)     |
          +--------+----------+      +--------------------+

NOTE: Mem0Initializer is DEPRECATED and will be removed in a future release.
                   |
        +----------+----------+
        |                     |
+-------v-------+    +--------v---------+
| In-Memory     |    | Redis            |
| Manager       |    | Manager          |
+---------------+    +------------------+
        |                     |
+-------v-------+    +--------v---------+
| Map<string,   |    | Redis Client     |
| SessionMemory>|    | (node-redis)     |
+---------------+    +------------------+
```

### Key Design Decisions

1. **Factory Pattern with Storage Type Detection**: Uses environment variables (`STORAGE_TYPE`) to determine which backend to instantiate
2. **Lazy Initialization**: Memory managers are initialized only when first needed
3. **Unified Interface**: Both backends implement the same public interface
4. **Non-Destructive Summarization**: Uses pointer-based summarization that preserves original messages

---

## Core Components

### 1. ConversationMemoryManager (In-Memory)

**Location**: `/src/lib/core/conversationMemoryManager.ts`

The in-memory implementation stores conversations in a `Map<string, SessionMemory>` structure:

```typescript
export class ConversationMemoryManager {
  private sessions: Map<string, SessionMemory> = new Map();
  public config: ConversationMemoryConfig;
  private isInitialized: boolean = false;
  private summarizationInProgress: Set<string> = new Set();

  // Core methods
  async initialize(): Promise<void>;
  async storeConversationTurn(
    options: StoreConversationTurnOptions,
  ): Promise<void>;
  async buildContextMessages(sessionId: string): Promise<ChatMessage[]>;
  async getStats(): Promise<ConversationMemoryStats>;
  async clearSession(sessionId: string): Promise<boolean>;
  async clearAllSessions(): Promise<void>;
}
```

**Key Features**:

- Zero-overhead direct message storage
- LRU-style session limit enforcement
- Concurrent summarization prevention with `Set<string>` tracking

### 2. RedisConversationMemoryManager

**Location**: `/src/lib/core/redisConversationMemoryManager.ts`

The Redis implementation provides persistent, distributed storage:

```typescript
export class RedisConversationMemoryManager {
  public config: ConversationMemoryConfig;
  private redisClient: Awaited<ReturnType<typeof createRedisClient>> | null;
  private pendingToolExecutions: Map<string, PendingToolExecution>;
  private titleGenerationInProgress: Set<string>;
  private summarizationInProgress: Set<string>;

  // Additional Redis-specific methods
  async getUserSessions(userId: string): Promise<string[]>;
  async getUserSessionMetadata(
    userId: string,
    sessionId: string,
  ): Promise<SessionMetadata | null>;
  async getUserSessionHistory(
    userId: string,
    sessionId: string,
  ): Promise<ChatMessage[] | null>;
  async getUserSessionObject(
    userId: string,
    sessionId: string,
  ): Promise<RedisConversationObject | null>;
  async generateConversationTitle(userMessage: string): Promise<string>;
}
```

**Key Features**:

- Automatic TTL-based expiration
- User-session mapping for multi-user support
- SCAN-based key retrieval (non-blocking)
- Automatic conversation title generation
- Tool execution data buffering to prevent race conditions

### 3. ConversationMemoryFactory

**Location**: `/src/lib/core/conversationMemoryFactory.ts`

Factory pattern implementation for creating appropriate memory managers:

```typescript
export function createConversationMemoryManager(
  config: ConversationMemoryConfig,
  storageType: StorageType = "memory",
  redisConfig?: RedisStorageConfig,
): ConversationMemoryManager | RedisConversationMemoryManager;

export function getStorageType(): StorageType;

export function getRedisConfigFromEnv(): RedisStorageConfig;
```

### 4. ConversationMemoryInitializer

**Location**: `/src/lib/core/conversationMemoryInitializer.ts`

High-level initialization function that orchestrates memory setup:

```typescript
export async function initializeConversationMemory(config?: {
  conversationMemory?: Partial<ConversationMemoryConfig>;
}): Promise<ConversationMemoryManager | RedisConversationMemoryManager | null>;
```

---

## Storage Abstraction Patterns

### Common Interface Pattern

Both storage backends share a common public interface:

```typescript
type ConversationMemoryInterface = {
  config: ConversationMemoryConfig;

  // Core operations
  initialize(): Promise<void>;
  storeConversationTurn(options: StoreConversationTurnOptions): Promise<void>;
  buildContextMessages(
    sessionId: string,
    userId?: string,
    enableSummarization?: boolean,
  ): Promise<ChatMessage[]>;

  // Session management
  getStats(): Promise<ConversationMemoryStats>;
  clearSession(sessionId: string, userId?: string): Promise<boolean>;
  clearAllSessions(): Promise<void>;

  // Utility
  createSummarySystemMessage(
    content: string,
    summarizesFrom?: string,
    summarizesTo?: string,
  ): ChatMessage;
};
```

### Storage Configuration

```typescript
// In-memory configuration
type ConversationMemoryConfig = {
  enabled: boolean;
  maxSessions?: number; // Default: 50
  enableSummarization?: boolean; // Default: true
  tokenThreshold?: number; // Default: 80% of model context
  summarizationProvider?: string; // Default: "vertex"
  summarizationModel?: string; // Default: "gemini-2.5-flash"
  mem0Enabled?: boolean; // @deprecated - Mem0 is being removed in a future release
  mem0Config?: Mem0Config; // @deprecated - Mem0 is being removed in a future release
  redisConfig?: RedisStorageConfig;
};

// Redis-specific configuration
type RedisStorageConfig = {
  host?: string; // Default: 'localhost'
  port?: number; // Default: 6379
  password?: string;
  db?: number; // Default: 0
  keyPrefix?: string; // Default: 'neurolink:conversation:'
  userSessionsKeyPrefix?: string; // Derived from keyPrefix
  ttl?: number; // Default: 86400 (24 hours)
  connectionOptions?: {
    connectTimeout?: number;
    lazyConnect?: boolean;
    retryDelayOnFailover?: number;
    maxRetriesPerRequest?: number;
  };
};
```

### Redis Key Strategy

```typescript
// Session key format
function getSessionKey(config, sessionId, userId?): string {
  return `${config.keyPrefix}${userId || "randomUser"}:${sessionId}`;
}

// User sessions mapping key
function getUserSessionsKey(config, userId): string {
  return `${config.userSessionsKeyPrefix}${userId}`;
}
```

---

## Message Format and Types

### ChatMessage Type

The core message type used throughout the memory system:

```typescript
type ChatMessage = {
  id: string; // Unique message identifier (UUID)
  role: "user" | "assistant" | "system" | "tool_call" | "tool_result";
  content: string;
  timestamp?: string; // ISO 8601 format
  tool?: string; // For tool_call/tool_result messages
  args?: Record<string, unknown>; // For tool_call messages
  result?: {
    // For tool_result messages
    success?: boolean;
    expression?: string;
    result?: unknown;
    type?: string;
    error?: string;
  };
  events?: StreamEventSequence[]; // Event sequence for history reconstruction
  metadata?: {
    isSummary?: boolean;
    summarizesFrom?: string;
    summarizesTo?: string;
    truncated?: boolean;
    source?: string;
    language?: string;
    confidence?: number;
    timestamp?: number; // Unix epoch milliseconds
    modelUsed?: string;
    thoughtSignature?: string;
    thoughtHash?: string;
    thinkingExpanded?: boolean;
  };
};
```

### SessionMemory Type

In-memory session representation:

```typescript
type SessionMemory = {
  sessionId: string;
  userId?: string;
  title?: string;
  messages: ChatMessage[];
  createdAt: number; // Unix epoch milliseconds
  lastActivity: number; // Unix epoch milliseconds
  summarizedUpToMessageId?: string; // Pointer to last summarized message
  summarizedMessage?: string; // Stored summary content
  tokenThreshold?: number; // Per-session override
  lastTokenCount?: number; // Cached token count
  lastCountedAt?: number; // When token count was calculated
  metadata?: {
    userRole?: string;
    tags?: string[];
    customData?: Record<string, unknown>;
  };
};
```

### RedisConversationObject Type

Redis-stored conversation format:

```typescript
type RedisConversationObject = {
  id: string; // Conversation UUID
  title: string;
  sessionId: string;
  userId: string;
  createdAt: string; // ISO 8601
  updatedAt: string; // ISO 8601
  messages: ChatMessage[];
  summarizedUpToMessageId?: string;
  summarizedMessage?: string;
  tokenThreshold?: number;
  lastTokenCount?: number;
  lastCountedAt?: number;
};
```

### Timestamp Conventions

NeuroLink uses two timestamp formats:

| Format                     | Use Case                               | Example                      |
| -------------------------- | -------------------------------------- | ---------------------------- |
| Unix Milliseconds (number) | Internal storage, performance-critical | `1735689600000`              |
| ISO 8601 String            | Human-readable, API responses          | `"2025-01-01T00:00:00.000Z"` |

**Conversion:**

```typescript
// Unix ms to ISO
new Date(unixMs).toISOString();

// ISO to Unix ms
new Date(isoString).getTime();

// Current time
Date.now(); // Unix ms
new Date().toISOString(); // ISO
```

---

## Context Management Patterns

### Context Building Flow

```
                    buildContextMessages()
                           |
                           v
              +------------+------------+
              |  Has summarizedUpTo?    |
              +------------+------------+
                    |            |
                   No           Yes
                    |            |
                    v            v
           Return all     Find pointer index
            messages             |
                                 v
                    +------------+------------+
                    |  Build context:        |
                    |  1. Summary message    |
                    |  2. Messages after ptr |
                    +------------------------+
```

### buildContextFromPointer Implementation

```typescript
export function buildContextFromPointer(session: SessionMemory): ChatMessage[] {
  // No summarization yet - return all messages
  if (!session.summarizedUpToMessageId || !session.summarizedMessage) {
    return session.messages;
  }

  // Find the pointer position
  const pointerIndex = session.messages.findIndex(
    (msg) => msg.id === session.summarizedUpToMessageId,
  );

  if (pointerIndex === -1) {
    // Pointer not found - return all messages (safety fallback)
    return session.messages;
  }

  // Get messages after the pointer
  const messagesAfterPointer = session.messages.slice(pointerIndex + 1);

  // Construct summary message
  const summaryMessage: ChatMessage = {
    id: `summary-${session.summarizedUpToMessageId}`,
    role: "system",
    content: `Previous conversation summary: ${session.summarizedMessage}`,
    timestamp: new Date().toISOString(),
    metadata: {
      isSummary: true,
      summarizesTo: session.summarizedUpToMessageId,
    },
  };

  return [summaryMessage, ...messagesAfterPointer];
}
```

### Context Instructions Injection

When conversation history exists, NeuroLink injects instructions to help the model understand the context:

```typescript
const CONVERSATION_INSTRUCTIONS = `

IMPORTANT: You are continuing an ongoing conversation. The previous messages in this conversation contain important context including:
- Names, personal information, and preferences shared by the user
- Projects, tasks, and topics discussed previously
- Any decisions, agreements, or conclusions reached

Always reference and build upon this conversation history when relevant. If the user asks about information mentioned earlier in the conversation, refer to those previous messages to provide accurate, contextual responses.`;
```

---

## Summarization Patterns

### Token-Based Summarization Flow

```
     storeConversationTurn()
              |
              v
    Add messages to session
              |
              v
    +--------------------+
    | enableSummarization|---No---> Done
    +--------------------+
              |
             Yes
              v
    +----------------------+
    | summarizationInProgress|---Yes---> Skip
    |     .has(sessionId)?  |
    +----------------------+
              |
              No
              v
        setImmediate()
              |
              v
     checkAndSummarize()
              |
              v
    Build context messages
              |
              v
    Estimate token count
              |
              v
    +----------------------+
    | tokenCount >= threshold|---No---> Done
    +----------------------+
              |
             Yes
              v
    summarizeSessionTokenBased()
```

### Summarization Algorithm

```typescript
private async summarizeSessionTokenBased(
  session: SessionMemory,
  threshold: number,
): Promise<void> {
  // Find starting point (after last summarized message)
  const startIndex = session.summarizedUpToMessageId
    ? session.messages.findIndex((m) => m.id === session.summarizedUpToMessageId) + 1
    : 0;

  const recentMessages = session.messages.slice(startIndex);
  if (recentMessages.length === 0) return;

  // Calculate how many tokens to keep as recent (30% of threshold)
  const targetRecentTokens = threshold * RECENT_MESSAGES_RATIO;

  // Find split point to keep recent messages within target
  const splitIndex = await this.findSplitIndexByTokens(recentMessages, targetRecentTokens);
  const messagesToSummarize = recentMessages.slice(0, splitIndex);

  if (messagesToSummarize.length === 0) return;

  // Generate summary with previous summary context
  const summary = await generateSummary(
    messagesToSummarize,
    this.config,
    "[ConversationMemory]",
    session.summarizedMessage,  // Previous summary for continuity
  );

  if (!summary) return;

  // Update pointer (non-destructive - original messages preserved)
  const lastSummarized = messagesToSummarize[messagesToSummarize.length - 1];
  session.summarizedUpToMessageId = lastSummarized.id;
  session.summarizedMessage = summary;
}
```

### Summarization Prompt Template

```typescript
export function createSummarizationPrompt(
  history: ChatMessage[],
  previousSummary?: string,
): string {
  const formattedHistory = history
    .map((msg) => `${msg.role}: ${msg.content}`)
    .join("\n\n");

  const previousSummarySection = previousSummary
    ? `Previous Summary:
---
${previousSummary}
---

`
    : "";

  return `
You are a context summarization AI. Your task is to condense the following conversation history for another AI assistant.
${previousSummary ? "Build upon the previous summary and incorporate the new conversation turns below." : ""}
The summary must be a concise, third-person narrative that retains all critical information, including key entities, technical details, decisions made, and any specific dates or times mentioned.
Ensure the summary flows logically and is ready to be used as context for the next turn in the conversation.

${previousSummarySection}Conversation History to Summarize:
---
${formattedHistory}
---
`.trim();
}
```

### Configuration Constants

```typescript
// src/lib/config/conversationMemory.ts

// Percentage of model context window for memory threshold
export const MEMORY_THRESHOLD_PERCENTAGE = 0.8;

// Fallback threshold if model context unknown
export const DEFAULT_FALLBACK_THRESHOLD = 50000;

// Ratio of threshold to keep as recent unsummarized messages
export const RECENT_MESSAGES_RATIO = 0.3;

// Number of messages per conversation turn (user + assistant)
export const MESSAGES_PER_TURN = 2;
```

---

## Memory Persistence Patterns

### Redis Serialization

```typescript
// Serialize conversation for Redis storage
export function serializeConversation(
  conversation: RedisConversationObject,
): string {
  return JSON.stringify(conversation);
}

// Deserialize with validation
export function deserializeConversation(
  data: string | null,
): RedisConversationObject | null {
  if (!data) return null;

  const parsedData = JSON.parse(data);

  // Validate required fields
  if (!parsedData.title || !parsedData.sessionId || !parsedData.messages) {
    return null;
  }

  // Validate messages array structure
  const isValidHistory = parsedData.messages.every(
    (m) => typeof m.role === "string" && typeof m.content === "string",
  );

  if (!isValidHistory) return null;

  return parsedData;
}
```

### TTL Management

```typescript
// Set TTL on session storage
if (this.redisConfig.ttl > 0) {
  await this.redisClient.expire(redisKey, this.redisConfig.ttl);
}

// Set TTL on user sessions mapping
await this.redisClient.expire(userSessionsKey, this.redisConfig.ttl);
```

### Non-Blocking Key Scanning

```typescript
export async function scanKeys(
  client: RedisClient,
  pattern: string,
  batchSize: number = 100,
): Promise<string[]> {
  const allKeys: string[] = [];
  let cursor = "0";

  do {
    const result = await client.scan(cursor, {
      MATCH: pattern,
      COUNT: batchSize,
    });

    cursor = result.cursor;
    allKeys.push(...result.keys);
  } while (cursor !== "0");

  return allKeys;
}
```

---

## Memory Retrieval Patterns

### Session History Retrieval

```typescript
// Get full session object
public async getUserSessionObject(
  userId: string,
  sessionId: string,
): Promise<RedisConversationObject | null> {
  const sessionKey = getSessionKey(this.redisConfig, sessionId, userId);
  const conversationData = await this.redisClient.get(sessionKey);
  return deserializeConversation(conversationData);
}

// Get just messages
public async getUserSessionHistory(
  userId: string,
  sessionId: string,
): Promise<ChatMessage[] | null> {
  const sessionObject = await this.getUserSessionObject(userId, sessionId);
  return sessionObject?.messages || null;
}

// Get lightweight metadata only
public async getUserSessionMetadata(
  userId: string,
  sessionId: string,
): Promise<SessionMetadata | null> {
  const conversation = await this.getUserSessionObject(userId, sessionId);
  if (!conversation) return null;

  return {
    id: conversation.sessionId,
    title: conversation.title,
    createdAt: conversation.createdAt,
    updatedAt: conversation.updatedAt,
  };
}
```

### User Sessions List

```typescript
public async getUserSessions(userId: string): Promise<string[]> {
  const userSessionsKey = getUserSessionsKey(this.redisConfig, userId);
  return await this.redisClient.sMembers(userSessionsKey);
}

public async getUserAllSessionsHistory(userId: string): Promise<SessionMetadata[]> {
  const sessionIds = await this.getUserSessions(userId);
  const results: SessionMetadata[] = [];

  for (const sessionId of sessionIds) {
    const metadata = await this.getUserSessionMetadata(userId, sessionId);
    if (metadata) {
      results.push(metadata);
    } else {
      // Clean up orphaned session references
      await this.removeUserSession(userId, sessionId);
    }
  }

  return results;
}
```

---

## Context Window Management

### Token Threshold Calculation

```typescript
// Priority: session override > env var > model-based (80%) > fallback
export function getEffectiveTokenThreshold(
  provider: string,
  model: string,
  envOverride?: number,
  sessionOverride?: number,
): number {
  // Priority 1: Session-level override
  if (sessionOverride && sessionOverride > 0) {
    return sessionOverride;
  }

  // Priority 2: Environment variable override
  if (envOverride && envOverride > 0) {
    return envOverride;
  }

  // Priority 3: Model-based calculation (80% of context window)
  try {
    return calculateTokenThreshold(provider, model);
  } catch {
    // Priority 4: Fallback for unknown models
    return DEFAULT_FALLBACK_THRESHOLD;
  }
}

export function calculateTokenThreshold(
  provider: string,
  model: string,
): number {
  const modelTokenLimit = TokenUtils.getProviderTokenLimit(provider, model);
  return Math.floor(modelTokenLimit * MEMORY_THRESHOLD_PERCENTAGE);
}
```

### Message Validation and Truncation

```typescript
private async validateAndPrepareMessage(
  content: string,
  role: ChatMessage["role"],
  threshold: number,
): Promise<ChatMessage> {
  const id = randomUUID();
  const tokenCount = TokenUtils.estimateTokenCount(content);

  // Max single message size is 80% of threshold
  const maxMessageSize = Math.floor(threshold * MEMORY_THRESHOLD_PERCENTAGE);

  if (tokenCount > maxMessageSize) {
    const truncated = TokenUtils.truncateToTokenLimit(content, maxMessageSize);

    return {
      id,
      role,
      content: truncated,
      timestamp: new Date().toISOString(),
      metadata: { truncated: true },
    };
  }

  return {
    id,
    role,
    content,
    timestamp: new Date().toISOString(),
  };
}
```

### Token Estimation

```typescript
// src/lib/constants/tokens.ts

export const TOKEN_ESTIMATION = {
  CHARS_PER_TOKEN: 4, // English average
  WORDS_PER_TOKEN: 0.75, // English average
  CODE_CHARS_PER_TOKEN: 3, // Code is more compact
  SAFETY_MARGIN: 0.8, // 80% safety margin
};

export const TokenUtils = {
  estimateTokenCount: (text: string, isCode = false): number => {
    const charsPerToken = isCode
      ? TOKEN_ESTIMATION.CODE_CHARS_PER_TOKEN
      : TOKEN_ESTIMATION.CHARS_PER_TOKEN;

    const estimatedTokens = Math.ceil(text.length / charsPerToken);
    return Math.ceil(estimatedTokens / TOKEN_ESTIMATION.SAFETY_MARGIN);
  },

  truncateToTokenLimit: (
    text: string,
    tokenLimit: number,
    isCode = false,
  ): string => {
    const charsPerToken = isCode
      ? TOKEN_ESTIMATION.CODE_CHARS_PER_TOKEN
      : TOKEN_ESTIMATION.CHARS_PER_TOKEN;

    const maxChars = Math.floor(
      tokenLimit * charsPerToken * TOKEN_ESTIMATION.SAFETY_MARGIN,
    );

    if (text.length <= maxChars) return text;
    return text.substring(0, maxChars - 3) + "...";
  },
};
```

---

## Best Practices for Memory Extensions

### 1. Implement the Common Interface

Always implement all methods from the common interface to ensure compatibility:

```typescript
type ConversationMemoryInterface = {
  config: ConversationMemoryConfig;
  initialize(): Promise<void>;
  storeConversationTurn(options: StoreConversationTurnOptions): Promise<void>;
  buildContextMessages(
    sessionId: string,
    userId?: string,
    enableSummarization?: boolean,
  ): Promise<ChatMessage[]>;
  getStats(): Promise<ConversationMemoryStats>;
  clearSession(sessionId: string, userId?: string): Promise<boolean>;
  clearAllSessions(): Promise<void>;
  createSummarySystemMessage(
    content: string,
    summarizesFrom?: string,
    summarizesTo?: string,
  ): ChatMessage;
};
```

### 2. Handle Race Conditions

Use tracking sets to prevent concurrent operations:

```typescript
private summarizationInProgress: Set<string> = new Set();

private async checkAndSummarize(...): Promise<void> {
  const key = `${sessionId}:${userId}`;

  if (this.summarizationInProgress.has(key)) {
    return; // Skip if already in progress
  }

  this.summarizationInProgress.add(key);
  try {
    // Perform summarization
  } finally {
    this.summarizationInProgress.delete(key);
  }
}
```

### 3. Use Lazy Initialization

Initialize resources only when needed:

```typescript
private async ensureInitialized(): Promise<void> {
  if (!this.isInitialized) {
    await this.initialize();
  }
}

async storeConversationTurn(options): Promise<void> {
  await this.ensureInitialized();
  // ... rest of implementation
}
```

### 4. Implement Background Operations

Use `setImmediate` for non-critical operations:

```typescript
if (shouldSummarize) {
  setImmediate(async () => {
    try {
      await this.checkAndSummarize(session, tokenThreshold);
    } catch (error) {
      logger.error("Background summarization failed", { error });
    }
  });
}
```

### 5. Clean Up Stale Data

Implement cleanup mechanisms for temporary data:

```typescript
private cleanupStalePendingData(): void {
  const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;

  for (const [key, data] of this.pendingToolExecutions) {
    if (data.timestamp < fiveMinutesAgo) {
      this.pendingToolExecutions.delete(key);
    }
  }
}
```

### 6. Validate Data on Deserialization

Always validate data structure when reading from storage:

```typescript
function deserializeConversation(
  data: string | null,
): RedisConversationObject | null {
  if (!data) return null;

  const parsed = JSON.parse(data);

  // Validate required fields
  if (
    !parsed.sessionId ||
    !parsed.messages ||
    !Array.isArray(parsed.messages)
  ) {
    return null;
  }

  // Validate message structure
  const isValid = parsed.messages.every(
    (m) => m.role && m.content && typeof m.role === "string",
  );

  if (!isValid) return null;

  return parsed;
}
```

### 7. Use Structured Logging

Include context in all log statements:

```typescript
logger.debug("[MyMemoryManager] Operation completed", {
  sessionId,
  userId,
  messageCount: messages.length,
  operationDuration: Date.now() - startTime,
});
```

---

## Template for New Memory Backends

Use this template when implementing a new storage backend (e.g., PostgreSQL, MongoDB, DynamoDB):

```typescript
/**
 * Custom Memory Backend Template
 * Replace "Custom" with your backend name (e.g., "PostgreSQL", "MongoDB")
 */

import { randomUUID } from "crypto";
import type {
  ConversationMemoryConfig,
  ConversationMemoryStats,
  ChatMessage,
  SessionMemory,
  StoreConversationTurnOptions,
} from "../types/conversation.js";
import { ConversationMemoryError } from "../types/conversation.js";
import {
  MESSAGES_PER_TURN,
  RECENT_MESSAGES_RATIO,
} from "../config/conversationMemory.js";
import { logger } from "../utils/logger.js";
import { TokenUtils } from "../constants/tokens.js";
import {
  buildContextFromPointer,
  getEffectiveTokenThreshold,
  generateSummary,
} from "../utils/conversationMemory.js";

// Define your custom configuration type
export type CustomStorageConfig = {
  connectionString?: string;
  database?: string;
  collection?: string;
  ttl?: number;
  // Add backend-specific options
};

export class CustomConversationMemoryManager {
  public config: ConversationMemoryConfig;
  private isInitialized: boolean = false;
  private customConfig: CustomStorageConfig;
  private client: YourClientType | null = null; // Replace with your client type

  // Race condition prevention
  private summarizationInProgress: Set<string> = new Set();
  private titleGenerationInProgress: Set<string> = new Set();

  constructor(
    config: ConversationMemoryConfig,
    customConfig: CustomStorageConfig = {},
  ) {
    this.config = config;
    this.customConfig = this.normalizeConfig(customConfig);
  }

  /**
   * Normalize configuration with defaults
   */
  private normalizeConfig(
    config: CustomStorageConfig,
  ): Required<CustomStorageConfig> {
    return {
      connectionString: config.connectionString || "default-connection-string",
      database: config.database || "neurolink",
      collection: config.collection || "conversations",
      ttl: config.ttl || 86400,
      // Set defaults for all config options
    };
  }

  /**
   * Initialize connection to the storage backend
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      logger.debug("[CustomMemoryManager] Already initialized, skipping");
      return;
    }

    try {
      logger.debug("[CustomMemoryManager] Initializing with config", {
        database: this.customConfig.database,
        collection: this.customConfig.collection,
      });

      // Initialize your client connection
      // this.client = await createClient(this.customConfig);

      this.isInitialized = true;

      logger.info("CustomConversationMemoryManager initialized", {
        storage: "custom",
        database: this.customConfig.database,
      });
    } catch (error) {
      logger.error("[CustomMemoryManager] Failed to initialize", {
        error: error instanceof Error ? error.message : String(error),
      });

      throw new ConversationMemoryError(
        "Failed to initialize custom conversation memory",
        "CONFIG_ERROR",
        { error: error instanceof Error ? error.message : String(error) },
      );
    }
  }

  /**
   * Ensure client is initialized before operations
   */
  private async ensureInitialized(): Promise<void> {
    if (!this.isInitialized) {
      await this.initialize();
    }
  }

  /**
   * Store a conversation turn
   */
  async storeConversationTurn(
    options: StoreConversationTurnOptions,
  ): Promise<void> {
    logger.debug("[CustomMemoryManager] Storing conversation turn", {
      sessionId: options.sessionId,
      userId: options.userId,
    });

    await this.ensureInitialized();

    try {
      // 1. Get or create session
      let session = await this.getSession(options.sessionId, options.userId);

      if (!session) {
        session = this.createNewSession(options.sessionId, options.userId);
        // Optionally generate title in background
        this.scheduleBackgroundTitleGeneration(session, options.userMessage);
      }

      // 2. Calculate token threshold
      const tokenThreshold = options.providerDetails
        ? getEffectiveTokenThreshold(
            options.providerDetails.provider,
            options.providerDetails.model,
            this.config.tokenThreshold,
            session.tokenThreshold,
          )
        : this.config.tokenThreshold || 50000;

      // 3. Create and validate messages
      const userMsg = this.createMessage(
        "user",
        options.userMessage,
        tokenThreshold,
      );
      const assistantMsg = this.createMessage(
        "assistant",
        options.aiResponse,
        tokenThreshold,
      );

      if (options.events?.length) {
        assistantMsg.events = options.events;
      }

      // 4. Add messages to session
      session.messages.push(userMsg, assistantMsg);
      session.lastActivity = Date.now();

      // 5. Save to storage
      await this.saveSession(session);

      // 6. Schedule background summarization if enabled
      const shouldSummarize =
        options.enableSummarization ?? this.config.enableSummarization;
      if (shouldSummarize) {
        this.scheduleBackgroundSummarization(
          session,
          tokenThreshold,
          options.sessionId,
          options.userId,
        );
      }

      logger.debug(
        "[CustomMemoryManager] Conversation turn stored successfully",
        {
          sessionId: options.sessionId,
          messageCount: session.messages.length,
        },
      );
    } catch (error) {
      throw new ConversationMemoryError(
        `Failed to store conversation turn for session ${options.sessionId}`,
        "STORAGE_ERROR",
        {
          sessionId: options.sessionId,
          error: error instanceof Error ? error.message : String(error),
        },
      );
    }
  }

  /**
   * Build context messages for AI prompt injection
   */
  async buildContextMessages(
    sessionId: string,
    userId?: string,
    enableSummarization?: boolean,
  ): Promise<ChatMessage[]> {
    await this.ensureInitialized();

    const session = await this.getSession(sessionId, userId);
    if (!session) {
      return [];
    }

    const contextMessages = buildContextFromPointer(session);

    // Filter tool messages if summarization is enabled
    const isSummarizationEnabled =
      enableSummarization ?? this.config.enableSummarization;
    if (isSummarizationEnabled) {
      return contextMessages.filter(
        (msg) => msg.role !== "tool_call" && msg.role !== "tool_result",
      );
    }

    return contextMessages;
  }

  /**
   * Get statistics about stored conversations
   */
  async getStats(): Promise<ConversationMemoryStats> {
    await this.ensureInitialized();

    // Implement using your storage backend
    // const sessions = await this.getAllSessions();
    // const totalTurns = sessions.reduce(
    //   (sum, session) => sum + session.messages.length / MESSAGES_PER_TURN, 0
    // );

    return {
      totalSessions: 0, // Implement based on your backend
      totalTurns: 0,
    };
  }

  /**
   * Clear a specific session
   */
  async clearSession(sessionId: string, userId?: string): Promise<boolean> {
    await this.ensureInitialized();

    try {
      // Implement using your storage backend
      // await this.client.delete({ sessionId, userId });

      logger.info("Session cleared", { sessionId, userId });
      return true;
    } catch (error) {
      logger.error("Failed to clear session", {
        sessionId,
        error: error instanceof Error ? error.message : String(error),
      });
      return false;
    }
  }

  /**
   * Clear all sessions
   */
  async clearAllSessions(): Promise<void> {
    await this.ensureInitialized();

    // Implement using your storage backend
    // await this.client.deleteAll();

    logger.info("All sessions cleared");
  }

  /**
   * Create summary system message
   */
  createSummarySystemMessage(
    content: string,
    summarizesFrom?: string,
    summarizesTo?: string,
  ): ChatMessage {
    return {
      id: `summary-${randomUUID()}`,
      role: "system",
      content: `Summary of previous conversation turns:\n\n${content}`,
      timestamp: new Date().toISOString(),
      metadata: {
        isSummary: true,
        summarizesFrom,
        summarizesTo,
      },
    };
  }

  /**
   * Close connection to storage backend
   */
  async close(): Promise<void> {
    if (this.client) {
      // await this.client.close();
      this.client = null;
      this.isInitialized = false;
      logger.info("Custom storage connection closed");
    }
  }

  // ========================================
  // Private helper methods
  // ========================================

  private createNewSession(sessionId: string, userId?: string): SessionMemory {
    return {
      sessionId,
      userId,
      title: "New Conversation",
      messages: [],
      createdAt: Date.now(),
      lastActivity: Date.now(),
    };
  }

  private createMessage(
    role: ChatMessage["role"],
    content: string,
    tokenThreshold: number,
  ): ChatMessage {
    const id = randomUUID();
    const tokenCount = TokenUtils.estimateTokenCount(content);
    const maxSize = Math.floor(tokenThreshold * 0.8);

    if (tokenCount > maxSize) {
      return {
        id,
        role,
        content: TokenUtils.truncateToTokenLimit(content, maxSize),
        timestamp: new Date().toISOString(),
        metadata: { truncated: true },
      };
    }

    return {
      id,
      role,
      content,
      timestamp: new Date().toISOString(),
    };
  }

  private async getSession(
    sessionId: string,
    userId?: string,
  ): Promise<SessionMemory | null> {
    // Implement using your storage backend
    // return await this.client.findOne({ sessionId, userId });
    return null;
  }

  private async saveSession(session: SessionMemory): Promise<void> {
    // Implement using your storage backend
    // await this.client.upsert(session);
  }

  private scheduleBackgroundTitleGeneration(
    session: SessionMemory,
    userMessage: string,
  ): void {
    const key = `${session.sessionId}:${session.userId || "anonymous"}`;

    if (this.titleGenerationInProgress.has(key)) {
      return;
    }

    this.titleGenerationInProgress.add(key);

    setImmediate(async () => {
      try {
        // Generate title using AI
        // session.title = await this.generateTitle(userMessage);
        // await this.saveSession(session);
      } catch (error) {
        logger.warn("Background title generation failed", { error });
      } finally {
        this.titleGenerationInProgress.delete(key);
      }
    });
  }

  private scheduleBackgroundSummarization(
    session: SessionMemory,
    threshold: number,
    sessionId: string,
    userId?: string,
  ): void {
    const key = `${sessionId}:${userId || "anonymous"}`;

    if (this.summarizationInProgress.has(key)) {
      return;
    }

    setImmediate(async () => {
      this.summarizationInProgress.add(key);

      try {
        await this.checkAndSummarize(session, threshold);
      } catch (error) {
        logger.error("Background summarization failed", {
          sessionId,
          error: error instanceof Error ? error.message : String(error),
        });
      } finally {
        this.summarizationInProgress.delete(key);
      }
    });
  }

  private async checkAndSummarize(
    session: SessionMemory,
    threshold: number,
  ): Promise<void> {
    const contextMessages = buildContextFromPointer(session);
    const tokenCount = this.estimateTokens(contextMessages);

    session.lastTokenCount = tokenCount;
    session.lastCountedAt = Date.now();

    if (tokenCount >= threshold) {
      await this.summarizeSession(session, threshold);
    }
  }

  private estimateTokens(messages: ChatMessage[]): number {
    return messages.reduce(
      (total, msg) => total + TokenUtils.estimateTokenCount(msg.content),
      0,
    );
  }

  private async summarizeSession(
    session: SessionMemory,
    threshold: number,
  ): Promise<void> {
    const startIndex = session.summarizedUpToMessageId
      ? session.messages.findIndex(
          (m) => m.id === session.summarizedUpToMessageId,
        ) + 1
      : 0;

    const recentMessages = session.messages.slice(startIndex);
    if (recentMessages.length === 0) return;

    const targetRecentTokens = threshold * RECENT_MESSAGES_RATIO;
    const splitIndex = this.findSplitIndex(recentMessages, targetRecentTokens);
    const messagesToSummarize = recentMessages.slice(0, splitIndex);

    if (messagesToSummarize.length === 0) return;

    const summary = await generateSummary(
      messagesToSummarize,
      this.config,
      "[CustomMemoryManager]",
      session.summarizedMessage,
    );

    if (!summary) return;

    const lastSummarized = messagesToSummarize[messagesToSummarize.length - 1];
    session.summarizedUpToMessageId = lastSummarized.id;
    session.summarizedMessage = summary;

    await this.saveSession(session);

    logger.info("[CustomMemoryManager] Summarization complete", {
      sessionId: session.sessionId,
      summarizedCount: messagesToSummarize.length,
      pointer: session.summarizedUpToMessageId,
    });
  }

  private findSplitIndex(
    messages: ChatMessage[],
    targetTokens: number,
  ): number {
    let tokens = 0;
    let splitIndex = messages.length;

    for (let i = messages.length - 1; i >= 0; i--) {
      const msgTokens = TokenUtils.estimateTokenCount(messages[i].content);
      if (tokens + msgTokens > targetTokens) {
        splitIndex = i + 1;
        break;
      }
      tokens += msgTokens;
    }

    return Math.max(1, splitIndex);
  }
}
```

### Registration in Factory

After implementing your backend, register it in the factory:

```typescript
// In conversationMemoryFactory.ts

import { CustomConversationMemoryManager } from "./customConversationMemoryManager.js";

export function createConversationMemoryManager(
  config: ConversationMemoryConfig,
  storageType: StorageType = "memory",
  storageConfig?: RedisStorageConfig | CustomStorageConfig,
):
  | ConversationMemoryManager
  | RedisConversationMemoryManager
  | CustomConversationMemoryManager {
  switch (storageType) {
    case "memory":
      return new ConversationMemoryManager(config);

    case "redis":
      return new RedisConversationMemoryManager(
        config,
        storageConfig as RedisStorageConfig,
      );

    case "custom": // Add your new storage type
      return new CustomConversationMemoryManager(
        config,
        storageConfig as CustomStorageConfig,
      );

    default:
      return new ConversationMemoryManager(config);
  }
}
```

---

## Summary

NeuroLink's memory system provides a robust, extensible foundation for conversation management with:

1. **Dual Storage Backends**: Choose between in-memory (development) and Redis (production)
2. **Token-Based Context Management**: Automatic summarization based on model context windows
3. **Non-Destructive Summarization**: Pointer-based approach preserves original messages
4. **Race Condition Prevention**: Built-in tracking for concurrent operations
5. **Extensible Architecture**: Factory pattern enables easy addition of new backends

Key files for memory implementation:

- `/src/lib/core/conversationMemoryManager.ts` - In-memory implementation
- `/src/lib/core/redisConversationMemoryManager.ts` - Redis implementation
- `/src/lib/core/conversationMemoryFactory.ts` - Factory pattern
- `/src/lib/core/conversationMemoryInitializer.ts` - High-level initialization
- `/src/lib/utils/conversationMemory.ts` - Shared utilities
- `/src/lib/config/conversationMemory.ts` - Configuration constants
- `/src/lib/types/conversation.ts` - Type definitions
- `/src/lib/utils/redis.ts` - Redis utilities
- `/src/lib/constants/tokens.ts` - Token estimation utilities
