# Artifact Banking (`bankArtifact` / `readArtifact`)

A long-running agent produces outputs that do not fit in a conversation: a
worker's full report, a build log, a stage's structured result. The tempting
answer is to truncate one and send the head — but the discarded bytes are gone,
and nothing records that they ever existed.

Banking is the other answer. The payload is written to disk **whole**, and what
goes into the conversation is a bounded preview plus the exact call that reads
the rest. Context cost stays flat, evidence stays complete, and compaction can
evict the preview without destroying anything.

Read-back is the tool that already existed: **`retrieve_context`**. No new tool,
no new name for the model to learn.

## Quick start

```typescript
import { NeuroLink } from "@juspay/neurolink";

const neurolink = new NeuroLink();

const ref = await neurolink.bankArtifact(fullWorkerReport, {
  kind: "worker-report",
  label: "delegate:auth-review",
  sessionId: "review-1421",
});

// Put THIS in the conversation — never the report itself:
//   ref.preview        bounded head slice (1000 chars by default)
//   ref.readBackHint   the literal retrieve_context call that fetches the rest
//   ref.sizeBytes      how much is actually there

// And from host code, whenever you want it back:
const whole = await neurolink.readArtifact(ref.artifactId);
const window = await neurolink.readArtifact(ref.artifactId, {
  offset: 100_000,
  limit: 50_000,
});
```

The model reads the same artifact with the tool it already has:

```jsonc
// retrieve_context
{ "artifactId": "9f1c…", "offset": 0, "limit": 50000 }
// → { content, totalSize, hasMore, offset, limit }
```

`retrieve_context` is registered automatically the first time anything banks —
you do not have to configure `mcp.outputLimits` to get it.

## API

| Member                           | Returns             | Notes                                                        |
| -------------------------------- | ------------------- | ------------------------------------------------------------ |
| `bankArtifact(payload, options)` | `BankedArtifactRef` | Stores the payload whole; returns id + bounded preview       |
| `readArtifact(id, page?)`        | `string \| null`    | Full payload when `page` is omitted; `null` if unknown       |
| `getArtifactStore()`             | `ArtifactStore`     | Creates the store on demand and registers `retrieve_context` |
| `setArtifactStore(store)`        | `void`              | Swaps the backend for every path, MCP normalizer included    |

`BankArtifactOptions`:

| Field          | Required | Default  | Notes                                                         |
| -------------- | -------- | -------- | ------------------------------------------------------------- |
| `kind`         | yes      | —        | `worker-report` · `command-output` · `stage-output` · `other` |
| `label`        | yes      | —        | Short human label, e.g. `delegate:auth-review`                |
| `sessionId`    | no       | —        | Recorded on the artifact metadata                             |
| `contentType`  | no       | `"text"` | `"json"` stores with a `.json` extension                      |
| `previewChars` | no       | `1000`   | Hard cap **4000** — a preview is a pointer                    |

`BankedArtifactRef`: `{ artifactId, label, kind, sizeBytes, preview, readBackHint }`.
`sizeBytes` is UTF-8 **bytes**; `preview` is **characters**.

## What it is built on

One store, not two. Banking writes into the same artifact store the MCP output
normalizer externalizes into — local temp by default, Redis when you say so,
see [Storage backends](#storage-backends) — so an oversized MCP tool output and
a banked worker report read back through exactly the same call.

The only thing banking adds to the store's lifecycle: previously it existed only
when `mcp.outputLimits.strategy === "externalize"`, which meant a caller who
just wanted to bank a report had to configure MCP output limits it never used.
`getArtifactStore()` now creates one on first use, and registers
`retrieve_context` with it — so a banked payload is reachable by the **model**,
not only by host code.

## Cross-process reads

Every payload gets a `<id>.meta.json` sidecar written beside it. The in-memory
index stays the fast path, but an id it does not know is resolved from the
sidecar — so an artifact banked by one process is readable by another, and by
the same process after a restart. If the sidecar is missing, the payload file
itself is probed and its metadata recovered from `stat`.

Ids that reach that probe come from the model, so they are validated first:
anything containing a path separator or a dot is refused before the filesystem
is touched. Real ids are UUIDs.

`cleanup(olderThanMs)` stays index-scoped on purpose — it expires what this
process banked, and never walks the directory deleting another process's work.

## Storage backends

Where artifacts live is chosen the way conversation memory's storage is chosen,
and by the same switch:

| Backend   | Select with                                    | Survives a redeploy | Visible to other replicas | Expiry                                   |
| --------- | ---------------------------------------------- | ------------------- | ------------------------- | ---------------------------------------- |
| `"local"` | default                                        | no                  | only on the same machine  | never, unless the host calls `cleanup()` |
| `"redis"` | `STORAGE_TYPE=redis` or `artifacts.storage`    | yes                 | yes                       | TTL, 24 h by default                     |
| custom    | `artifacts.store` or `setArtifactStore(store)` | up to you           | up to you                 | up to you                                |

**1. Nothing to do.** `STORAGE_TYPE=redis` already moves sessions to Redis,
and now moves artifacts with them, on the same pooled connection.

```typescript
import { NeuroLink } from "@juspay/neurolink";

const neurolink = new NeuroLink();
```

**2. Explicit, with its own connection.**

```typescript
import { NeuroLink } from "@juspay/neurolink";

const neurolink = new NeuroLink({
  artifacts: {
    storage: "redis",
    redisConfig: { url: process.env.ARTIFACT_REDIS_URL, ttl: 3600 },
  },
});
```

**3. Anything else.** Implement the `ArtifactStore` type (`store` /
`retrieve` / `delete` / `cleanup` / `generatePreview`, plus the optional
`retrieveRange` / `close`) and hand it in. NeuroLink ships only `"local"` and
`"redis"`.

```typescript
import { NeuroLink, type ArtifactStore } from "@juspay/neurolink";

class MyS3ArtifactStore implements ArtifactStore {
  // ...your implementation
}

const store = new MyS3ArtifactStore();
const neurolink = new NeuroLink({ artifacts: { store } });
neurolink.setArtifactStore(store); // the same thing after construction
```

Resolution order for the backend: `artifacts.store` → `artifacts.storage` →
`STORAGE_TYPE` → `"local"`. For the Redis connection: `artifacts.redisConfig` →
`conversationMemory.redisConfig` → `REDIS_URL` / `REDIS_HOST` and friends. The
key prefix is never inherited: artifacts get `neurolink:artifact:` even when
the connection came from the conversation config, so the two keyspaces cannot
collide. `RedisArtifactStore`, `LocalTempArtifactStore` and
`createArtifactStore` are exported if you want to build or wrap one yourself.

Two things to know before flipping the switch on a running system:

- **`setArtifactStore()` replaces, it does not migrate.** Artifacts already in
  the previous store stop resolving through the instance. Call it before the
  first bank or externalized tool output, or use `artifacts.store` and avoid
  the ordering question. The MCP output normalizer is rebuilt as part of the
  swap — assigning the private field, which some early adopters did, misses it
  and leaves externalized tool outputs in the old backend while read-backs look
  in the new one.
- **A Redis outage is an error, not a fallback.** `bankArtifact` rejects, and
  the MCP normalizer already passes the raw tool result through inline (its
  existing behaviour for any store failure). There is deliberately no silent
  fallback to local temp: on multiple replicas that fallback recreates the
  cross-pod bug Redis was chosen to fix.

**Ownership.** NeuroLink closes only the stores it built itself — the local or
Redis store it created from config or `STORAGE_TYPE` — calling their optional
`close()` on `shutdown()` and when `setArtifactStore()` replaces one. A store
you inject, through `artifacts.store` or `setArtifactStore()`, is yours to
close; the instance never does.

**TTL.** `redisConfig.ttl` is seconds and must be positive; it defaults to
24 hours. Zero or a negative value is replaced by the default with a warning.
There is no "keep forever" in Redis — expiry is the whole point of the backend.

## Range reads

`retrieve_context({ artifactId, offset, limit })` and `readArtifact(id, page)`
ask the backend for **one window** when it can produce one. `ArtifactStore` has
an optional `retrieveRange(id, { offset, limit })` returning
`{ content, offset, totalLength }`; when a backend implements it, only the
window crosses the wire and `hasMore` / `totalSize` come from `totalLength`,
never from the payload. A backend without it is read whole and sliced, exactly
as before.

Units are **characters** (UTF-16 code units), the same unit `offset` and
`limit` always used. `RedisArtifactStore` records the payload's character
length beside its byte length and uses `GETRANGE` only when the two are equal
— pure ASCII, which is what JSON tool output and logs almost always are.
Anything else falls back to a whole read, which is slower and still correct.
A window never starts on the wrong character.

## Searching an artifact

`retrieve_context({ artifactId, search })` finds literal, case-insensitive text
in an artifact and returns **where it is**, so the model can jump instead of
paging to it:

```jsonc
// retrieve_context
{ "artifactId": "9f1c…", "search": "connection refused" }
// → { matchCount, totalMatches, truncated, nextSearchOffset?, matches: [
//      { offset, line, snippetOffset, snippet }, … ] }

// then read exactly there
{ "artifactId": "9f1c…", "offset": 184220, "limit": 4000 }
```

Snippets are bounded (about 120 characters each side of the hit) rather than
whole lines, because an MCP artifact is usually one compact JSON line and "the
matching line" would be the entire payload. Up to 50 matches come back per
call; `totalMatches` counts the rest and `nextSearchOffset` is the `offset` to
pass to see them. Regex metacharacters are matched literally — the model's
input is never compiled as a pattern — and an empty or over-long pattern is an
explicit error, never a silently unfiltered read.

## Rules of thumb

- **Bank first, summarize second.** Write the payload, then decide what the
  conversation sees. Never the other way round.
- **Hand the model `preview` _and_ `readBackHint` together.** A preview with no
  way back is just a truncation with extra steps.
- **Do not raise `previewChars` to avoid a read-back.** Past a few thousand
  characters the preview recreates the context pressure banking removes; that
  is why the cap exists.
- **`sizeBytes` is the honest number.** Show it when you show a preview, so
  "there is more" is visible rather than inferred.
