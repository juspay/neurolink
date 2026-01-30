# Storage Abstraction Implementation Guide

## Executive Summary

This document provides a comprehensive implementation guide for adding Mastra-style storage abstraction to NeuroLink. The storage system provides a unified interface for persisting messages, threads, workflow runs, and custom records across multiple backend implementations.

**Target Architecture:**

1. **MastraStorage Interface** - Unified storage API for all data operations
2. **Multiple Backends** - PostgreSQL, LibSQL (SQLite), MongoDB, Redis, In-Memory
3. **Thread-Based Organization** - Messages organized by threads with resource scoping
4. **Migration System** - Schema versioning with automatic migrations

---

## Table of Contents

1. [Current NeuroLink Storage Analysis](#1-current-neurolink-storage-analysis)
2. [Gap Analysis vs Mastra](#2-gap-analysis-vs-mastra)
3. [Storage Architecture Design](#3-storage-architecture-design)
4. [TypeScript Interfaces](#4-typescript-interfaces)
5. [Storage Implementations](#5-storage-implementations)
6. [Migration System](#6-migration-system)
7. [Thread and Message Operations](#7-thread-and-message-operations)
8. [Workflow Run Storage](#8-workflow-run-storage)
9. [Custom Record Storage](#9-custom-record-storage)
10. [Integration with NeuroLink](#10-integration-with-neurolink)
11. [Code Examples](#11-code-examples)
12. [Implementation Plan](#12-implementation-plan)

---

## 1. Current NeuroLink Storage Analysis

### Existing Storage Components

NeuroLink currently implements a **conversation-focused storage system** with two backends:

#### Core Files

| File                                             | Purpose                              |
| ------------------------------------------------ | ------------------------------------ |
| `src/lib/core/conversationMemoryManager.ts`      | In-memory conversation storage       |
| `src/lib/core/redisConversationMemoryManager.ts` | Redis-based persistent storage       |
| `src/lib/core/conversationMemoryFactory.ts`      | Factory for creating memory managers |
| `src/lib/types/conversation.ts`                  | Type definitions for conversations   |
| `src/lib/utils/redis.ts`                         | Redis utility functions              |
| `src/lib/config/conversationMemory.ts`           | Configuration defaults               |

#### Current Architecture

```typescript
// Current Storage Type (limited)
type StorageType = "memory" | "redis";

// Current Session Memory Structure
type SessionMemory = {
  sessionId: string;
  userId?: string;
  title?: string;
  messages: ChatMessage[];
  createdAt: number;
  lastActivity: number;
  summarizedUpToMessageId?: string;
  summarizedMessage?: string;
  tokenThreshold?: number;
  lastTokenCount?: number;
  lastCountedAt?: number;
  metadata?: {
    userRole?: string;
    tags?: string[];
    customData?: Record<string, unknown>;
  };
};

// Redis Conversation Object
type RedisConversationObject = {
  id: string;
  title: string;
  sessionId: string;
  userId: string;
  createdAt: string;
  updatedAt: string;
  messages: ChatMessage[];
  summarizedUpToMessageId?: string;
  summarizedMessage?: string;
  tokenThreshold?: number;
  lastTokenCount?: number;
  lastCountedAt?: number;
};
```

#### Current Features

**Strengths:**

- Factory pattern for storage backend selection
- Redis integration with TTL and key prefixes
- Session-based conversation isolation
- User-to-session mapping
- Serialization/deserialization utilities
- Token-based summarization support
- Event sequence tracking

**Limitations:**

- Only two storage backends (memory, Redis)
- No SQL database support (PostgreSQL, SQLite)
- No MongoDB support
- No thread abstraction (sessions only)
- No workflow run persistence
- No custom record storage
- No migration system
- No resource scoping beyond user/session
- Tightly coupled to conversation use case

### Existing Storage Patterns

```typescript
// Factory Pattern (conversationMemoryFactory.ts)
function createConversationMemoryManager(
  config: ConversationMemoryConfig,
  storageType: StorageType = "memory",
  redisConfig?: RedisStorageConfig,
): ConversationMemoryManager | RedisConversationMemoryManager;

// Redis Key Structure
const sessionKey = `${keyPrefix}${userId || "randomUser"}:${sessionId}`;
const userSessionsKey = `${userSessionsKeyPrefix}${userId}`;

// Storage Type Detection
function getStorageType(): StorageType {
  const rawStorageType = process.env.STORAGE_TYPE;
  // Returns "memory" or "redis"
}
```

---

## 2. Gap Analysis vs Mastra

### Feature Comparison Matrix

| Feature                   | NeuroLink Current | Mastra              | Gap                     |
| ------------------------- | ----------------- | ------------------- | ----------------------- |
| **In-Memory Storage**     | Yes               | Yes                 | None                    |
| **Redis Storage**         | Yes               | No (uses other DBs) | Different approach      |
| **PostgreSQL Storage**    | No                | Yes                 | **Full implementation** |
| **SQLite/LibSQL Storage** | No                | Yes                 | **Full implementation** |
| **MongoDB Storage**       | No                | Yes                 | **Full implementation** |
| **Thread Abstraction**    | No (sessions)     | Yes                 | **Full implementation** |
| **Message CRUD**          | Partial           | Full                | Enhancement needed      |
| **Workflow Run Storage**  | No                | Yes                 | **Full implementation** |
| **Custom Records**        | No                | Yes                 | **Full implementation** |
| **Resource Scoping**      | Partial           | Yes                 | Enhancement needed      |
| **Migration System**      | No                | Yes                 | **Full implementation** |
| **Pagination**            | No                | Yes                 | **Full implementation** |
| **Filtering**             | No                | Yes                 | **Full implementation** |

### Critical Gaps

1. **Storage Interface Abstraction**
   - No unified interface for different backends
   - Operations are backend-specific
   - No pluggable storage architecture

2. **SQL Database Support**
   - No PostgreSQL adapter
   - No SQLite/LibSQL adapter
   - No schema management
   - No migrations

3. **Thread/Message Model**
   - No explicit thread concept
   - No message-level CRUD operations
   - No cross-thread queries

4. **Workflow Persistence**
   - No workflow run storage
   - No step result persistence
   - No workflow state snapshots

5. **Extensibility**
   - No custom record storage
   - No generic key-value operations
   - Limited metadata support

---

## 3. Storage Architecture Design

### High-Level Architecture

```
                         NeuroLink Storage System
                                   |
                    +--------------+--------------+
                    |                             |
              MastraStorage                 StorageFactory
              (Interface)                   (Factory Pattern)
                    |                             |
    +---------------+---------------+             |
    |       |       |       |       |             |
PostgreSQL LibSQL MongoDB Redis  Memory    <------+
  Adapter  Adapter Adapter Adapter Adapter
    |       |       |       |       |
    +-------+-------+-------+-------+
                    |
            Storage Operations
    +---------------+---------------+
    |       |       |       |       |
 Threads Messages Workflow  Custom
                   Runs    Records
```

### Design Principles

1. **Interface-First Design**: Define abstract interface, implement per backend
2. **Factory Pattern**: Consistent with NeuroLink's existing architecture
3. **Async-First**: All operations return Promises
4. **Type Safety**: Full TypeScript types with runtime validation
5. **Backward Compatible**: Existing conversation memory continues to work
6. **Pluggable**: Easy to add new storage backends

### Data Model

```
┌─────────────────────────────────────────────────────────────┐
│                      Storage Schema                          │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────────┐     ┌──────────┐     ┌──────────────────┐    │
│  │ threads  │────<│ messages │     │  workflow_runs   │    │
│  ├──────────┤     ├──────────┤     ├──────────────────┤    │
│  │ id       │     │ id       │     │ id               │    │
│  │ resourceId│    │ threadId │     │ workflowId       │    │
│  │ title    │     │ role     │     │ status           │    │
│  │ metadata │     │ content  │     │ triggerData      │    │
│  │ createdAt│     │ type     │     │ output           │    │
│  │ updatedAt│     │ createdAt│     │ createdAt        │    │
│  └──────────┘     └──────────┘     │ updatedAt        │    │
│                                     └──────────────────┘    │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐   │
│  │                   custom_records                      │   │
│  ├──────────────────────────────────────────────────────┤   │
│  │ namespace | key | value (JSON) | createdAt | updatedAt│   │
│  └──────────────────────────────────────────────────────┘   │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐   │
│  │                   schema_versions                     │   │
│  ├──────────────────────────────────────────────────────┤   │
│  │ component | version | appliedAt                       │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## 4. TypeScript Interfaces

### Core Storage Types

```typescript
// src/lib/types/storageTypes.ts

import type { z } from "zod";
import type { JsonValue, JsonObject } from "./common.js";
import type { ChatMessage } from "./conversation.js";

/**
 * Supported storage backend types
 */
export type StorageBackendType =
  | "memory"
  | "redis"
  | "postgresql"
  | "libsql"
  | "mongodb";

/**
 * Base entity with common fields
 */
export type BaseEntity = {
  id: string;
  createdAt: Date;
  updatedAt: Date;
};

/**
 * Thread represents a conversation context
 */
export type StorageThread = BaseEntity & {
  /** Resource identifier for scoping (e.g., userId, agentId) */
  resourceId: string;
  /** Thread title */
  title?: string;
  /** Custom metadata */
  metadata?: JsonObject;
  /** Status of the thread */
  status?: "active" | "archived" | "deleted";
};

/**
 * Message within a thread
 */
export type StorageMessage = BaseEntity & {
  /** Parent thread ID */
  threadId: string;
  /** Message role */
  role: "user" | "assistant" | "system" | "tool";
  /** Message content */
  content: string;
  /** Content type */
  type?: "text" | "tool-call" | "tool-result";
  /** Tool information (for tool messages) */
  toolInfo?: {
    toolName: string;
    toolCallId?: string;
    args?: JsonObject;
    result?: JsonValue;
  };
  /** Custom metadata */
  metadata?: JsonObject;
};

/**
 * Workflow execution status
 */
export type WorkflowRunStatus =
  | "pending"
  | "running"
  | "completed"
  | "failed"
  | "suspended"
  | "cancelled";

/**
 * Workflow run record
 */
export type StorageWorkflowRun = BaseEntity & {
  /** Workflow identifier */
  workflowId: string;
  /** Current status */
  status: WorkflowRunStatus;
  /** Input data that triggered the workflow */
  triggerData?: JsonObject;
  /** Final output data */
  output?: JsonValue;
  /** Error information if failed */
  error?: {
    code: string;
    message: string;
    details?: JsonObject;
  };
  /** Step results map */
  stepResults?: Record<string, StepRunResult>;
  /** Suspension data (if suspended) */
  suspensionData?: {
    stepId: string;
    reason: string;
    resumeData?: JsonObject;
  };
  /** Resource context */
  resourceId?: string;
  /** Thread context */
  threadId?: string;
};

/**
 * Individual step execution result
 */
export type StepRunResult = {
  stepId: string;
  status: "pending" | "running" | "completed" | "failed" | "skipped";
  input?: JsonValue;
  output?: JsonValue;
  error?: string;
  startedAt?: Date;
  completedAt?: Date;
  retryCount?: number;
};

/**
 * Custom record for generic key-value storage
 */
export type StorageCustomRecord = {
  /** Namespace for grouping records */
  namespace: string;
  /** Unique key within namespace */
  key: string;
  /** JSON value */
  value: JsonValue;
  /** Creation timestamp */
  createdAt: Date;
  /** Last update timestamp */
  updatedAt: Date;
  /** Optional TTL in seconds */
  ttl?: number;
  /** Custom metadata */
  metadata?: JsonObject;
};

/**
 * Pagination options
 */
export type PaginationOptions = {
  /** Number of items per page */
  limit?: number;
  /** Offset for pagination */
  offset?: number;
  /** Cursor for cursor-based pagination */
  cursor?: string;
};

/**
 * Paginated result
 */
export type PaginatedResult<T> = {
  /** Result items */
  data: T[];
  /** Total count (if available) */
  total?: number;
  /** Next cursor for pagination */
  nextCursor?: string;
  /** Whether more items exist */
  hasMore: boolean;
};

/**
 * Filter operators for queries
 */
export type FilterOperator =
  | "eq"
  | "ne"
  | "gt"
  | "gte"
  | "lt"
  | "lte"
  | "in"
  | "nin"
  | "contains"
  | "startsWith"
  | "endsWith";

/**
 * Filter condition
 */
export type FilterCondition = {
  field: string;
  operator: FilterOperator;
  value: JsonValue;
};

/**
 * Query filters
 */
export type QueryFilters = {
  conditions?: FilterCondition[];
  /** Logical operator for combining conditions */
  logic?: "and" | "or";
};

/**
 * Sort options
 */
export type SortOptions = {
  field: string;
  direction: "asc" | "desc";
};

/**
 * Query options combining pagination, filters, and sorting
 */
export type QueryOptions = PaginationOptions & {
  filters?: QueryFilters;
  sort?: SortOptions[];
};
```

### MastraStorage Interface

```typescript
// src/lib/types/storageTypes.ts (continued)

/**
 * Thread query options
 */
export type ThreadQueryOptions = QueryOptions & {
  resourceId?: string;
  status?: StorageThread["status"];
};

/**
 * Message query options
 */
export type MessageQueryOptions = QueryOptions & {
  threadId: string;
  role?: StorageMessage["role"];
  type?: StorageMessage["type"];
  /** Date range filter */
  dateRange?: {
    from?: Date;
    to?: Date;
  };
};

/**
 * Workflow run query options
 */
export type WorkflowRunQueryOptions = QueryOptions & {
  workflowId?: string;
  status?: WorkflowRunStatus;
  resourceId?: string;
  threadId?: string;
};

/**
 * Storage initialization options
 */
export type StorageInitOptions = {
  /** Run migrations on initialization */
  runMigrations?: boolean;
  /** Migration options */
  migrationOptions?: {
    /** Target version (null = latest) */
    targetVersion?: number | null;
    /** Dry run mode */
    dryRun?: boolean;
  };
};

/**
 * MastraStorage - Unified storage interface
 *
 * This interface defines all storage operations for NeuroLink.
 * Implementations must provide all methods for the specific backend.
 */
export type MastraStorage = {
  /** Storage backend type */
  readonly type: StorageBackendType;

  // ===== Lifecycle Methods =====

  /**
   * Initialize the storage backend
   * Creates tables/collections, runs migrations if needed
   */
  init(options?: StorageInitOptions): Promise<void>;

  /**
   * Close storage connections
   */
  close(): Promise<void>;

  /**
   * Check if storage is healthy and connected
   */
  healthCheck(): Promise<boolean>;

  // ===== Thread Operations =====

  /**
   * Create a new thread
   */
  createThread(
    thread: Omit<StorageThread, "id" | "createdAt" | "updatedAt">,
  ): Promise<StorageThread>;

  /**
   * Get a thread by ID
   */
  getThread(threadId: string): Promise<StorageThread | null>;

  /**
   * Update a thread
   */
  updateThread(
    threadId: string,
    updates: Partial<Omit<StorageThread, "id" | "createdAt">>,
  ): Promise<StorageThread | null>;

  /**
   * Delete a thread and all its messages
   */
  deleteThread(threadId: string): Promise<boolean>;

  /**
   * List threads with optional filtering and pagination
   */
  listThreads(
    options?: ThreadQueryOptions,
  ): Promise<PaginatedResult<StorageThread>>;

  /**
   * Get threads by resource ID
   */
  getThreadsByResourceId(
    resourceId: string,
    options?: QueryOptions,
  ): Promise<PaginatedResult<StorageThread>>;

  // ===== Message Operations =====

  /**
   * Create a new message in a thread
   */
  createMessage(
    message: Omit<StorageMessage, "id" | "createdAt" | "updatedAt">,
  ): Promise<StorageMessage>;

  /**
   * Create multiple messages in a thread (batch)
   */
  createMessages(
    messages: Omit<StorageMessage, "id" | "createdAt" | "updatedAt">[],
  ): Promise<StorageMessage[]>;

  /**
   * Get a message by ID
   */
  getMessage(messageId: string): Promise<StorageMessage | null>;

  /**
   * Update a message
   */
  updateMessage(
    messageId: string,
    updates: Partial<Omit<StorageMessage, "id" | "threadId" | "createdAt">>,
  ): Promise<StorageMessage | null>;

  /**
   * Delete a message
   */
  deleteMessage(messageId: string): Promise<boolean>;

  /**
   * List messages in a thread
   */
  listMessages(
    options: MessageQueryOptions,
  ): Promise<PaginatedResult<StorageMessage>>;

  /**
   * Get messages by thread ID (convenience method)
   */
  getMessagesByThreadId(
    threadId: string,
    options?: QueryOptions,
  ): Promise<StorageMessage[]>;

  /**
   * Delete all messages in a thread
   */
  deleteMessagesByThreadId(threadId: string): Promise<number>;

  // ===== Workflow Run Operations =====

  /**
   * Save a workflow run (create or update)
   */
  saveWorkflowRun(
    run: Omit<StorageWorkflowRun, "createdAt" | "updatedAt"> & { id?: string },
  ): Promise<StorageWorkflowRun>;

  /**
   * Get a workflow run by ID
   */
  getWorkflowRun(runId: string): Promise<StorageWorkflowRun | null>;

  /**
   * List workflow runs with optional filtering
   */
  listWorkflowRuns(
    options?: WorkflowRunQueryOptions,
  ): Promise<PaginatedResult<StorageWorkflowRun>>;

  /**
   * Update workflow run status
   */
  updateWorkflowRunStatus(
    runId: string,
    status: WorkflowRunStatus,
    output?: JsonValue,
    error?: StorageWorkflowRun["error"],
  ): Promise<StorageWorkflowRun | null>;

  /**
   * Update step result within a workflow run
   */
  updateStepResult(
    runId: string,
    stepId: string,
    result: StepRunResult,
  ): Promise<boolean>;

  /**
   * Get workflow runs by workflow ID
   */
  getWorkflowRunsByWorkflowId(
    workflowId: string,
    options?: QueryOptions,
  ): Promise<PaginatedResult<StorageWorkflowRun>>;

  // ===== Custom Record Operations =====

  /**
   * Set a custom record
   */
  setRecord(
    namespace: string,
    key: string,
    value: JsonValue,
    options?: { ttl?: number; metadata?: JsonObject },
  ): Promise<StorageCustomRecord>;

  /**
   * Get a custom record
   */
  getRecord(
    namespace: string,
    key: string,
  ): Promise<StorageCustomRecord | null>;

  /**
   * Delete a custom record
   */
  deleteRecord(namespace: string, key: string): Promise<boolean>;

  /**
   * List records in a namespace
   */
  listRecords(
    namespace: string,
    options?: QueryOptions,
  ): Promise<PaginatedResult<StorageCustomRecord>>;

  /**
   * Check if a record exists
   */
  hasRecord(namespace: string, key: string): Promise<boolean>;

  /**
   * Delete all records in a namespace
   */
  deleteNamespace(namespace: string): Promise<number>;

  // ===== Utility Methods =====

  /**
   * Get storage statistics
   */
  getStats(): Promise<StorageStats>;

  /**
   * Clear all data (use with caution)
   */
  clearAll(): Promise<void>;
};

/**
 * Storage statistics
 */
export type StorageStats = {
  threadCount: number;
  messageCount: number;
  workflowRunCount: number;
  customRecordCount: number;
  storageSize?: number; // in bytes, if available
};
```

---

## 5. Storage Implementations

### 5.1 In-Memory Storage

```typescript
// src/lib/storage/memoryStorage.ts

import { randomUUID } from "crypto";
import type {
  MastraStorage,
  StorageBackendType,
  StorageThread,
  StorageMessage,
  StorageWorkflowRun,
  StorageCustomRecord,
  StorageStats,
  StorageInitOptions,
  ThreadQueryOptions,
  MessageQueryOptions,
  WorkflowRunQueryOptions,
  QueryOptions,
  PaginatedResult,
  WorkflowRunStatus,
  StepRunResult,
  JsonValue,
  JsonObject,
} from "../types/storageTypes.js";
import { logger } from "../utils/logger.js";

/**
 * In-memory storage implementation
 * Suitable for development, testing, and single-instance deployments
 */
export class MemoryStorage implements MastraStorage {
  readonly type: StorageBackendType = "memory";

  private threads: Map<string, StorageThread> = new Map();
  private messages: Map<string, StorageMessage> = new Map();
  private workflowRuns: Map<string, StorageWorkflowRun> = new Map();
  private customRecords: Map<string, StorageCustomRecord> = new Map();

  private initialized: boolean = false;

  // ===== Lifecycle Methods =====

  async init(options?: StorageInitOptions): Promise<void> {
    if (this.initialized) {
      logger.debug("[MemoryStorage] Already initialized");
      return;
    }

    logger.info("[MemoryStorage] Initializing in-memory storage");
    this.initialized = true;
  }

  async close(): Promise<void> {
    logger.info("[MemoryStorage] Closing in-memory storage");
    this.initialized = false;
  }

  async healthCheck(): Promise<boolean> {
    return this.initialized;
  }

  // ===== Thread Operations =====

  async createThread(
    thread: Omit<StorageThread, "id" | "createdAt" | "updatedAt">,
  ): Promise<StorageThread> {
    const now = new Date();
    const newThread: StorageThread = {
      ...thread,
      id: randomUUID(),
      createdAt: now,
      updatedAt: now,
    };
    this.threads.set(newThread.id, newThread);
    logger.debug("[MemoryStorage] Created thread", { threadId: newThread.id });
    return newThread;
  }

  async getThread(threadId: string): Promise<StorageThread | null> {
    return this.threads.get(threadId) || null;
  }

  async updateThread(
    threadId: string,
    updates: Partial<Omit<StorageThread, "id" | "createdAt">>,
  ): Promise<StorageThread | null> {
    const thread = this.threads.get(threadId);
    if (!thread) return null;

    const updatedThread: StorageThread = {
      ...thread,
      ...updates,
      updatedAt: new Date(),
    };
    this.threads.set(threadId, updatedThread);
    return updatedThread;
  }

  async deleteThread(threadId: string): Promise<boolean> {
    // Delete all messages in the thread
    await this.deleteMessagesByThreadId(threadId);
    return this.threads.delete(threadId);
  }

  async listThreads(
    options?: ThreadQueryOptions,
  ): Promise<PaginatedResult<StorageThread>> {
    let threads = Array.from(this.threads.values());

    // Apply filters
    if (options?.resourceId) {
      threads = threads.filter((t) => t.resourceId === options.resourceId);
    }
    if (options?.status) {
      threads = threads.filter((t) => t.status === options.status);
    }

    // Apply sorting (default: updatedAt desc)
    threads.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());

    // Apply pagination
    const limit = options?.limit || 50;
    const offset = options?.offset || 0;
    const paginated = threads.slice(offset, offset + limit);

    return {
      data: paginated,
      total: threads.length,
      hasMore: offset + limit < threads.length,
    };
  }

  async getThreadsByResourceId(
    resourceId: string,
    options?: QueryOptions,
  ): Promise<PaginatedResult<StorageThread>> {
    return this.listThreads({ ...options, resourceId });
  }

  // ===== Message Operations =====

  async createMessage(
    message: Omit<StorageMessage, "id" | "createdAt" | "updatedAt">,
  ): Promise<StorageMessage> {
    const now = new Date();
    const newMessage: StorageMessage = {
      ...message,
      id: randomUUID(),
      createdAt: now,
      updatedAt: now,
    };
    this.messages.set(newMessage.id, newMessage);
    return newMessage;
  }

  async createMessages(
    messages: Omit<StorageMessage, "id" | "createdAt" | "updatedAt">[],
  ): Promise<StorageMessage[]> {
    const created: StorageMessage[] = [];
    for (const message of messages) {
      created.push(await this.createMessage(message));
    }
    return created;
  }

  async getMessage(messageId: string): Promise<StorageMessage | null> {
    return this.messages.get(messageId) || null;
  }

  async updateMessage(
    messageId: string,
    updates: Partial<Omit<StorageMessage, "id" | "threadId" | "createdAt">>,
  ): Promise<StorageMessage | null> {
    const message = this.messages.get(messageId);
    if (!message) return null;

    const updatedMessage: StorageMessage = {
      ...message,
      ...updates,
      updatedAt: new Date(),
    };
    this.messages.set(messageId, updatedMessage);
    return updatedMessage;
  }

  async deleteMessage(messageId: string): Promise<boolean> {
    return this.messages.delete(messageId);
  }

  async listMessages(
    options: MessageQueryOptions,
  ): Promise<PaginatedResult<StorageMessage>> {
    let messages = Array.from(this.messages.values()).filter(
      (m) => m.threadId === options.threadId,
    );

    // Apply filters
    if (options.role) {
      messages = messages.filter((m) => m.role === options.role);
    }
    if (options.type) {
      messages = messages.filter((m) => m.type === options.type);
    }
    if (options.dateRange?.from) {
      messages = messages.filter(
        (m) => m.createdAt >= options.dateRange!.from!,
      );
    }
    if (options.dateRange?.to) {
      messages = messages.filter((m) => m.createdAt <= options.dateRange!.to!);
    }

    // Sort by createdAt
    messages.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());

    // Apply pagination
    const limit = options.limit || 100;
    const offset = options.offset || 0;
    const paginated = messages.slice(offset, offset + limit);

    return {
      data: paginated,
      total: messages.length,
      hasMore: offset + limit < messages.length,
    };
  }

  async getMessagesByThreadId(
    threadId: string,
    options?: QueryOptions,
  ): Promise<StorageMessage[]> {
    const result = await this.listMessages({ ...options, threadId });
    return result.data;
  }

  async deleteMessagesByThreadId(threadId: string): Promise<number> {
    let count = 0;
    for (const [id, message] of this.messages) {
      if (message.threadId === threadId) {
        this.messages.delete(id);
        count++;
      }
    }
    return count;
  }

  // ===== Workflow Run Operations =====

  async saveWorkflowRun(
    run: Omit<StorageWorkflowRun, "createdAt" | "updatedAt"> & { id?: string },
  ): Promise<StorageWorkflowRun> {
    const now = new Date();
    const existingRun = run.id ? this.workflowRuns.get(run.id) : null;

    const savedRun: StorageWorkflowRun = {
      ...run,
      id: run.id || randomUUID(),
      createdAt: existingRun?.createdAt || now,
      updatedAt: now,
    };
    this.workflowRuns.set(savedRun.id, savedRun);
    return savedRun;
  }

  async getWorkflowRun(runId: string): Promise<StorageWorkflowRun | null> {
    return this.workflowRuns.get(runId) || null;
  }

  async listWorkflowRuns(
    options?: WorkflowRunQueryOptions,
  ): Promise<PaginatedResult<StorageWorkflowRun>> {
    let runs = Array.from(this.workflowRuns.values());

    // Apply filters
    if (options?.workflowId) {
      runs = runs.filter((r) => r.workflowId === options.workflowId);
    }
    if (options?.status) {
      runs = runs.filter((r) => r.status === options.status);
    }
    if (options?.resourceId) {
      runs = runs.filter((r) => r.resourceId === options.resourceId);
    }
    if (options?.threadId) {
      runs = runs.filter((r) => r.threadId === options.threadId);
    }

    // Sort by createdAt desc
    runs.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    // Apply pagination
    const limit = options?.limit || 50;
    const offset = options?.offset || 0;
    const paginated = runs.slice(offset, offset + limit);

    return {
      data: paginated,
      total: runs.length,
      hasMore: offset + limit < runs.length,
    };
  }

  async updateWorkflowRunStatus(
    runId: string,
    status: WorkflowRunStatus,
    output?: JsonValue,
    error?: StorageWorkflowRun["error"],
  ): Promise<StorageWorkflowRun | null> {
    const run = this.workflowRuns.get(runId);
    if (!run) return null;

    const updatedRun: StorageWorkflowRun = {
      ...run,
      status,
      output: output !== undefined ? output : run.output,
      error: error !== undefined ? error : run.error,
      updatedAt: new Date(),
    };
    this.workflowRuns.set(runId, updatedRun);
    return updatedRun;
  }

  async updateStepResult(
    runId: string,
    stepId: string,
    result: StepRunResult,
  ): Promise<boolean> {
    const run = this.workflowRuns.get(runId);
    if (!run) return false;

    const stepResults = run.stepResults || {};
    stepResults[stepId] = result;

    const updatedRun: StorageWorkflowRun = {
      ...run,
      stepResults,
      updatedAt: new Date(),
    };
    this.workflowRuns.set(runId, updatedRun);
    return true;
  }

  async getWorkflowRunsByWorkflowId(
    workflowId: string,
    options?: QueryOptions,
  ): Promise<PaginatedResult<StorageWorkflowRun>> {
    return this.listWorkflowRuns({ ...options, workflowId });
  }

  // ===== Custom Record Operations =====

  private getRecordKey(namespace: string, key: string): string {
    return `${namespace}:${key}`;
  }

  async setRecord(
    namespace: string,
    key: string,
    value: JsonValue,
    options?: { ttl?: number; metadata?: JsonObject },
  ): Promise<StorageCustomRecord> {
    const recordKey = this.getRecordKey(namespace, key);
    const now = new Date();
    const existing = this.customRecords.get(recordKey);

    const record: StorageCustomRecord = {
      namespace,
      key,
      value,
      createdAt: existing?.createdAt || now,
      updatedAt: now,
      ttl: options?.ttl,
      metadata: options?.metadata,
    };
    this.customRecords.set(recordKey, record);

    // Handle TTL with setTimeout (for in-memory only)
    if (options?.ttl) {
      setTimeout(() => {
        this.customRecords.delete(recordKey);
      }, options.ttl * 1000);
    }

    return record;
  }

  async getRecord(
    namespace: string,
    key: string,
  ): Promise<StorageCustomRecord | null> {
    return this.customRecords.get(this.getRecordKey(namespace, key)) || null;
  }

  async deleteRecord(namespace: string, key: string): Promise<boolean> {
    return this.customRecords.delete(this.getRecordKey(namespace, key));
  }

  async listRecords(
    namespace: string,
    options?: QueryOptions,
  ): Promise<PaginatedResult<StorageCustomRecord>> {
    let records = Array.from(this.customRecords.values()).filter(
      (r) => r.namespace === namespace,
    );

    // Sort by updatedAt desc
    records.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());

    // Apply pagination
    const limit = options?.limit || 100;
    const offset = options?.offset || 0;
    const paginated = records.slice(offset, offset + limit);

    return {
      data: paginated,
      total: records.length,
      hasMore: offset + limit < records.length,
    };
  }

  async hasRecord(namespace: string, key: string): Promise<boolean> {
    return this.customRecords.has(this.getRecordKey(namespace, key));
  }

  async deleteNamespace(namespace: string): Promise<number> {
    let count = 0;
    for (const [key, record] of this.customRecords) {
      if (record.namespace === namespace) {
        this.customRecords.delete(key);
        count++;
      }
    }
    return count;
  }

  // ===== Utility Methods =====

  async getStats(): Promise<StorageStats> {
    return {
      threadCount: this.threads.size,
      messageCount: this.messages.size,
      workflowRunCount: this.workflowRuns.size,
      customRecordCount: this.customRecords.size,
    };
  }

  async clearAll(): Promise<void> {
    this.threads.clear();
    this.messages.clear();
    this.workflowRuns.clear();
    this.customRecords.clear();
    logger.warn("[MemoryStorage] All data cleared");
  }
}
```

### 5.2 PostgreSQL Storage

```typescript
// src/lib/storage/postgresStorage.ts

import type { Pool, PoolConfig } from "pg";
import { randomUUID } from "crypto";
import type {
  MastraStorage,
  StorageBackendType,
  StorageThread,
  StorageMessage,
  StorageWorkflowRun,
  StorageCustomRecord,
  StorageStats,
  StorageInitOptions,
  ThreadQueryOptions,
  MessageQueryOptions,
  WorkflowRunQueryOptions,
  QueryOptions,
  PaginatedResult,
  WorkflowRunStatus,
  StepRunResult,
  JsonValue,
  JsonObject,
} from "../types/storageTypes.js";
import { logger } from "../utils/logger.js";

/**
 * PostgreSQL storage configuration
 */
export type PostgresStorageConfig = {
  /** Connection string or pool config */
  connection: string | PoolConfig;
  /** Schema name (default: 'neurolink') */
  schema?: string;
  /** Table prefix (default: '') */
  tablePrefix?: string;
};

/**
 * PostgreSQL storage implementation
 * Production-ready storage with full ACID compliance
 */
export class PostgresStorage implements MastraStorage {
  readonly type: StorageBackendType = "postgresql";

  private pool: Pool | null = null;
  private config: PostgresStorageConfig;
  private schema: string;
  private tablePrefix: string;

  constructor(config: PostgresStorageConfig) {
    this.config = config;
    this.schema = config.schema || "neurolink";
    this.tablePrefix = config.tablePrefix || "";
  }

  private tableName(name: string): string {
    return `"${this.schema}"."${this.tablePrefix}${name}"`;
  }

  // ===== Lifecycle Methods =====

  async init(options?: StorageInitOptions): Promise<void> {
    const { Pool } = await import("pg");

    this.pool =
      typeof this.config.connection === "string"
        ? new Pool({ connectionString: this.config.connection })
        : new Pool(this.config.connection);

    logger.info("[PostgresStorage] Initializing PostgreSQL storage", {
      schema: this.schema,
    });

    // Create schema if not exists
    await this.pool.query(`CREATE SCHEMA IF NOT EXISTS "${this.schema}"`);

    // Run migrations if requested
    if (options?.runMigrations !== false) {
      await this.runMigrations(options?.migrationOptions);
    }

    logger.info("[PostgresStorage] PostgreSQL storage initialized");
  }

  private async runMigrations(
    options?: StorageInitOptions["migrationOptions"],
  ): Promise<void> {
    if (!this.pool) throw new Error("Pool not initialized");

    logger.info("[PostgresStorage] Running migrations");

    // Create threads table
    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS ${this.tableName("threads")} (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        resource_id VARCHAR(255) NOT NULL,
        title VARCHAR(500),
        metadata JSONB DEFAULT '{}',
        status VARCHAR(50) DEFAULT 'active',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `);

    // Create messages table
    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS ${this.tableName("messages")} (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        thread_id UUID NOT NULL REFERENCES ${this.tableName("threads")}(id) ON DELETE CASCADE,
        role VARCHAR(50) NOT NULL,
        content TEXT NOT NULL,
        type VARCHAR(50) DEFAULT 'text',
        tool_info JSONB,
        metadata JSONB DEFAULT '{}',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `);

    // Create workflow_runs table
    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS ${this.tableName("workflow_runs")} (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        workflow_id VARCHAR(255) NOT NULL,
        status VARCHAR(50) NOT NULL DEFAULT 'pending',
        trigger_data JSONB,
        output JSONB,
        error JSONB,
        step_results JSONB DEFAULT '{}',
        suspension_data JSONB,
        resource_id VARCHAR(255),
        thread_id UUID REFERENCES ${this.tableName("threads")}(id) ON DELETE SET NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `);

    // Create custom_records table
    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS ${this.tableName("custom_records")} (
        namespace VARCHAR(255) NOT NULL,
        key VARCHAR(255) NOT NULL,
        value JSONB NOT NULL,
        metadata JSONB DEFAULT '{}',
        ttl INTEGER,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        PRIMARY KEY (namespace, key)
      )
    `);

    // Create indexes
    await this.pool.query(`
      CREATE INDEX IF NOT EXISTS idx_threads_resource_id
      ON ${this.tableName("threads")}(resource_id)
    `);
    await this.pool.query(`
      CREATE INDEX IF NOT EXISTS idx_messages_thread_id
      ON ${this.tableName("messages")}(thread_id)
    `);
    await this.pool.query(`
      CREATE INDEX IF NOT EXISTS idx_workflow_runs_workflow_id
      ON ${this.tableName("workflow_runs")}(workflow_id)
    `);
    await this.pool.query(`
      CREATE INDEX IF NOT EXISTS idx_workflow_runs_status
      ON ${this.tableName("workflow_runs")}(status)
    `);

    logger.info("[PostgresStorage] Migrations completed");
  }

  async close(): Promise<void> {
    if (this.pool) {
      await this.pool.end();
      this.pool = null;
    }
    logger.info("[PostgresStorage] Connection closed");
  }

  async healthCheck(): Promise<boolean> {
    if (!this.pool) return false;
    try {
      const result = await this.pool.query("SELECT 1");
      return result.rowCount === 1;
    } catch (error) {
      logger.error("[PostgresStorage] Health check failed", { error });
      return false;
    }
  }

  // ===== Thread Operations =====

  async createThread(
    thread: Omit<StorageThread, "id" | "createdAt" | "updatedAt">,
  ): Promise<StorageThread> {
    if (!this.pool) throw new Error("Pool not initialized");

    const result = await this.pool.query(
      `INSERT INTO ${this.tableName("threads")}
       (resource_id, title, metadata, status)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [
        thread.resourceId,
        thread.title || null,
        JSON.stringify(thread.metadata || {}),
        thread.status || "active",
      ],
    );

    return this.mapThreadRow(result.rows[0]);
  }

  async getThread(threadId: string): Promise<StorageThread | null> {
    if (!this.pool) throw new Error("Pool not initialized");

    const result = await this.pool.query(
      `SELECT * FROM ${this.tableName("threads")} WHERE id = $1`,
      [threadId],
    );

    return result.rows[0] ? this.mapThreadRow(result.rows[0]) : null;
  }

  async updateThread(
    threadId: string,
    updates: Partial<Omit<StorageThread, "id" | "createdAt">>,
  ): Promise<StorageThread | null> {
    if (!this.pool) throw new Error("Pool not initialized");

    const setClauses: string[] = ["updated_at = NOW()"];
    const values: unknown[] = [];
    let paramIndex = 1;

    if (updates.resourceId !== undefined) {
      setClauses.push(`resource_id = $${paramIndex++}`);
      values.push(updates.resourceId);
    }
    if (updates.title !== undefined) {
      setClauses.push(`title = $${paramIndex++}`);
      values.push(updates.title);
    }
    if (updates.metadata !== undefined) {
      setClauses.push(`metadata = $${paramIndex++}`);
      values.push(JSON.stringify(updates.metadata));
    }
    if (updates.status !== undefined) {
      setClauses.push(`status = $${paramIndex++}`);
      values.push(updates.status);
    }

    values.push(threadId);

    const result = await this.pool.query(
      `UPDATE ${this.tableName("threads")}
       SET ${setClauses.join(", ")}
       WHERE id = $${paramIndex}
       RETURNING *`,
      values,
    );

    return result.rows[0] ? this.mapThreadRow(result.rows[0]) : null;
  }

  async deleteThread(threadId: string): Promise<boolean> {
    if (!this.pool) throw new Error("Pool not initialized");

    const result = await this.pool.query(
      `DELETE FROM ${this.tableName("threads")} WHERE id = $1`,
      [threadId],
    );

    return (result.rowCount || 0) > 0;
  }

  async listThreads(
    options?: ThreadQueryOptions,
  ): Promise<PaginatedResult<StorageThread>> {
    if (!this.pool) throw new Error("Pool not initialized");

    let whereClause = "WHERE 1=1";
    const values: unknown[] = [];
    let paramIndex = 1;

    if (options?.resourceId) {
      whereClause += ` AND resource_id = $${paramIndex++}`;
      values.push(options.resourceId);
    }
    if (options?.status) {
      whereClause += ` AND status = $${paramIndex++}`;
      values.push(options.status);
    }

    const limit = options?.limit || 50;
    const offset = options?.offset || 0;

    // Count query
    const countResult = await this.pool.query(
      `SELECT COUNT(*) FROM ${this.tableName("threads")} ${whereClause}`,
      values,
    );
    const total = parseInt(countResult.rows[0].count, 10);

    // Data query
    const result = await this.pool.query(
      `SELECT * FROM ${this.tableName("threads")}
       ${whereClause}
       ORDER BY updated_at DESC
       LIMIT $${paramIndex++} OFFSET $${paramIndex}`,
      [...values, limit, offset],
    );

    return {
      data: result.rows.map(this.mapThreadRow),
      total,
      hasMore: offset + limit < total,
    };
  }

  async getThreadsByResourceId(
    resourceId: string,
    options?: QueryOptions,
  ): Promise<PaginatedResult<StorageThread>> {
    return this.listThreads({ ...options, resourceId });
  }

  private mapThreadRow(row: Record<string, unknown>): StorageThread {
    return {
      id: row.id as string,
      resourceId: row.resource_id as string,
      title: row.title as string | undefined,
      metadata: row.metadata as JsonObject | undefined,
      status: row.status as StorageThread["status"],
      createdAt: new Date(row.created_at as string),
      updatedAt: new Date(row.updated_at as string),
    };
  }

  // ===== Message Operations =====

  async createMessage(
    message: Omit<StorageMessage, "id" | "createdAt" | "updatedAt">,
  ): Promise<StorageMessage> {
    if (!this.pool) throw new Error("Pool not initialized");

    const result = await this.pool.query(
      `INSERT INTO ${this.tableName("messages")}
       (thread_id, role, content, type, tool_info, metadata)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [
        message.threadId,
        message.role,
        message.content,
        message.type || "text",
        message.toolInfo ? JSON.stringify(message.toolInfo) : null,
        JSON.stringify(message.metadata || {}),
      ],
    );

    return this.mapMessageRow(result.rows[0]);
  }

  async createMessages(
    messages: Omit<StorageMessage, "id" | "createdAt" | "updatedAt">[],
  ): Promise<StorageMessage[]> {
    if (!this.pool) throw new Error("Pool not initialized");
    if (messages.length === 0) return [];

    // Build bulk insert
    const values: unknown[] = [];
    const placeholders: string[] = [];
    let paramIndex = 1;

    for (const message of messages) {
      placeholders.push(
        `($${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++})`,
      );
      values.push(
        message.threadId,
        message.role,
        message.content,
        message.type || "text",
        message.toolInfo ? JSON.stringify(message.toolInfo) : null,
        JSON.stringify(message.metadata || {}),
      );
    }

    const result = await this.pool.query(
      `INSERT INTO ${this.tableName("messages")}
       (thread_id, role, content, type, tool_info, metadata)
       VALUES ${placeholders.join(", ")}
       RETURNING *`,
      values,
    );

    return result.rows.map(this.mapMessageRow);
  }

  async getMessage(messageId: string): Promise<StorageMessage | null> {
    if (!this.pool) throw new Error("Pool not initialized");

    const result = await this.pool.query(
      `SELECT * FROM ${this.tableName("messages")} WHERE id = $1`,
      [messageId],
    );

    return result.rows[0] ? this.mapMessageRow(result.rows[0]) : null;
  }

  async updateMessage(
    messageId: string,
    updates: Partial<Omit<StorageMessage, "id" | "threadId" | "createdAt">>,
  ): Promise<StorageMessage | null> {
    if (!this.pool) throw new Error("Pool not initialized");

    const setClauses: string[] = ["updated_at = NOW()"];
    const values: unknown[] = [];
    let paramIndex = 1;

    if (updates.role !== undefined) {
      setClauses.push(`role = $${paramIndex++}`);
      values.push(updates.role);
    }
    if (updates.content !== undefined) {
      setClauses.push(`content = $${paramIndex++}`);
      values.push(updates.content);
    }
    if (updates.type !== undefined) {
      setClauses.push(`type = $${paramIndex++}`);
      values.push(updates.type);
    }
    if (updates.toolInfo !== undefined) {
      setClauses.push(`tool_info = $${paramIndex++}`);
      values.push(JSON.stringify(updates.toolInfo));
    }
    if (updates.metadata !== undefined) {
      setClauses.push(`metadata = $${paramIndex++}`);
      values.push(JSON.stringify(updates.metadata));
    }

    values.push(messageId);

    const result = await this.pool.query(
      `UPDATE ${this.tableName("messages")}
       SET ${setClauses.join(", ")}
       WHERE id = $${paramIndex}
       RETURNING *`,
      values,
    );

    return result.rows[0] ? this.mapMessageRow(result.rows[0]) : null;
  }

  async deleteMessage(messageId: string): Promise<boolean> {
    if (!this.pool) throw new Error("Pool not initialized");

    const result = await this.pool.query(
      `DELETE FROM ${this.tableName("messages")} WHERE id = $1`,
      [messageId],
    );

    return (result.rowCount || 0) > 0;
  }

  async listMessages(
    options: MessageQueryOptions,
  ): Promise<PaginatedResult<StorageMessage>> {
    if (!this.pool) throw new Error("Pool not initialized");

    let whereClause = "WHERE thread_id = $1";
    const values: unknown[] = [options.threadId];
    let paramIndex = 2;

    if (options.role) {
      whereClause += ` AND role = $${paramIndex++}`;
      values.push(options.role);
    }
    if (options.type) {
      whereClause += ` AND type = $${paramIndex++}`;
      values.push(options.type);
    }
    if (options.dateRange?.from) {
      whereClause += ` AND created_at >= $${paramIndex++}`;
      values.push(options.dateRange.from);
    }
    if (options.dateRange?.to) {
      whereClause += ` AND created_at <= $${paramIndex++}`;
      values.push(options.dateRange.to);
    }

    const limit = options.limit || 100;
    const offset = options.offset || 0;

    // Count query
    const countResult = await this.pool.query(
      `SELECT COUNT(*) FROM ${this.tableName("messages")} ${whereClause}`,
      values,
    );
    const total = parseInt(countResult.rows[0].count, 10);

    // Data query
    const result = await this.pool.query(
      `SELECT * FROM ${this.tableName("messages")}
       ${whereClause}
       ORDER BY created_at ASC
       LIMIT $${paramIndex++} OFFSET $${paramIndex}`,
      [...values, limit, offset],
    );

    return {
      data: result.rows.map(this.mapMessageRow),
      total,
      hasMore: offset + limit < total,
    };
  }

  async getMessagesByThreadId(
    threadId: string,
    options?: QueryOptions,
  ): Promise<StorageMessage[]> {
    const result = await this.listMessages({ ...options, threadId });
    return result.data;
  }

  async deleteMessagesByThreadId(threadId: string): Promise<number> {
    if (!this.pool) throw new Error("Pool not initialized");

    const result = await this.pool.query(
      `DELETE FROM ${this.tableName("messages")} WHERE thread_id = $1`,
      [threadId],
    );

    return result.rowCount || 0;
  }

  private mapMessageRow(row: Record<string, unknown>): StorageMessage {
    return {
      id: row.id as string,
      threadId: row.thread_id as string,
      role: row.role as StorageMessage["role"],
      content: row.content as string,
      type: row.type as StorageMessage["type"],
      toolInfo: row.tool_info as StorageMessage["toolInfo"],
      metadata: row.metadata as JsonObject | undefined,
      createdAt: new Date(row.created_at as string),
      updatedAt: new Date(row.updated_at as string),
    };
  }

  // Workflow and Custom Record operations follow similar patterns...
  // (Abbreviated for length - full implementation would include all methods)

  async saveWorkflowRun(
    run: Omit<StorageWorkflowRun, "createdAt" | "updatedAt"> & { id?: string },
  ): Promise<StorageWorkflowRun> {
    if (!this.pool) throw new Error("Pool not initialized");

    const id = run.id || randomUUID();

    const result = await this.pool.query(
      `INSERT INTO ${this.tableName("workflow_runs")}
       (id, workflow_id, status, trigger_data, output, error, step_results,
        suspension_data, resource_id, thread_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       ON CONFLICT (id) DO UPDATE SET
         status = EXCLUDED.status,
         trigger_data = EXCLUDED.trigger_data,
         output = EXCLUDED.output,
         error = EXCLUDED.error,
         step_results = EXCLUDED.step_results,
         suspension_data = EXCLUDED.suspension_data,
         updated_at = NOW()
       RETURNING *`,
      [
        id,
        run.workflowId,
        run.status,
        run.triggerData ? JSON.stringify(run.triggerData) : null,
        run.output !== undefined ? JSON.stringify(run.output) : null,
        run.error ? JSON.stringify(run.error) : null,
        JSON.stringify(run.stepResults || {}),
        run.suspensionData ? JSON.stringify(run.suspensionData) : null,
        run.resourceId || null,
        run.threadId || null,
      ],
    );

    return this.mapWorkflowRunRow(result.rows[0]);
  }

  async getWorkflowRun(runId: string): Promise<StorageWorkflowRun | null> {
    if (!this.pool) throw new Error("Pool not initialized");

    const result = await this.pool.query(
      `SELECT * FROM ${this.tableName("workflow_runs")} WHERE id = $1`,
      [runId],
    );

    return result.rows[0] ? this.mapWorkflowRunRow(result.rows[0]) : null;
  }

  async listWorkflowRuns(
    options?: WorkflowRunQueryOptions,
  ): Promise<PaginatedResult<StorageWorkflowRun>> {
    if (!this.pool) throw new Error("Pool not initialized");

    let whereClause = "WHERE 1=1";
    const values: unknown[] = [];
    let paramIndex = 1;

    if (options?.workflowId) {
      whereClause += ` AND workflow_id = $${paramIndex++}`;
      values.push(options.workflowId);
    }
    if (options?.status) {
      whereClause += ` AND status = $${paramIndex++}`;
      values.push(options.status);
    }

    const limit = options?.limit || 50;
    const offset = options?.offset || 0;

    const countResult = await this.pool.query(
      `SELECT COUNT(*) FROM ${this.tableName("workflow_runs")} ${whereClause}`,
      values,
    );
    const total = parseInt(countResult.rows[0].count, 10);

    const result = await this.pool.query(
      `SELECT * FROM ${this.tableName("workflow_runs")}
       ${whereClause}
       ORDER BY created_at DESC
       LIMIT $${paramIndex++} OFFSET $${paramIndex}`,
      [...values, limit, offset],
    );

    return {
      data: result.rows.map(this.mapWorkflowRunRow.bind(this)),
      total,
      hasMore: offset + limit < total,
    };
  }

  async updateWorkflowRunStatus(
    runId: string,
    status: WorkflowRunStatus,
    output?: JsonValue,
    error?: StorageWorkflowRun["error"],
  ): Promise<StorageWorkflowRun | null> {
    if (!this.pool) throw new Error("Pool not initialized");

    const result = await this.pool.query(
      `UPDATE ${this.tableName("workflow_runs")}
       SET status = $1, output = COALESCE($2, output), error = COALESCE($3, error),
           updated_at = NOW()
       WHERE id = $4
       RETURNING *`,
      [
        status,
        output !== undefined ? JSON.stringify(output) : null,
        error ? JSON.stringify(error) : null,
        runId,
      ],
    );

    return result.rows[0] ? this.mapWorkflowRunRow(result.rows[0]) : null;
  }

  async updateStepResult(
    runId: string,
    stepId: string,
    result: StepRunResult,
  ): Promise<boolean> {
    if (!this.pool) throw new Error("Pool not initialized");

    const queryResult = await this.pool.query(
      `UPDATE ${this.tableName("workflow_runs")}
       SET step_results = jsonb_set(
         COALESCE(step_results, '{}'::jsonb),
         $1::text[],
         $2::jsonb
       ),
       updated_at = NOW()
       WHERE id = $3`,
      [[stepId], JSON.stringify(result), runId],
    );

    return (queryResult.rowCount || 0) > 0;
  }

  async getWorkflowRunsByWorkflowId(
    workflowId: string,
    options?: QueryOptions,
  ): Promise<PaginatedResult<StorageWorkflowRun>> {
    return this.listWorkflowRuns({ ...options, workflowId });
  }

  private mapWorkflowRunRow(row: Record<string, unknown>): StorageWorkflowRun {
    return {
      id: row.id as string,
      workflowId: row.workflow_id as string,
      status: row.status as WorkflowRunStatus,
      triggerData: row.trigger_data as JsonObject | undefined,
      output: row.output as JsonValue | undefined,
      error: row.error as StorageWorkflowRun["error"],
      stepResults: row.step_results as Record<string, StepRunResult>,
      suspensionData:
        row.suspension_data as StorageWorkflowRun["suspensionData"],
      resourceId: row.resource_id as string | undefined,
      threadId: row.thread_id as string | undefined,
      createdAt: new Date(row.created_at as string),
      updatedAt: new Date(row.updated_at as string),
    };
  }

  // ===== Custom Record Operations =====

  async setRecord(
    namespace: string,
    key: string,
    value: JsonValue,
    options?: { ttl?: number; metadata?: JsonObject },
  ): Promise<StorageCustomRecord> {
    if (!this.pool) throw new Error("Pool not initialized");

    const result = await this.pool.query(
      `INSERT INTO ${this.tableName("custom_records")}
       (namespace, key, value, metadata, ttl)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (namespace, key) DO UPDATE SET
         value = EXCLUDED.value,
         metadata = EXCLUDED.metadata,
         ttl = EXCLUDED.ttl,
         updated_at = NOW()
       RETURNING *`,
      [
        namespace,
        key,
        JSON.stringify(value),
        JSON.stringify(options?.metadata || {}),
        options?.ttl || null,
      ],
    );

    return this.mapCustomRecordRow(result.rows[0]);
  }

  async getRecord(
    namespace: string,
    key: string,
  ): Promise<StorageCustomRecord | null> {
    if (!this.pool) throw new Error("Pool not initialized");

    const result = await this.pool.query(
      `SELECT * FROM ${this.tableName("custom_records")}
       WHERE namespace = $1 AND key = $2`,
      [namespace, key],
    );

    return result.rows[0] ? this.mapCustomRecordRow(result.rows[0]) : null;
  }

  async deleteRecord(namespace: string, key: string): Promise<boolean> {
    if (!this.pool) throw new Error("Pool not initialized");

    const result = await this.pool.query(
      `DELETE FROM ${this.tableName("custom_records")}
       WHERE namespace = $1 AND key = $2`,
      [namespace, key],
    );

    return (result.rowCount || 0) > 0;
  }

  async listRecords(
    namespace: string,
    options?: QueryOptions,
  ): Promise<PaginatedResult<StorageCustomRecord>> {
    if (!this.pool) throw new Error("Pool not initialized");

    const limit = options?.limit || 100;
    const offset = options?.offset || 0;

    const countResult = await this.pool.query(
      `SELECT COUNT(*) FROM ${this.tableName("custom_records")} WHERE namespace = $1`,
      [namespace],
    );
    const total = parseInt(countResult.rows[0].count, 10);

    const result = await this.pool.query(
      `SELECT * FROM ${this.tableName("custom_records")}
       WHERE namespace = $1
       ORDER BY updated_at DESC
       LIMIT $2 OFFSET $3`,
      [namespace, limit, offset],
    );

    return {
      data: result.rows.map(this.mapCustomRecordRow),
      total,
      hasMore: offset + limit < total,
    };
  }

  async hasRecord(namespace: string, key: string): Promise<boolean> {
    if (!this.pool) throw new Error("Pool not initialized");

    const result = await this.pool.query(
      `SELECT 1 FROM ${this.tableName("custom_records")}
       WHERE namespace = $1 AND key = $2`,
      [namespace, key],
    );

    return (result.rowCount || 0) > 0;
  }

  async deleteNamespace(namespace: string): Promise<number> {
    if (!this.pool) throw new Error("Pool not initialized");

    const result = await this.pool.query(
      `DELETE FROM ${this.tableName("custom_records")} WHERE namespace = $1`,
      [namespace],
    );

    return result.rowCount || 0;
  }

  private mapCustomRecordRow(
    row: Record<string, unknown>,
  ): StorageCustomRecord {
    return {
      namespace: row.namespace as string,
      key: row.key as string,
      value: row.value as JsonValue,
      metadata: row.metadata as JsonObject | undefined,
      ttl: row.ttl as number | undefined,
      createdAt: new Date(row.created_at as string),
      updatedAt: new Date(row.updated_at as string),
    };
  }

  // ===== Utility Methods =====

  async getStats(): Promise<StorageStats> {
    if (!this.pool) throw new Error("Pool not initialized");

    const [threads, messages, runs, records] = await Promise.all([
      this.pool.query(`SELECT COUNT(*) FROM ${this.tableName("threads")}`),
      this.pool.query(`SELECT COUNT(*) FROM ${this.tableName("messages")}`),
      this.pool.query(
        `SELECT COUNT(*) FROM ${this.tableName("workflow_runs")}`,
      ),
      this.pool.query(
        `SELECT COUNT(*) FROM ${this.tableName("custom_records")}`,
      ),
    ]);

    return {
      threadCount: parseInt(threads.rows[0].count, 10),
      messageCount: parseInt(messages.rows[0].count, 10),
      workflowRunCount: parseInt(runs.rows[0].count, 10),
      customRecordCount: parseInt(records.rows[0].count, 10),
    };
  }

  async clearAll(): Promise<void> {
    if (!this.pool) throw new Error("Pool not initialized");

    await this.pool.query(`TRUNCATE ${this.tableName("messages")} CASCADE`);
    await this.pool.query(`TRUNCATE ${this.tableName("threads")} CASCADE`);
    await this.pool.query(`TRUNCATE ${this.tableName("workflow_runs")}`);
    await this.pool.query(`TRUNCATE ${this.tableName("custom_records")}`);

    logger.warn("[PostgresStorage] All data cleared");
  }
}
```

### 5.3 LibSQL (SQLite) Storage

```typescript
// src/lib/storage/libsqlStorage.ts

import type { Client } from "@libsql/client";
import { randomUUID } from "crypto";
import type {
  MastraStorage,
  StorageBackendType,
  StorageThread,
  StorageMessage,
  StorageWorkflowRun,
  StorageCustomRecord,
  StorageStats,
  StorageInitOptions,
  ThreadQueryOptions,
  MessageQueryOptions,
  WorkflowRunQueryOptions,
  QueryOptions,
  PaginatedResult,
  WorkflowRunStatus,
  StepRunResult,
  JsonValue,
  JsonObject,
} from "../types/storageTypes.js";
import { logger } from "../utils/logger.js";

/**
 * LibSQL storage configuration
 */
export type LibSQLStorageConfig = {
  /** Database URL (file path or remote URL) */
  url: string;
  /** Auth token for remote databases */
  authToken?: string;
  /** Table prefix */
  tablePrefix?: string;
};

/**
 * LibSQL (SQLite) storage implementation
 * Lightweight storage suitable for edge deployments and local development
 */
export class LibSQLStorage implements MastraStorage {
  readonly type: StorageBackendType = "libsql";

  private client: Client | null = null;
  private config: LibSQLStorageConfig;
  private tablePrefix: string;

  constructor(config: LibSQLStorageConfig) {
    this.config = config;
    this.tablePrefix = config.tablePrefix || "";
  }

  private tableName(name: string): string {
    return `${this.tablePrefix}${name}`;
  }

  // ===== Lifecycle Methods =====

  async init(options?: StorageInitOptions): Promise<void> {
    const { createClient } = await import("@libsql/client");

    this.client = createClient({
      url: this.config.url,
      authToken: this.config.authToken,
    });

    logger.info("[LibSQLStorage] Initializing LibSQL storage", {
      url: this.config.url.replace(/:[^:]*@/, ":***@"), // Mask credentials
    });

    if (options?.runMigrations !== false) {
      await this.runMigrations();
    }

    logger.info("[LibSQLStorage] LibSQL storage initialized");
  }

  private async runMigrations(): Promise<void> {
    if (!this.client) throw new Error("Client not initialized");

    // Create threads table
    await this.client.execute(`
      CREATE TABLE IF NOT EXISTS ${this.tableName("threads")} (
        id TEXT PRIMARY KEY,
        resource_id TEXT NOT NULL,
        title TEXT,
        metadata TEXT DEFAULT '{}',
        status TEXT DEFAULT 'active',
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now'))
      )
    `);

    // Create messages table
    await this.client.execute(`
      CREATE TABLE IF NOT EXISTS ${this.tableName("messages")} (
        id TEXT PRIMARY KEY,
        thread_id TEXT NOT NULL,
        role TEXT NOT NULL,
        content TEXT NOT NULL,
        type TEXT DEFAULT 'text',
        tool_info TEXT,
        metadata TEXT DEFAULT '{}',
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now')),
        FOREIGN KEY (thread_id) REFERENCES ${this.tableName("threads")}(id) ON DELETE CASCADE
      )
    `);

    // Create workflow_runs table
    await this.client.execute(`
      CREATE TABLE IF NOT EXISTS ${this.tableName("workflow_runs")} (
        id TEXT PRIMARY KEY,
        workflow_id TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'pending',
        trigger_data TEXT,
        output TEXT,
        error TEXT,
        step_results TEXT DEFAULT '{}',
        suspension_data TEXT,
        resource_id TEXT,
        thread_id TEXT,
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now')),
        FOREIGN KEY (thread_id) REFERENCES ${this.tableName("threads")}(id) ON DELETE SET NULL
      )
    `);

    // Create custom_records table
    await this.client.execute(`
      CREATE TABLE IF NOT EXISTS ${this.tableName("custom_records")} (
        namespace TEXT NOT NULL,
        key TEXT NOT NULL,
        value TEXT NOT NULL,
        metadata TEXT DEFAULT '{}',
        ttl INTEGER,
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now')),
        PRIMARY KEY (namespace, key)
      )
    `);

    // Create indexes
    await this.client.execute(`
      CREATE INDEX IF NOT EXISTS idx_threads_resource_id
      ON ${this.tableName("threads")}(resource_id)
    `);
    await this.client.execute(`
      CREATE INDEX IF NOT EXISTS idx_messages_thread_id
      ON ${this.tableName("messages")}(thread_id)
    `);
    await this.client.execute(`
      CREATE INDEX IF NOT EXISTS idx_workflow_runs_workflow_id
      ON ${this.tableName("workflow_runs")}(workflow_id)
    `);

    logger.info("[LibSQLStorage] Migrations completed");
  }

  async close(): Promise<void> {
    if (this.client) {
      this.client.close();
      this.client = null;
    }
    logger.info("[LibSQLStorage] Connection closed");
  }

  async healthCheck(): Promise<boolean> {
    if (!this.client) return false;
    try {
      await this.client.execute("SELECT 1");
      return true;
    } catch (error) {
      logger.error("[LibSQLStorage] Health check failed", { error });
      return false;
    }
  }

  // Thread, Message, Workflow, and Custom Record operations follow
  // similar patterns to PostgreSQL but with SQLite-specific syntax...
  // (Implementation abbreviated for document length)

  async createThread(
    thread: Omit<StorageThread, "id" | "createdAt" | "updatedAt">,
  ): Promise<StorageThread> {
    if (!this.client) throw new Error("Client not initialized");

    const id = randomUUID();
    const now = new Date().toISOString();

    await this.client.execute({
      sql: `INSERT INTO ${this.tableName("threads")}
            (id, resource_id, title, metadata, status, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?)`,
      args: [
        id,
        thread.resourceId,
        thread.title || null,
        JSON.stringify(thread.metadata || {}),
        thread.status || "active",
        now,
        now,
      ],
    });

    return {
      id,
      resourceId: thread.resourceId,
      title: thread.title,
      metadata: thread.metadata,
      status: thread.status || "active",
      createdAt: new Date(now),
      updatedAt: new Date(now),
    };
  }

  // ... Additional methods follow same pattern as PostgresStorage
  // with SQLite-specific query syntax

  async getThread(threadId: string): Promise<StorageThread | null> {
    if (!this.client) throw new Error("Client not initialized");

    const result = await this.client.execute({
      sql: `SELECT * FROM ${this.tableName("threads")} WHERE id = ?`,
      args: [threadId],
    });

    if (result.rows.length === 0) return null;
    return this.mapThreadRow(result.rows[0] as Record<string, unknown>);
  }

  private mapThreadRow(row: Record<string, unknown>): StorageThread {
    return {
      id: row.id as string,
      resourceId: row.resource_id as string,
      title: row.title as string | undefined,
      metadata: row.metadata ? JSON.parse(row.metadata as string) : undefined,
      status: row.status as StorageThread["status"],
      createdAt: new Date(row.created_at as string),
      updatedAt: new Date(row.updated_at as string),
    };
  }

  // Placeholder implementations for required interface methods
  async updateThread(
    threadId: string,
    updates: Partial<Omit<StorageThread, "id" | "createdAt">>,
  ): Promise<StorageThread | null> {
    // Implementation follows PostgreSQL pattern with SQLite syntax
    throw new Error(
      "Method not implemented - see PostgreSQL implementation pattern",
    );
  }

  async deleteThread(threadId: string): Promise<boolean> {
    if (!this.client) throw new Error("Client not initialized");
    const result = await this.client.execute({
      sql: `DELETE FROM ${this.tableName("threads")} WHERE id = ?`,
      args: [threadId],
    });
    return (result.rowsAffected || 0) > 0;
  }

  async listThreads(
    options?: ThreadQueryOptions,
  ): Promise<PaginatedResult<StorageThread>> {
    // Implementation follows PostgreSQL pattern
    throw new Error(
      "Method not implemented - see PostgreSQL implementation pattern",
    );
  }

  async getThreadsByResourceId(
    resourceId: string,
    options?: QueryOptions,
  ): Promise<PaginatedResult<StorageThread>> {
    return this.listThreads({ ...options, resourceId });
  }

  async createMessage(
    message: Omit<StorageMessage, "id" | "createdAt" | "updatedAt">,
  ): Promise<StorageMessage> {
    throw new Error(
      "Method not implemented - see PostgreSQL implementation pattern",
    );
  }

  async createMessages(
    messages: Omit<StorageMessage, "id" | "createdAt" | "updatedAt">[],
  ): Promise<StorageMessage[]> {
    throw new Error(
      "Method not implemented - see PostgreSQL implementation pattern",
    );
  }

  async getMessage(messageId: string): Promise<StorageMessage | null> {
    throw new Error(
      "Method not implemented - see PostgreSQL implementation pattern",
    );
  }

  async updateMessage(
    messageId: string,
    updates: Partial<Omit<StorageMessage, "id" | "threadId" | "createdAt">>,
  ): Promise<StorageMessage | null> {
    throw new Error(
      "Method not implemented - see PostgreSQL implementation pattern",
    );
  }

  async deleteMessage(messageId: string): Promise<boolean> {
    throw new Error(
      "Method not implemented - see PostgreSQL implementation pattern",
    );
  }

  async listMessages(
    options: MessageQueryOptions,
  ): Promise<PaginatedResult<StorageMessage>> {
    throw new Error(
      "Method not implemented - see PostgreSQL implementation pattern",
    );
  }

  async getMessagesByThreadId(
    threadId: string,
    options?: QueryOptions,
  ): Promise<StorageMessage[]> {
    throw new Error(
      "Method not implemented - see PostgreSQL implementation pattern",
    );
  }

  async deleteMessagesByThreadId(threadId: string): Promise<number> {
    throw new Error(
      "Method not implemented - see PostgreSQL implementation pattern",
    );
  }

  async saveWorkflowRun(
    run: Omit<StorageWorkflowRun, "createdAt" | "updatedAt"> & { id?: string },
  ): Promise<StorageWorkflowRun> {
    throw new Error(
      "Method not implemented - see PostgreSQL implementation pattern",
    );
  }

  async getWorkflowRun(runId: string): Promise<StorageWorkflowRun | null> {
    throw new Error(
      "Method not implemented - see PostgreSQL implementation pattern",
    );
  }

  async listWorkflowRuns(
    options?: WorkflowRunQueryOptions,
  ): Promise<PaginatedResult<StorageWorkflowRun>> {
    throw new Error(
      "Method not implemented - see PostgreSQL implementation pattern",
    );
  }

  async updateWorkflowRunStatus(
    runId: string,
    status: WorkflowRunStatus,
    output?: JsonValue,
    error?: StorageWorkflowRun["error"],
  ): Promise<StorageWorkflowRun | null> {
    throw new Error(
      "Method not implemented - see PostgreSQL implementation pattern",
    );
  }

  async updateStepResult(
    runId: string,
    stepId: string,
    result: StepRunResult,
  ): Promise<boolean> {
    throw new Error(
      "Method not implemented - see PostgreSQL implementation pattern",
    );
  }

  async getWorkflowRunsByWorkflowId(
    workflowId: string,
    options?: QueryOptions,
  ): Promise<PaginatedResult<StorageWorkflowRun>> {
    throw new Error(
      "Method not implemented - see PostgreSQL implementation pattern",
    );
  }

  async setRecord(
    namespace: string,
    key: string,
    value: JsonValue,
    options?: { ttl?: number; metadata?: JsonObject },
  ): Promise<StorageCustomRecord> {
    throw new Error(
      "Method not implemented - see PostgreSQL implementation pattern",
    );
  }

  async getRecord(
    namespace: string,
    key: string,
  ): Promise<StorageCustomRecord | null> {
    throw new Error(
      "Method not implemented - see PostgreSQL implementation pattern",
    );
  }

  async deleteRecord(namespace: string, key: string): Promise<boolean> {
    throw new Error(
      "Method not implemented - see PostgreSQL implementation pattern",
    );
  }

  async listRecords(
    namespace: string,
    options?: QueryOptions,
  ): Promise<PaginatedResult<StorageCustomRecord>> {
    throw new Error(
      "Method not implemented - see PostgreSQL implementation pattern",
    );
  }

  async hasRecord(namespace: string, key: string): Promise<boolean> {
    throw new Error(
      "Method not implemented - see PostgreSQL implementation pattern",
    );
  }

  async deleteNamespace(namespace: string): Promise<number> {
    throw new Error(
      "Method not implemented - see PostgreSQL implementation pattern",
    );
  }

  async getStats(): Promise<StorageStats> {
    throw new Error(
      "Method not implemented - see PostgreSQL implementation pattern",
    );
  }

  async clearAll(): Promise<void> {
    if (!this.client) throw new Error("Client not initialized");
    await this.client.execute(`DELETE FROM ${this.tableName("messages")}`);
    await this.client.execute(`DELETE FROM ${this.tableName("threads")}`);
    await this.client.execute(`DELETE FROM ${this.tableName("workflow_runs")}`);
    await this.client.execute(
      `DELETE FROM ${this.tableName("custom_records")}`,
    );
    logger.warn("[LibSQLStorage] All data cleared");
  }
}
```

---

## 6. Migration System

### 6.1 Migration Types

```typescript
// src/lib/storage/migrations/types.ts

/**
 * Migration definition
 */
export type Migration = {
  /** Migration version number */
  version: number;
  /** Migration name */
  name: string;
  /** Migration description */
  description?: string;
  /** SQL statements to apply migration */
  up: string[];
  /** SQL statements to rollback migration */
  down: string[];
};

/**
 * Migration status record
 */
export type MigrationStatus = {
  version: number;
  name: string;
  appliedAt: Date;
  checksum?: string;
};

/**
 * Migration runner options
 */
export type MigrationRunnerOptions = {
  /** Target version (null = latest) */
  targetVersion?: number | null;
  /** Dry run mode - don't actually apply */
  dryRun?: boolean;
  /** Force migration even if checksum mismatch */
  force?: boolean;
};
```

### 6.2 Migration Runner

```typescript
// src/lib/storage/migrations/runner.ts

import type { MastraStorage } from "../../types/storageTypes.js";
import type {
  Migration,
  MigrationStatus,
  MigrationRunnerOptions,
} from "./types.js";
import { logger } from "../../utils/logger.js";
import { createHash } from "crypto";

/**
 * Migrations for the storage schema
 */
const MIGRATIONS: Migration[] = [
  {
    version: 1,
    name: "initial_schema",
    description:
      "Create initial tables for threads, messages, workflow_runs, and custom_records",
    up: [
      // Tables created in storage init()
      "SELECT 1", // Placeholder - actual DDL in storage implementations
    ],
    down: [
      "DROP TABLE IF EXISTS custom_records",
      "DROP TABLE IF EXISTS workflow_runs",
      "DROP TABLE IF EXISTS messages",
      "DROP TABLE IF EXISTS threads",
    ],
  },
  {
    version: 2,
    name: "add_message_embedding",
    description: "Add embedding column for semantic search",
    up: [
      "ALTER TABLE messages ADD COLUMN IF NOT EXISTS embedding VECTOR(1536)",
      "CREATE INDEX IF NOT EXISTS idx_messages_embedding ON messages USING ivfflat (embedding vector_cosine_ops)",
    ],
    down: [
      "DROP INDEX IF EXISTS idx_messages_embedding",
      "ALTER TABLE messages DROP COLUMN IF EXISTS embedding",
    ],
  },
  {
    version: 3,
    name: "add_thread_summary",
    description: "Add summary fields to threads for context compression",
    up: [
      "ALTER TABLE threads ADD COLUMN IF NOT EXISTS summary TEXT",
      "ALTER TABLE threads ADD COLUMN IF NOT EXISTS summarized_up_to TEXT",
    ],
    down: [
      "ALTER TABLE threads DROP COLUMN IF EXISTS summary",
      "ALTER TABLE threads DROP COLUMN IF EXISTS summarized_up_to",
    ],
  },
];

/**
 * Migration runner for storage schema management
 */
export class MigrationRunner {
  private storage: MastraStorage;

  constructor(storage: MastraStorage) {
    this.storage = storage;
  }

  /**
   * Get current migration version
   */
  async getCurrentVersion(): Promise<number> {
    const record = await this.storage.getRecord(
      "_migrations",
      "current_version",
    );
    return record ? (record.value as number) : 0;
  }

  /**
   * Get list of applied migrations
   */
  async getAppliedMigrations(): Promise<MigrationStatus[]> {
    const result = await this.storage.listRecords("_migrations");
    return result.data
      .filter((r) => r.key !== "current_version")
      .map((r) => ({
        version: parseInt(r.key.replace("migration_", ""), 10),
        name: (r.value as { name: string }).name,
        appliedAt: r.createdAt,
        checksum: (r.value as { checksum?: string }).checksum,
      }))
      .sort((a, b) => a.version - b.version);
  }

  /**
   * Run pending migrations
   */
  async migrate(options: MigrationRunnerOptions = {}): Promise<void> {
    const currentVersion = await this.getCurrentVersion();
    const targetVersion = options.targetVersion ?? MIGRATIONS.length;

    logger.info("[MigrationRunner] Starting migration", {
      currentVersion,
      targetVersion,
      dryRun: options.dryRun,
    });

    if (targetVersion > currentVersion) {
      // Forward migration
      for (const migration of MIGRATIONS) {
        if (
          migration.version > currentVersion &&
          migration.version <= targetVersion
        ) {
          await this.applyMigration(migration, options);
        }
      }
    } else if (targetVersion < currentVersion) {
      // Rollback
      for (let i = MIGRATIONS.length - 1; i >= 0; i--) {
        const migration = MIGRATIONS[i];
        if (
          migration.version <= currentVersion &&
          migration.version > targetVersion
        ) {
          await this.rollbackMigration(migration, options);
        }
      }
    }

    logger.info("[MigrationRunner] Migration complete", {
      finalVersion: await this.getCurrentVersion(),
    });
  }

  private async applyMigration(
    migration: Migration,
    options: MigrationRunnerOptions,
  ): Promise<void> {
    logger.info(
      `[MigrationRunner] Applying migration ${migration.version}: ${migration.name}`,
    );

    if (options.dryRun) {
      logger.info("[MigrationRunner] DRY RUN - would execute:", migration.up);
      return;
    }

    // Note: Actual SQL execution would depend on storage backend
    // For now, we track migration in custom records
    const checksum = this.computeChecksum(migration);

    await this.storage.setRecord(
      "_migrations",
      `migration_${migration.version}`,
      {
        name: migration.name,
        checksum,
        appliedAt: new Date().toISOString(),
      },
    );

    await this.storage.setRecord(
      "_migrations",
      "current_version",
      migration.version,
    );
  }

  private async rollbackMigration(
    migration: Migration,
    options: MigrationRunnerOptions,
  ): Promise<void> {
    logger.info(
      `[MigrationRunner] Rolling back migration ${migration.version}: ${migration.name}`,
    );

    if (options.dryRun) {
      logger.info("[MigrationRunner] DRY RUN - would execute:", migration.down);
      return;
    }

    await this.storage.deleteRecord(
      "_migrations",
      `migration_${migration.version}`,
    );
    await this.storage.setRecord(
      "_migrations",
      "current_version",
      migration.version - 1,
    );
  }

  private computeChecksum(migration: Migration): string {
    const content = JSON.stringify({ up: migration.up, down: migration.down });
    return createHash("sha256").update(content).digest("hex").substring(0, 16);
  }
}
```

---

## 7. Thread and Message Operations

### 7.1 Thread Manager

```typescript
// src/lib/storage/threadManager.ts

import type {
  MastraStorage,
  StorageThread,
  StorageMessage,
  QueryOptions,
} from "../types/storageTypes.js";
import type { ChatMessage } from "../types/conversation.js";
import { logger } from "../utils/logger.js";

/**
 * Thread manager provides high-level operations for thread-based conversations
 */
export class ThreadManager {
  constructor(private storage: MastraStorage) {}

  /**
   * Create a new conversation thread
   */
  async createThread(
    resourceId: string,
    options?: {
      title?: string;
      metadata?: Record<string, unknown>;
    },
  ): Promise<StorageThread> {
    const thread = await this.storage.createThread({
      resourceId,
      title: options?.title,
      metadata: options?.metadata,
      status: "active",
    });

    logger.debug("[ThreadManager] Created thread", {
      threadId: thread.id,
      resourceId,
    });

    return thread;
  }

  /**
   * Add messages to a thread
   */
  async addMessages(
    threadId: string,
    messages: Array<{
      role: StorageMessage["role"];
      content: string;
      metadata?: Record<string, unknown>;
    }>,
  ): Promise<StorageMessage[]> {
    const storageMessages = messages.map((m) => ({
      threadId,
      role: m.role,
      content: m.content,
      type: "text" as const,
      metadata: m.metadata,
    }));

    const created = await this.storage.createMessages(storageMessages);

    // Update thread timestamp
    await this.storage.updateThread(threadId, {});

    logger.debug("[ThreadManager] Added messages", {
      threadId,
      count: created.length,
    });

    return created;
  }

  /**
   * Get conversation context for AI generation
   * Returns messages formatted for the AI provider
   */
  async getContext(
    threadId: string,
    options?: {
      limit?: number;
      includeSystemMessages?: boolean;
    },
  ): Promise<ChatMessage[]> {
    const messages = await this.storage.getMessagesByThreadId(threadId, {
      limit: options?.limit || 50,
    });

    // Filter and transform to ChatMessage format
    let filtered = messages;
    if (!options?.includeSystemMessages) {
      filtered = messages.filter((m) => m.role !== "system");
    }

    return filtered.map((m) => ({
      id: m.id,
      role: m.role as ChatMessage["role"],
      content: m.content,
      timestamp: m.createdAt.toISOString(),
      metadata: m.metadata,
    }));
  }

  /**
   * Archive a thread
   */
  async archiveThread(threadId: string): Promise<void> {
    await this.storage.updateThread(threadId, { status: "archived" });
    logger.debug("[ThreadManager] Archived thread", { threadId });
  }

  /**
   * Get threads for a resource (e.g., user)
   */
  async getThreadsForResource(
    resourceId: string,
    options?: QueryOptions,
  ): Promise<StorageThread[]> {
    const result = await this.storage.getThreadsByResourceId(
      resourceId,
      options,
    );
    return result.data;
  }
}
```

---

## 8. Workflow Run Storage

### 8.1 Workflow Persistence Manager

```typescript
// src/lib/storage/workflowPersistence.ts

import type {
  MastraStorage,
  StorageWorkflowRun,
  StepRunResult,
  WorkflowRunStatus,
  JsonValue,
} from "../types/storageTypes.js";
import { logger } from "../utils/logger.js";

/**
 * Workflow persistence manager for durable workflow execution
 */
export class WorkflowPersistenceManager {
  constructor(private storage: MastraStorage) {}

  /**
   * Start a new workflow run
   */
  async startRun(
    workflowId: string,
    triggerData?: Record<string, unknown>,
    options?: {
      resourceId?: string;
      threadId?: string;
    },
  ): Promise<StorageWorkflowRun> {
    const run = await this.storage.saveWorkflowRun({
      workflowId,
      status: "pending",
      triggerData,
      stepResults: {},
      resourceId: options?.resourceId,
      threadId: options?.threadId,
    });

    logger.info("[WorkflowPersistence] Started workflow run", {
      runId: run.id,
      workflowId,
    });

    return run;
  }

  /**
   * Update run to running status
   */
  async markRunning(runId: string): Promise<void> {
    await this.storage.updateWorkflowRunStatus(runId, "running");
  }

  /**
   * Record step start
   */
  async recordStepStart(runId: string, stepId: string): Promise<void> {
    await this.storage.updateStepResult(runId, stepId, {
      stepId,
      status: "running",
      startedAt: new Date(),
    });
  }

  /**
   * Record step completion
   */
  async recordStepComplete(
    runId: string,
    stepId: string,
    output: JsonValue,
  ): Promise<void> {
    await this.storage.updateStepResult(runId, stepId, {
      stepId,
      status: "completed",
      output,
      completedAt: new Date(),
    });
  }

  /**
   * Record step failure
   */
  async recordStepFailure(
    runId: string,
    stepId: string,
    error: string,
  ): Promise<void> {
    await this.storage.updateStepResult(runId, stepId, {
      stepId,
      status: "failed",
      error,
      completedAt: new Date(),
    });
  }

  /**
   * Complete a workflow run successfully
   */
  async completeRun(runId: string, output: JsonValue): Promise<void> {
    await this.storage.updateWorkflowRunStatus(runId, "completed", output);
    logger.info("[WorkflowPersistence] Completed workflow run", { runId });
  }

  /**
   * Fail a workflow run
   */
  async failRun(
    runId: string,
    error: { code: string; message: string; details?: Record<string, unknown> },
  ): Promise<void> {
    await this.storage.updateWorkflowRunStatus(
      runId,
      "failed",
      undefined,
      error,
    );
    logger.error("[WorkflowPersistence] Failed workflow run", { runId, error });
  }

  /**
   * Suspend a workflow run (for HITL or external wait)
   */
  async suspendRun(
    runId: string,
    stepId: string,
    reason: string,
    resumeData?: Record<string, unknown>,
  ): Promise<void> {
    const run = await this.storage.getWorkflowRun(runId);
    if (!run) throw new Error(`Workflow run ${runId} not found`);

    await this.storage.saveWorkflowRun({
      ...run,
      status: "suspended",
      suspensionData: {
        stepId,
        reason,
        resumeData,
      },
    });

    logger.info("[WorkflowPersistence] Suspended workflow run", {
      runId,
      stepId,
      reason,
    });
  }

  /**
   * Resume a suspended workflow run
   */
  async resumeRun(
    runId: string,
    resumeInput?: Record<string, unknown>,
  ): Promise<StorageWorkflowRun> {
    const run = await this.storage.getWorkflowRun(runId);
    if (!run) throw new Error(`Workflow run ${runId} not found`);
    if (run.status !== "suspended") {
      throw new Error(`Workflow run ${runId} is not suspended`);
    }

    const updated = await this.storage.saveWorkflowRun({
      ...run,
      status: "running",
      suspensionData: undefined,
      triggerData: {
        ...run.triggerData,
        _resumeInput: resumeInput,
      },
    });

    logger.info("[WorkflowPersistence] Resumed workflow run", { runId });

    return updated!;
  }

  /**
   * Get run history for a workflow
   */
  async getRunHistory(
    workflowId: string,
    limit?: number,
  ): Promise<StorageWorkflowRun[]> {
    const result = await this.storage.getWorkflowRunsByWorkflowId(workflowId, {
      limit: limit || 20,
    });
    return result.data;
  }
}
```

---

## 9. Custom Record Storage

### 9.1 Key-Value Store Wrapper

```typescript
// src/lib/storage/keyValueStore.ts

import type {
  MastraStorage,
  JsonValue,
  JsonObject,
} from "../types/storageTypes.js";

/**
 * Type-safe key-value store wrapper
 */
export class KeyValueStore<T extends JsonValue = JsonValue> {
  constructor(
    private storage: MastraStorage,
    private namespace: string,
  ) {}

  /**
   * Get a value by key
   */
  async get(key: string): Promise<T | null> {
    const record = await this.storage.getRecord(this.namespace, key);
    return record ? (record.value as T) : null;
  }

  /**
   * Set a value
   */
  async set(
    key: string,
    value: T,
    options?: { ttl?: number; metadata?: JsonObject },
  ): Promise<void> {
    await this.storage.setRecord(this.namespace, key, value, options);
  }

  /**
   * Delete a key
   */
  async delete(key: string): Promise<boolean> {
    return this.storage.deleteRecord(this.namespace, key);
  }

  /**
   * Check if key exists
   */
  async has(key: string): Promise<boolean> {
    return this.storage.hasRecord(this.namespace, key);
  }

  /**
   * Get all keys in namespace
   */
  async keys(): Promise<string[]> {
    const result = await this.storage.listRecords(this.namespace, {
      limit: 1000,
    });
    return result.data.map((r) => r.key);
  }

  /**
   * Get all values in namespace
   */
  async values(): Promise<T[]> {
    const result = await this.storage.listRecords(this.namespace, {
      limit: 1000,
    });
    return result.data.map((r) => r.value as T);
  }

  /**
   * Clear all records in namespace
   */
  async clear(): Promise<number> {
    return this.storage.deleteNamespace(this.namespace);
  }
}

/**
 * Create a typed key-value store
 */
export function createKeyValueStore<T extends JsonValue>(
  storage: MastraStorage,
  namespace: string,
): KeyValueStore<T> {
  return new KeyValueStore<T>(storage, namespace);
}
```

---

## 10. Integration with NeuroLink

### 10.1 Storage Factory

```typescript
// src/lib/storage/storageFactory.ts

import type {
  MastraStorage,
  StorageBackendType,
} from "../types/storageTypes.js";
import { MemoryStorage } from "./memoryStorage.js";
import type { PostgresStorageConfig } from "./postgresStorage.js";
import type { LibSQLStorageConfig } from "./libsqlStorage.js";
import { logger } from "../utils/logger.js";

/**
 * Storage configuration union type
 */
export type StorageConfig =
  | { type: "memory" }
  | { type: "postgresql"; config: PostgresStorageConfig }
  | { type: "libsql"; config: LibSQLStorageConfig }
  | { type: "redis"; config: { url: string; keyPrefix?: string } };

/**
 * Create a storage instance based on configuration
 */
export async function createStorage(
  config: StorageConfig,
): Promise<MastraStorage> {
  logger.info("[StorageFactory] Creating storage", { type: config.type });

  switch (config.type) {
    case "memory":
      const memoryStorage = new MemoryStorage();
      await memoryStorage.init();
      return memoryStorage;

    case "postgresql": {
      const { PostgresStorage } = await import("./postgresStorage.js");
      const pgStorage = new PostgresStorage(config.config);
      await pgStorage.init();
      return pgStorage;
    }

    case "libsql": {
      const { LibSQLStorage } = await import("./libsqlStorage.js");
      const sqliteStorage = new LibSQLStorage(config.config);
      await sqliteStorage.init();
      return sqliteStorage;
    }

    default:
      throw new Error(
        `Unknown storage type: ${(config as StorageConfig).type}`,
      );
  }
}

/**
 * Get storage configuration from environment variables
 */
export function getStorageConfigFromEnv(): StorageConfig {
  const storageType = (process.env.NEUROLINK_STORAGE_TYPE ||
    "memory") as StorageBackendType;

  switch (storageType) {
    case "postgresql":
      return {
        type: "postgresql",
        config: {
          connection:
            process.env.NEUROLINK_POSTGRES_URL ||
            "postgresql://localhost:5432/neurolink",
          schema: process.env.NEUROLINK_POSTGRES_SCHEMA || "neurolink",
        },
      };

    case "libsql":
      return {
        type: "libsql",
        config: {
          url: process.env.NEUROLINK_LIBSQL_URL || "file:./neurolink.db",
          authToken: process.env.NEUROLINK_LIBSQL_AUTH_TOKEN,
        },
      };

    case "memory":
    default:
      return { type: "memory" };
  }
}
```

### 10.2 NeuroLink Integration

```typescript
// Example integration in src/lib/neurolink.ts

import type { MastraStorage } from "./types/storageTypes.js";
import {
  createStorage,
  getStorageConfigFromEnv,
} from "./storage/storageFactory.js";
import { ThreadManager } from "./storage/threadManager.js";
import { WorkflowPersistenceManager } from "./storage/workflowPersistence.js";

// Add to NeuroLink class
export class NeuroLink {
  private storage?: MastraStorage;
  private threadManager?: ThreadManager;
  private workflowPersistence?: WorkflowPersistenceManager;

  // ... existing code ...

  /**
   * Initialize storage system
   */
  async initStorage(config?: StorageConfig): Promise<void> {
    const storageConfig = config || getStorageConfigFromEnv();
    this.storage = await createStorage(storageConfig);
    this.threadManager = new ThreadManager(this.storage);
    this.workflowPersistence = new WorkflowPersistenceManager(this.storage);
  }

  /**
   * Get the storage instance
   */
  getStorage(): MastraStorage | undefined {
    return this.storage;
  }

  /**
   * Get the thread manager
   */
  getThreadManager(): ThreadManager | undefined {
    return this.threadManager;
  }

  /**
   * Get the workflow persistence manager
   */
  getWorkflowPersistence(): WorkflowPersistenceManager | undefined {
    return this.workflowPersistence;
  }
}
```

---

## 11. Code Examples

### 11.1 Basic Usage

```typescript
import { NeuroLink } from "neurolink";

// Initialize with PostgreSQL storage
const neurolink = new NeuroLink();
await neurolink.initStorage({
  type: "postgresql",
  config: {
    connection: "postgresql://user:pass@localhost:5432/myapp",
    schema: "neurolink",
  },
});

// Create a conversation thread
const threadManager = neurolink.getThreadManager()!;
const thread = await threadManager.createThread("user-123", {
  title: "Technical Support",
  metadata: { department: "engineering" },
});

// Add messages
await threadManager.addMessages(thread.id, [
  { role: "user", content: "How do I deploy to production?" },
  { role: "assistant", content: "Here are the deployment steps..." },
]);

// Get context for AI generation
const context = await threadManager.getContext(thread.id);

// Generate with context
const response = await neurolink.generate({
  input: { text: "What about rollback procedures?" },
  provider: "openai",
  model: "gpt-4o",
  context: {
    messages: context,
    threadId: thread.id,
  },
});
```

### 11.2 Workflow Persistence

```typescript
import { NeuroLink } from "neurolink";

const neurolink = new NeuroLink();
await neurolink.initStorage({ type: "memory" });

const persistence = neurolink.getWorkflowPersistence()!;

// Start a workflow run
const run = await persistence.startRun("document-processing", {
  documentId: "doc-456",
  action: "summarize",
});

// Record step progress
await persistence.markRunning(run.id);
await persistence.recordStepStart(run.id, "extract-text");

// ... execute step ...

await persistence.recordStepComplete(run.id, "extract-text", {
  text: "Extracted content...",
  pages: 5,
});

// Complete workflow
await persistence.completeRun(run.id, {
  summary: "Document summary...",
  keyPoints: ["point 1", "point 2"],
});
```

### 11.3 Custom Key-Value Storage

```typescript
import { NeuroLink } from "neurolink";
import { createKeyValueStore } from "neurolink/storage";

const neurolink = new NeuroLink();
await neurolink.initStorage({
  type: "libsql",
  config: { url: "file:./app.db" },
});

// Create typed key-value store for user preferences
type UserPreferences = {
  theme: "light" | "dark";
  language: string;
  notifications: boolean;
};

const prefsStore = createKeyValueStore<UserPreferences>(
  neurolink.getStorage()!,
  "user-preferences",
);

// Set preferences
await prefsStore.set("user-123", {
  theme: "dark",
  language: "en",
  notifications: true,
});

// Get preferences
const prefs = await prefsStore.get("user-123");
console.log(prefs?.theme); // "dark"
```

---

## 12. Implementation Plan

### Phase 1: Core Infrastructure (Week 1-2)

| Task                                  | Priority | Effort |
| ------------------------------------- | -------- | ------ |
| Define `MastraStorage` interface      | High     | 2 days |
| Implement `MemoryStorage`             | High     | 2 days |
| Create storage factory                | High     | 1 day  |
| Add storage types to `src/lib/types/` | High     | 1 day  |
| Write unit tests                      | High     | 2 days |

### Phase 2: PostgreSQL Support (Week 3-4)

| Task                        | Priority | Effort |
| --------------------------- | -------- | ------ |
| Implement `PostgresStorage` | High     | 3 days |
| Add migration system        | High     | 2 days |
| Create connection pooling   | Medium   | 1 day  |
| Write integration tests     | High     | 2 days |

### Phase 3: LibSQL/SQLite Support (Week 5)

| Task                                    | Priority | Effort |
| --------------------------------------- | -------- | ------ |
| Implement `LibSQLStorage`               | Medium   | 2 days |
| Test edge deployment scenarios          | Medium   | 1 day  |
| Document SQLite-specific considerations | Low      | 1 day  |

### Phase 4: Integration (Week 6)

| Task                           | Priority | Effort |
| ------------------------------ | -------- | ------ |
| Integrate with NeuroLink class | High     | 2 days |
| Add thread manager             | High     | 1 day  |
| Add workflow persistence       | Medium   | 2 days |
| Update documentation           | High     | 1 day  |

### Phase 5: Advanced Features (Week 7-8)

| Task                            | Priority | Effort |
| ------------------------------- | -------- | ------ |
| Implement Redis storage adapter | Medium   | 2 days |
| Add MongoDB support             | Low      | 3 days |
| Implement query filtering       | Medium   | 2 days |
| Performance optimization        | Medium   | 2 days |

---

## File Structure

```
src/lib/
├── types/
│   └── storageTypes.ts           # Storage type definitions
├── storage/
│   ├── index.ts                  # Public exports
│   ├── memoryStorage.ts          # In-memory implementation
│   ├── postgresStorage.ts        # PostgreSQL implementation
│   ├── libsqlStorage.ts          # LibSQL/SQLite implementation
│   ├── redisStorage.ts           # Redis implementation (enhanced)
│   ├── mongoStorage.ts           # MongoDB implementation
│   ├── storageFactory.ts         # Factory for creating storage
│   ├── threadManager.ts          # Thread management
│   ├── workflowPersistence.ts    # Workflow run persistence
│   ├── keyValueStore.ts          # Key-value store wrapper
│   └── migrations/
│       ├── types.ts              # Migration types
│       ├── runner.ts             # Migration runner
│       └── versions/             # Migration files
│           ├── v001_initial.ts
│           ├── v002_embeddings.ts
│           └── v003_summaries.ts
└── neurolink.ts                  # Updated with storage integration
```

---

## Summary

This implementation guide provides a comprehensive blueprint for adding Mastra-style storage abstraction to NeuroLink. The key components include:

1. **MastraStorage Interface**: A unified API for all storage operations covering threads, messages, workflow runs, and custom records.

2. **Multiple Backend Support**: Implementations for PostgreSQL, LibSQL (SQLite), MongoDB, Redis, and in-memory storage.

3. **Thread-Based Organization**: Messages organized by threads with resource scoping for multi-tenant applications.

4. **Workflow Persistence**: Durable storage for workflow executions with step-level tracking and suspension/resumption support.

5. **Migration System**: Schema versioning with automatic migrations for production deployments.

6. **Backward Compatibility**: Existing conversation memory system continues to work alongside the new storage abstraction.

The implementation follows NeuroLink's existing patterns (factory pattern, async-first, TypeScript types) while adding the flexibility and power of a unified storage system.
