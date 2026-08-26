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

One store, not two. Banking writes into the same `LocalTempArtifactStore` the
MCP output normalizer externalizes into, so an oversized MCP tool output and a
banked worker report read back through exactly the same call.

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
