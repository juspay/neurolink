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

| Field                   | Type     | Default   | Description                                                                                                                                                                          |
| ----------------------- | -------- | --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `maxWords`              | number   | 50        | Maximum words in the condensed memory                                                                                                                                                |
| `prompt`                | string   | built-in  | Custom condensation prompt (supports `{{OLD_MEMORY}}`, `{{NEW_CONTENT}}`, `{{MAX_WORDS}}` placeholders). Validated at construction — see [Template validation](#template-validation) |
| `strictPrompt`          | boolean  | `false`   | When true, a prompt template missing `{{OLD_MEMORY}}` or `{{NEW_CONTENT}}` makes the constructor throw instead of disable-and-log (at `error`)                                       |
| `shouldWrite`           | function | —         | Instance-level write gate — see [Write hooks](#write-hooks-shouldwrite-and-onbeforestore)                                                                                            |
| `onBeforeStore`         | function | —         | Instance-level content transform/veto — see [Write hooks](#write-hooks-shouldwrite-and-onbeforestore)                                                                                |
| `client`                | object   | —         | A host-managed Hippocampus client (`add/get/delete/close`). NeuroLink uses it directly instead of loading `@juspay/hippocampus`                                                      |
| `neurolink.credentials` | object   | inherited | Credentials for the condenser's own NeuroLink instance — see [Condenser credentials](#condenser-credentials)                                                                         |
| `neurolink.instance`    | object   | built     | A host-supplied condenser (`{ generate() }`) — see [Condenser credentials](#condenser-credentials)                                                                                   |
| `storage.bucket`        | string   | —         | S3 bucket name (required for S3 storage)                                                                                                                                             |
| `storage.prefix`        | string   | —         | S3 key prefix for memory objects                                                                                                                                                     |
| `storage.url`           | string   | —         | Redis connection URL (required for Redis storage)                                                                                                                                    |
| `storage.path`          | string   | —         | SQLite file path (required for SQLite storage)                                                                                                                                       |
| `storage.onGet`         | function | —         | Callback to retrieve memory (required for custom storage)                                                                                                                            |
| `storage.onSet`         | function | —         | Callback to persist memory (required for custom storage)                                                                                                                             |
| `storage.onDelete`      | function | —         | Callback to delete memory (required for custom storage)                                                                                                                              |
| `storage.onClose`       | function | —         | Callback for cleanup on close (optional for custom storage)                                                                                                                          |

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

> **Heads up — `@juspay/hippocampus` is now an optional peer.** Starting with this release, NeuroLink no longer pulls `@juspay/hippocampus` as a hard runtime dependency (the package's own peer on `@juspay/neurolink` was dragging the deprecated `@ai-sdk/google` and `@ai-sdk/google-vertex` packages into the production graph). To enable memory in your app, install the SDK explicitly:
>
> ```bash
> pnpm add @juspay/hippocampus
> # or: npm install @juspay/hippocampus
> ```
>
> If memory is configured but the package is missing, NeuroLink logs a one-time `error` and disables memory rather than throwing — generation/streaming continue to work normally.

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

### Template validation

Hippocampus substitutes placeholders with `replaceAll` and requires none of them, so a typo fails silently at the LLM boundary: a template without `{{NEW_CONTENT}}` produces a memory that **never grows**, and one without `{{OLD_MEMORY}}` **overwrites the whole summary on every turn**. NeuroLink validates templates before they can do either:

| Template                                         | When it is checked          | Missing `{{OLD_MEMORY}}` or `{{NEW_CONTENT}}`                                                                      | Missing only `{{MAX_WORDS}}` |
| ------------------------------------------------ | --------------------------- | ------------------------------------------------------------------------------------------------------------------ | ---------------------------- |
| Instance `memory.prompt`                         | `new NeuroLink()`           | Logs at **`error`** and **disables memory** for the instance; with `strictPrompt: true` the constructor **throws** | Warns                        |
| `HC_CONDENSATION_PROMPT` (only when no `prompt`) | `new NeuroLink()`           | Same as above                                                                                                      | Warns                        |
| Per-call `memory.prompt`                         | Inside the background write | Warns once per distinct template and **falls back to the instance prompt** for that owner                          | Warns once                   |
| `additionalUsers[].prompt`                       | Inside the background write | Same as per-call                                                                                                   | Warns once                   |

An **empty or whitespace-only** template counts as unset at every level: it is not validated, never disables memory, and is **stripped before it reaches Hippocampus** — from the constructor config and from every per-call / per-owner `add()` options. Hippocampus resolves `prompt || HC_CONDENSATION_PROMPT || built-in`, so `""` would fall through on its own, but `"   "` is truthy and Hippocampus 0.2.x would use it literally, as a template with no placeholders; NeuroLink omits the key so the next one down applies either way.

The default is disable-and-log because every other memory failure already degrades that way. The log line is at `error`, not `warn`: warnings are hidden at the default log level (they show only with `NEUROLINK_DEBUG=true`), and a configuration that turns memory off is something the operator has to act on. Per-call fallbacks — a bad per-call template, a hook that throws, a write that fails — stay at `warn`, since the instance keeps working. `strictPrompt` is for hosts that would rather fail deployment than run with memory off:

```typescript
memory: {
  enabled: true,
  prompt: myTemplate,
  strictPrompt: true, // throws ErrorFactory.invalidConfiguration on a fatal template
}
```

The same check is exported for hosts that assemble templates at runtime:

```typescript
import { validateCondensationPrompt } from "@juspay/neurolink";

const verdict = validateCondensationPrompt(template);
// { valid: boolean; missing: ("OLD_MEMORY" | "NEW_CONTENT" | "MAX_WORDS")[]; fatal: (...)[] }
```

## Condenser credentials

Hippocampus condenses old + new memory through a NeuroLink `generate()` call. Left to itself it constructs a **bare** `new NeuroLink()` for that call — no credentials — so a host that passes provider keys via `new NeuroLink({ credentials })` rather than `process.env` gets a memory that silently never grows (the condensation error is swallowed and the old memory returned).

NeuroLink now hands Hippocampus a **dedicated child instance** instead:

- It inherits the parent's `credentials` (or the explicit `memory.neurolink.credentials` when set), so condensation works wherever generation works with instance-level credentials. **Per-request `credentials`** passed to `generate()` / `stream()` do **not** reach it: the child is built once per instance, and condensation runs after the response, outside the request. A multi-tenant host that holds no instance-level key gets no condensation at all — supply `memory.neurolink.credentials`, or take over condensation with `memory.neurolink.instance`.
- It is a child, not the parent: routing condensation through the parent would run its MCP init, skills and middleware, emit `generation:*` on the parent emitter and add the condensation cost to the parent's session budget.
- It has memory disabled, so it can never recurse into a memory write of its own.
- It is built lazily on the **first condensation**, never at construction or on a read, so a read-only host pays nothing.
- It goes with the host: `shutdown()` and `dispose()` release it — but only after **draining the memory writes already scheduled**, bounded by the 30 s write timeout (a write that outlives the bound is left in flight and warned about). A turn's write is deferred to `setImmediate`, so `await nl.generate(…); await nl.shutdown();` — a serverless handler, a per-request instance, a one-shot CLI run — still stores that turn. A write scheduled _after_ the release is skipped (logged at `debug`) rather than rebuilding the child after its host is gone.
- Building it leaves the process-wide log sink (`logger.setEventEmitter`) exactly where it was, so another instance's log bridge keeps receiving.

```typescript
memory: {
  enabled: true,
  neurolink: {
    provider: "openai",
    model: "gpt-4o-mini",
    // Optional: different keys for condensation than for generation.
    credentials: { openai: { apiKey: process.env.CONDENSER_KEY } },
  },
}
```

To take over condensation entirely, pass any object with a `generate()`:

```typescript
memory: {
  enabled: true,
  neurolink: {
    instance: {
      generate: async ({ input }) => ({ content: await myCondenser(input.text) }),
    },
  },
}
```

`instance` receives exactly `{ input: { text }, provider, model, temperature, disableTools: true }` and only its `content` is read back (`HippocampusNeurolinkLike`). When set, NeuroLink builds no child and passes the object through untouched.

**Hippocampus version note.** `neurolink.instance` and `neurolink.credentials` are read by `@juspay/hippocampus` ≥ 0.2.0. The peer floor is **0.2.1**, which additionally substitutes the condensation placeholders literally — with 0.2.0 a turn containing `$&` or `$'` corrupts the prompt (juspay/hippocampus#8). On an older Hippocampus the fields are ignored and condensation falls back to a bare `new NeuroLink()` that only sees keys in `process.env`.

### Bring your own client

If your application already runs a Hippocampus instance (or anything with the same `add/get/delete/close` surface), hand it over and NeuroLink will not load or construct `@juspay/hippocampus` at all. `add()` and `get()` are what NeuroLink calls, and both must be functions: a client missing either — a write-only double, say — is refused at initialization with an `error` log and memory disabled, rather than failing every read silently later. `delete()` and `close()` are never called by NeuroLink.

```typescript
import { Hippocampus } from "@juspay/hippocampus";

const client = new Hippocampus({ storage: { type: "redis" } });

const neurolink = new NeuroLink({
  conversationMemory: {
    enabled: true,
    memory: { enabled: true, client },
  },
});
```

`client` may also be a **factory** — `(config) => new Hippocampus(config)` — which receives the `HippocampusConfig` NeuroLink assembled, including the credentialed child under `neurolink.instance`. That is the way to run your own client class (a subclass, a pinned version, a test double) on exactly what `new Hippocampus(config)` would get. A plain instance is used as-is: wiring its condenser is then the host's job.

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
3. The response has non-empty content (for write)

### Per-Call Memory Control

When memory is globally enabled, it is active for every `generate()` and `stream()` call by default. You can override this behavior on a **per-call basis** using the `memory` option without changing the global config.

**Available options** (`MemoryCallOptions`, identical for `generate()` and `stream()`):

| Option            | Type     | Default  | Description                                                                                                                                                       |
| ----------------- | -------- | -------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `enabled`         | boolean  | `true`   | Master toggle — when `false`, both read and write are skipped                                                                                                     |
| `read`            | boolean  | `true`   | Whether to read past memory and prepend it to the prompt                                                                                                          |
| `write`           | boolean  | `true`   | Whether to write this conversation turn into memory after the call                                                                                                |
| `prompt`          | string   | instance | Condensation prompt for the **primary owner** on this call. Must contain `{{OLD_MEMORY}}` and `{{NEW_CONTENT}}` (see [Template validation](#template-validation)) |
| `maxWords`        | number   | instance | Word cap for the primary owner's condensed memory on this call                                                                                                    |
| `shouldWrite`     | function | —        | Per-call write gate — see [Write hooks](#write-hooks-shouldwrite-and-onbeforestore)                                                                               |
| `onBeforeStore`   | function | —        | Per-call content transform/veto — see [Write hooks](#write-hooks-shouldwrite-and-onbeforestore)                                                                   |
| `additionalUsers` | array    | —        | Extra owners to read/write — see [Multi-User Memory](#multi-user-memory)                                                                                          |

> **Note:** These options only take effect when the global memory SDK is enabled. If global memory is disabled, per-call options have no effect.

**Precedence:**

1. **Global config** — Is memory enabled globally? If not, per-call options are ignored.
2. **`enabled`** — Master per-call toggle. If `false`, both read and write are skipped regardless of individual flags.
3. **`read` / `write`** — Fine-grained control over individual operations.
4. **`prompt` / `maxWords`** — per-call > instance `conversationMemory.memory.prompt` / `maxWords` > Hippocampus built-in default. Before this option existed only `additionalUsers` could override the prompt; the primary owner always condensed with the instance template.

#### Per-call prompt for the primary owner

```typescript
await neurolink.generate({
  input: { text: "I switched the store to Stripe last week." },
  context: { userId: "user-123" },
  memory: {
    prompt: `Keep only durable facts about the user's business.

OLD_MEMORY:
{{OLD_MEMORY}}

NEW_CONTENT:
{{NEW_CONTENT}}

Condensed memory (max {{MAX_WORDS}} words):`,
    maxWords: 80,
  },
});
```

### Write hooks: `shouldWrite` and `onBeforeStore`

Two hooks let a host decide **whether** a turn is remembered and **what** text reaches the condenser. Both are accepted per call (`memory.shouldWrite` / `memory.onBeforeStore`) and on the instance (`conversationMemory.memory.shouldWrite` / `.onBeforeStore`). When both are set for the same hook, **the per-call one wins for that call** — the instance hook is not run.

```typescript
type MemoryTurn = {
  prompt: string; // the caller's original prompt (before memory context was prepended)
  response: string; // the assistant's final text, trimmed
  userId: string; // context.userId
  sessionId?: string; // context.sessionId
  provider?: string;
  model?: string;
  toolsUsed?: string[]; // stream path: derived from tool:start events
  usage?: TokenUsage; // generate path only
  finishReason?: string; // generate path only
};

shouldWrite?: (turn: MemoryTurn) => boolean | Promise<boolean>;
onBeforeStore?: (content: string, turn: MemoryTurn) => string | null | Promise<string | null>;
```

- `shouldWrite` runs first. `false` skips **every** `add()` for the turn — the primary owner and all `additionalUsers`.
- `onBeforeStore` receives the default `"User: …\nAssistant: …"` rendering. Return a replacement string, or `null` to skip the write. The returned string is what every owner's `add()` receives.
- Both run **inside the deferred background write** (after `setImmediate`), so an async hook never sits on the response path.
- A hook that **throws** is logged at `warn` and the write is **skipped** — a missed memory is recoverable, a polluted condensed summary is not. A non-string, non-null return from `onBeforeStore` is treated the same way.

```typescript
const neurolink = new NeuroLink({
  conversationMemory: {
    enabled: true,
    memory: {
      enabled: true,
      // Instance-wide: never remember turns that were pure tool plumbing.
      shouldWrite: (turn) =>
        (turn.toolsUsed?.length ?? 0) === 0 || turn.response.length > 200,
      // Instance-wide: strip anything that looks like a card number.
      onBeforeStore: (content) =>
        content.replace(/\b\d{13,19}\b/g, "[redacted]"),
    },
  },
});

// Per call: override the gate for a seeding call, keep the instance redaction.
await neurolink.generate({
  input: { text: "My name is Alice. I run a Shopify store." },
  context: { userId: "user-123" },
  memory: { shouldWrite: () => true },
});
```

> **Follow-up (not implemented):** a decide-powered durability gate — one `tryDecide()` question per turn ("does this turn contain a fact worth remembering across conversations?") wired in as the default `shouldWrite` when a decision provider is configured, failing open to "write" without one, exactly like the other `decide` consumers. The hook surface above is the seam it would plug into; today the gate is entirely host-defined.

#### Read memory but don't write

Use when you want past context but don't want this call stored — e.g., code review where you'll store a curated summary later.

```typescript
const result = await neurolink.generate({
  input: { text: "Review this pull request for security issues" },
  memory: { read: true, write: false },
  context: { userId: "user-123" },
});
```

#### Write memory but don't read

Use for onboarding or seeding memory without injecting past context into the prompt.

```typescript
const result = await neurolink.generate({
  input: {
    text: "My name is Alice. I work on the payments team and use Python.",
  },
  memory: { read: false, write: true },
  context: { userId: "user-123" },
});
```

#### Skip memory entirely

Use for operational or utility calls where memory adds noise.

```typescript
const result = await neurolink.generate({
  input: { text: "Fetch the latest PR comments from GitHub" },
  memory: { enabled: false },
  context: { userId: "user-123" },
});
```

#### Per-call control with stream()

The same `memory` option works identically in `stream()`.

```typescript
const stream = await neurolink.stream({
  input: { text: "Summarize today's standup notes" },
  memory: { read: true, write: false },
  context: { userId: "user-123" },
});
```

## Multi-User Memory

Retrieve and store memory for multiple users in a single `generate()` or `stream()` call. This enables **layered memory** — combining a user's personal context with org-level policies, team context, or any other memory scope.

The primary user is always determined by `context.userId`. Additional users are specified via `memory.additionalUsers`. Memory for all users (primary + additional) is fetched and stored in parallel.

### Quick Start

```typescript
const result = await neurolink.stream({
  input: { text: "How should I handle PCI data in our API?" },
  context: { userId: "user-alice" },
  memory: {
    additionalUsers: [
      {
        userId: "org-acme",
        label: "Organization Policy",
        prompt: `Extract only compliance requirements, security policies, and org-level decisions.

OLD_MEMORY:
{{OLD_MEMORY}}

NEW_CONTENT:
{{NEW_CONTENT}}

Condensed memory (max {{MAX_WORDS}} words):`,
        maxWords: 100,
      },
      {
        userId: "team-payments",
        label: "Team Context",
      },
    ],
  },
});
```

### Context Format

When multiple users' memories are retrieved, they are formatted with labels and injected into the prompt:

```
Context from previous conversations:

[User]
Alice is a senior engineer on the payments team, prefers Python.

[Organization Policy]
PCI-DSS Level 1 compliance required. All cardholder data must be encrypted at rest and in transit.

[Team Context]
Payments team uses microservices architecture with Stripe integration.

Current user's request: How should I handle PCI data in our API?
```

The primary user's label is always `"User"`. Additional users use the `label` field, falling back to `userId` if not set.

### Per-User Condensation

Each additional user can specify a custom `prompt` and `maxWords` for its condensation strategy. This is useful when different memory scopes need different extraction rules — e.g. personal preferences vs compliance policies.

The `prompt` must include `{{OLD_MEMORY}}` and `{{NEW_CONTENT}}` (and should include `{{MAX_WORDS}}`). A per-user template missing either structural placeholder is logged once and that user falls back to the instance prompt — see [Template validation](#template-validation). The primary owner's prompt is set with the per-call `memory.prompt` instead — see [Per-Call Memory Control](#per-call-memory-control).

### Selective Read/Write

Control which additional users participate in read and write independently:

```typescript
memory: {
  additionalUsers: [
    { userId: "org-acme", label: "Org Policy", write: false },  // read-only
    { userId: "team-x", label: "Team", read: false },           // write-only
  ],
}
```

### AdditionalMemoryUser Options

| Field      | Type    | Default  | Description                                                                                        |
| ---------- | ------- | -------- | -------------------------------------------------------------------------------------------------- |
| `userId`   | string  | required | The owner ID to retrieve/store memory for                                                          |
| `label`    | string  | userId   | Label used in the formatted memory context                                                         |
| `read`     | boolean | `true`   | Whether to read this user's memory                                                                 |
| `write`    | boolean | `true`   | Whether to write conversation into this user's memory                                              |
| `prompt`   | string  | instance | Custom condensation prompt for this user (validated; falls back to the instance prompt when fatal) |
| `maxWords` | number  | instance | Max words for this user's condensed memory                                                         |

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
import type {
  HippocampusMemory,
  HippocampusNeurolinkLike,
  MemoryCallOptions,
  MemoryTurn,
  MemoryShouldWriteHook,
  MemoryBeforeStoreHook,
  CondensationPromptValidation,
  MemoryCustomStorageConfig,
} from "@juspay/neurolink";
import { validateCondensationPrompt } from "@juspay/neurolink";

// HippocampusMemory   = HippocampusConfig & MemoryWriteHooks & { enabled?, client?, strictPrompt? }
// MemoryCallOptions   = the per-call `memory` block on GenerateOptions and StreamOptions
// MemoryTurn          = what shouldWrite / onBeforeStore receive
// HippocampusNeurolinkLike = { generate({ input, provider?, model?, temperature?, disableTools? }) }
// MemoryCustomStorageConfig = { type: 'custom', onGet, onSet, onDelete, onClose? }
```

## See Also

- **[Conversation Memory](../conversation-memory.md)** - Session-based conversation history
- **[Memory Integration](/docs/advanced/memory-integration)** - Advanced hippocampus configuration and patterns
- **[Context Compaction](/docs/features/context-compaction)** - Automatic context window management
- **[Context Summarization](../context-summarization.md)** - Conversation compression
- **[Per-Request Credentials](/docs/features/per-request-credentials)** - How `credentials` flow to providers. Only instance-level `credentials` (or `memory.neurolink.credentials`) reach the memory condenser; per-request `credentials` do not
