---
title: Memory Guide
description: Per-user condensed memory that persists across conversations using the @juspay/hippocampus SDK
keywords:
  [
    memory,
    condensed-memory,
    per-user-memory,
    conversation-memory,
    long-term-memory,
    s3,
    redis,
    sqlite,
    custom-storage,
  ]
---

# Memory Guide

> **Since**: v9.12.0 | **Status**: Stable | **Availability**: SDK

## Overview

NeuroLink includes a **memory engine** powered by the `@juspay/hippocampus` SDK. Unlike conversation memory (which tracks recent turns in a session), memory maintains a **condensed summary** of durable facts about each user across all conversations.

Key characteristics:

- **Per-user**: Each user gets an independent memory store keyed by `userId`
- **Condensed**: Memory is kept to a configurable word limit (default 50 words) via LLM-powered condensation
- **Persistent**: Stored in S3, Redis, SQLite, or a custom backend — survives server restarts
- **Non-blocking**: Memory storage happens in the background after each generate/stream call
- **Crash-safe**: Every SDK method is wrapped in try-catch — errors are logged, never thrown

## How It Works

```
User prompt arrives
       │
       ▼
 ┌─────────────┐
 │ memory.get() │ ← Retrieve condensed memory for this userId
 └──────┬──────┘
        │ Prepend memory context to prompt
        ▼
 ┌─────────────┐
 │  LLM call   │ ← generate() or stream() as normal
 └──────┬──────┘
        │
        ▼
 ┌──────────────┐
 │ memory.add() │ ← In background: condense old memory + new turn via LLM
 └──────────────┘
```

On each `generate()` or `stream()` call:

1. **Retrieve**: `memory.get(userId)` fetches the user's condensed memory (if any)
2. **Inject**: The memory is prepended to the user's prompt as context
3. **Generate**: The LLM processes the enhanced prompt normally
4. **Store**: After the response completes, `memory.add(userId, content)` runs in the background. The SDK sends the old memory + new conversation turn to an LLM which produces a new condensed summary

## Quick Start

```typescript
import { NeuroLink } from "@juspay/neurolink";

const neurolink = new NeuroLink({
  conversationMemory: {
    enabled: true,
    memory: {
      enabled: true,
      storage: {
        type: "s3",
        bucket: "my-memory-bucket",
        prefix: "memory/condensed/",
      },
      neurolink: {
        provider: "google-ai",
        model: "gemini-2.5-flash",
      },
      maxWords: 50,
    },
  },
});

// Memory is automatically retrieved and stored on each call
const result = await neurolink.generate({
  input: { text: "My name is Alice and I run a Shopify store." },
  context: { userId: "user-123" },
});

// Next call — the AI already knows about Alice
const result2 = await neurolink.generate({
  input: { text: "What platform do I use?" },
  context: { userId: "user-123" },
});
// → "You use Shopify."
```

## Configuration

The `memory` field on `conversationMemory` accepts a `Memory` object:

```typescript
type Memory = HippocampusConfig & { enabled?: boolean };
```

### Required Fields

| Field                | Type    | Description                                                   |
| -------------------- | ------- | ------------------------------------------------------------- |
| `enabled`            | boolean | Set `true` to activate memory                                 |
| `storage.type`       | string  | Storage backend: `"s3"`, `"redis"`, `"sqlite"`, or `"custom"` |
| `neurolink.provider` | string  | AI provider for condensation LLM calls                        |
| `neurolink.model`    | string  | Model for condensation LLM calls                              |

### Optional Fields

| Field              | Type     | Default  | Description                                                                                             |
| ------------------ | -------- | -------- | ------------------------------------------------------------------------------------------------------- |
| `maxWords`         | number   | 50       | Maximum words in the condensed memory                                                                   |
| `prompt`           | string   | built-in | Custom condensation prompt (supports `{{OLD_MEMORY}}`, `{{NEW_CONTENT}}`, `{{MAX_WORDS}}` placeholders) |
| `storage.bucket`   | string   | —        | S3 bucket name (required for S3 storage)                                                                |
| `storage.prefix`   | string   | —        | S3 key prefix for memory objects                                                                        |
| `storage.url`      | string   | —        | Redis connection URL (required for Redis storage)                                                       |
| `storage.path`     | string   | —        | SQLite file path (required for SQLite storage)                                                          |
| `storage.onGet`    | function | —        | Callback to retrieve memory (required for custom storage)                                               |
| `storage.onSet`    | function | —        | Callback to persist memory (required for custom storage)                                                |
| `storage.onDelete` | function | —        | Callback to delete memory (required for custom storage)                                                 |
| `storage.onClose`  | function | —        | Callback for cleanup on close (optional for custom storage)                                             |

### Storage Backends

#### S3 (Recommended for production)

```typescript
memory: {
  enabled: true,
  storage: {
    type: "s3",
    bucket: "my-bucket",
    prefix: "memory/condensed/",
  },
  neurolink: { provider: "google-ai", model: "gemini-2.5-flash" },
}
```

Each user's memory is stored as a single S3 object at `{prefix}{userId}`.

#### Redis

```typescript
memory: {
  enabled: true,
  storage: {
    type: "redis",
    url: "redis://localhost:6379",
  },
  neurolink: { provider: "openai", model: "gpt-4o-mini" },
}
```

#### SQLite (Development)

```typescript
memory: {
  enabled: true,
  storage: {
    type: "sqlite",
    path: "./memory.db",
  },
  neurolink: { provider: "google-ai", model: "gemini-2.5-flash" },
}
```

> **Note**: SQLite requires the `better-sqlite3` optional peer dependency. Install it manually: `pnpm add better-sqlite3`

#### Custom (Consumer-Managed)

Delegates storage to your application via callbacks. Use this when you want to manage persistence yourself — call your own API, write to your own database, or integrate with any external system.

```typescript
memory: {
  enabled: true,
  storage: {
    type: "custom",
    onGet: async (ownerId) => {
      // Retrieve memory from your own storage
      return await myDB.getMemory(ownerId);
    },
    onSet: async (ownerId, memory) => {
      // Persist the condensed memory
      await myDB.saveMemory(ownerId, memory);
    },
    onDelete: async (ownerId) => {
      // Delete memory
      await myDB.deleteMemory(ownerId);
    },
  },
  neurolink: { provider: "google-ai", model: "gemini-2.5-flash" },
}
```

The three callbacks (`onGet`, `onSet`, `onDelete`) are required. An optional `onClose` callback can be provided for cleanup when the SDK shuts down.

**Example — file-based storage:**

```typescript
import { readFile, writeFile, unlink, mkdir } from "node:fs/promises";
import { join } from "node:path";

const memoryDir = "./data/memory";

memory: {
  enabled: true,
  storage: {
    type: "custom",
    onGet: async (ownerId) => {
      try {
        return await readFile(join(memoryDir, `${ownerId}.txt`), "utf-8");
      } catch {
        return null;
      }
    },
    onSet: async (ownerId, memory) => {
      await mkdir(memoryDir, { recursive: true });
      await writeFile(join(memoryDir, `${ownerId}.txt`), memory, "utf-8");
    },
    onDelete: async (ownerId) => {
      try { await unlink(join(memoryDir, `${ownerId}.txt`)); } catch { /* ignore */ }
    },
  },
  neurolink: { provider: "google-ai", model: "gemini-2.5-flash" },
}
```

## Custom Condensation Prompt

The condensation prompt controls how the LLM merges old memory with new conversation turns. You can provide a custom prompt using the `prompt` field:

```typescript
memory: {
  enabled: true,
  storage: { type: "s3", bucket: "my-bucket" },
  neurolink: { provider: "google-ai", model: "gemini-2.5-flash" },
  prompt: `You are a memory engine. Merge the old memory with new facts into a summary of at most {{MAX_WORDS}} words.

OLD_MEMORY:
{{OLD_MEMORY}}

NEW_CONTENT:
{{NEW_CONTENT}}

Condensed memory:`,
  maxWords: 100,
}
```

### Placeholders

| Placeholder       | Replaced With                                            |
| ----------------- | -------------------------------------------------------- |
| `{{OLD_MEMORY}}`  | The user's existing condensed memory (may be empty)      |
| `{{NEW_CONTENT}}` | The new conversation turn: `"User: ...\nAssistant: ..."` |
| `{{MAX_WORDS}}`   | The configured `maxWords` value                          |

## Integration with generate() and stream()

Memory integrates automatically with both `generate()` and `stream()`:

- **Before the LLM call**: Memory is retrieved and prepended to the input text
- **After the LLM call**: The conversation turn is stored in the background via `setImmediate()`
- **Timeouts**: Retrieval has a 3-second timeout; storage has a 10-second timeout (includes LLM condensation)
- **Errors are non-blocking**: If memory retrieval or storage fails, the generate/stream call continues normally

### Requirements

For memory to activate on a call, all three conditions must be met:

1. `memory.enabled` is `true` in the config
2. `options.context.userId` is provided in the generate/stream call
3. The response has non-empty content (for storage)

## Relationship to Mem0

NeuroLink supports two complementary memory systems:

| Feature          | Memory                                     | Mem0                                |
| ---------------- | ------------------------------------------ | ----------------------------------- |
| **Architecture** | In-process SDK                             | Cloud API (`mem0ai`)                |
| **Storage**      | S3, Redis, SQLite, or custom (you control) | Mem0 cloud                          |
| **Memory model** | Single condensed summary per user          | Structured memories with categories |
| **LLM calls**    | Uses your configured provider              | Uses Mem0's infrastructure          |
| **Latency**      | Lower (in-process storage)                 | Higher (cloud API calls)            |
| **Cost**         | Your LLM costs only                        | Mem0 API pricing                    |

Both can be enabled simultaneously — they operate independently.

## Environment Variables

The `@juspay/hippocampus` SDK reads these environment variables:

| Variable                 | Default  | Description                                                 |
| ------------------------ | -------- | ----------------------------------------------------------- |
| `HC_LOG_LEVEL`           | `warn`   | SDK log level: `debug`, `info`, `warn`, `error`             |
| `HC_CONDENSATION_PROMPT` | built-in | Default condensation prompt (overridden by config `prompt`) |

## Error Handling

The memory SDK is designed to **never crash the host application**:

- Every public method (`get()`, `add()`, `delete()`, `close()`) is wrapped in try-catch
- Errors are logged via `logger.warn()` and safe defaults are returned
- `get()` returns `null` on error
- `add()` silently fails on error
- Storage initialization errors result in memory being disabled (returns `null` from `ensureMemoryReady()`)

## Type Exports

NeuroLink re-exports the memory types for use in host applications:

```typescript
import type { Memory, CustomStorageConfig } from "@juspay/neurolink";

// Memory = HippocampusConfig & { enabled?: boolean }
// CustomStorageConfig = { type: 'custom', onGet, onSet, onDelete, onClose? }
```

## See Also

- **[Conversation Memory](../conversation-memory.md)** - Session-based conversation history
- **[Mem0 Integration](../mem0-integration.md)** - Cloud-based semantic memory
- **[Context Compaction](context-compaction.md)** - Automatic context window management
- **[Context Summarization](../context-summarization.md)** - Conversation compression
