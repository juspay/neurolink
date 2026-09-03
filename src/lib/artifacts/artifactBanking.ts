/**
 * Artifact banking (N3) — bank the whole payload, hand back a pointer.
 *
 * A long-running agent produces outputs that do not fit in a conversation:
 * a worker's full report, a build log, a stage's structured result. The wrong
 * answer is to truncate one and send the head — the discarded bytes are gone
 * and nothing records that they existed. The right answer is to write the
 * payload to disk in full and put a bounded preview plus a read-back call in
 * the conversation, so the model can pull as much of the rest as it needs,
 * whenever it needs it, and compaction can evict the preview without costing
 * anything.
 *
 * Read-back is the tool that already exists: `retrieve_context({ artifactId,
 * offset, limit })` paginates any artifact and reports `totalSize` / `hasMore`.
 * There is no second read tool and no second storage layer — this module is a
 * thin, typed front door onto the instance's artifact store (local temp,
 * Redis, or injected), the same store the MCP output normalizer externalizes
 * into.
 *
 * The one thing it adds is that the store no longer has to pre-exist: it is
 * created on first use, whether or not `mcp.outputLimits` was ever configured,
 * and `retrieve_context` is registered along with it.
 *
 * @module artifacts/artifactBanking
 */

import type { NeuroLink } from "../neurolink.js";
import type {
  ArtifactPageRequest,
  ArtifactStore,
  BankArtifactOptions,
  BankedArtifactRef,
} from "../types/index.js";
import { readArtifactWindow } from "./artifactReader.js";

/** Preview length when the caller does not ask for one. */
const DEFAULT_BANK_PREVIEW_CHARS = 1000;

/**
 * Ceiling on a preview, however much the caller asks for. A preview is a
 * pointer into the banked file; past a few thousand characters it stops being
 * a pointer and starts being the context pressure banking exists to remove.
 */
const MAX_BANK_PREVIEW_CHARS = 4000;

/** `serverId` recorded on banked artifacts — distinguishes them from MCP surrogates. */
const BANK_SERVER_ID = "neurolink-banking";

/** Chunk size suggested in the read-back hint (matches retrieve_context's default). */
const READ_BACK_CHUNK_CHARS = 50_000;

/**
 * The artifact store for this instance, created on first use.
 *
 * Lazy creation lives on the host rather than here because both pieces of it
 * are private to `NeuroLink`: the store field the `retrieve_context` closure
 * reads, and the registration of that tool. Calling it through the host is
 * what makes a banked artifact readable by the model, not just by host code.
 */
export function ensureArtifactStore(host: NeuroLink): ArtifactStore {
  return host.getArtifactStore();
}

/** Head slice of the payload, clamped to the caller's budget and the ceiling. */
function boundedPreview(payload: string, requested?: number): string {
  const chars = Math.min(
    Math.max(0, requested ?? DEFAULT_BANK_PREVIEW_CHARS),
    MAX_BANK_PREVIEW_CHARS,
  );
  return payload.length <= chars ? payload : `${payload.slice(0, chars)}…`;
}

/**
 * The literal call that reads the payload back.
 *
 * Spelled out rather than described: a model that is handed a preview and the
 * exact next call does not have to guess a tool name, an argument name, or
 * how to page — and the sentence says outright that nothing was discarded, so
 * "the rest is not worth asking for" is never a reasonable inference.
 */
function readBackHintFor(id: string, sizeBytes: number): string {
  return (
    `retrieve_context({ artifactId: "${id}", offset: 0, limit: ${READ_BACK_CHUNK_CHARS} }) ` +
    `— the complete ${sizeBytes}-byte payload is stored; nothing was discarded. ` +
    `Repeat with offset advanced by the characters you received while hasMore is true.`
  );
}

/**
 * Write a payload to the artifact store and return a reference to it.
 *
 * The payload is stored whole. The returned `preview` is a bounded head slice
 * for the conversation, and `readBackHint` is the call that fetches the rest.
 *
 * @param host     Instance whose artifact store (and `retrieve_context`) to use.
 * @param payload  The complete text or JSON payload. Never truncated.
 * @param options  What this is (`kind` / `label`) and how big a preview to cut.
 */
export async function bankArtifact(
  host: NeuroLink,
  payload: string,
  options: BankArtifactOptions,
): Promise<BankedArtifactRef> {
  const store = ensureArtifactStore(host);
  const label = options.label.trim() || options.kind;
  const contentType = options.contentType ?? "text";
  const sizeBytes = Buffer.byteLength(payload, "utf-8");

  const ref = await store.store(payload, {
    toolName: `bank:${options.kind}`,
    serverId: BANK_SERVER_ID,
    sessionId: options.sessionId,
    sizeBytes,
    contentType,
    label,
    kind: options.kind,
  });

  return {
    artifactId: ref.id,
    label,
    kind: options.kind,
    sizeBytes,
    preview: boundedPreview(payload, options.previewChars),
    readBackHint: readBackHintFor(ref.id, sizeBytes),
  };
}

/**
 * Read a banked payload back from host code — the programmatic twin of the
 * `retrieve_context` tool the model uses.
 *
 * Returns the FULL payload when `page` is omitted; there is no hidden cap,
 * because a host that asks for the artifact is asking for the artifact.
 * Returns null when the id is unknown or the file is gone.
 *
 * With a `page`, a backend that supports range reads moves only the window
 * (see `readArtifactWindow`) — the same path `retrieve_context` takes.
 *
 * @param page Character window. `offset` defaults to 0, `limit` to the rest.
 */
export async function readArtifact(
  host: NeuroLink,
  id: string,
  page?: ArtifactPageRequest,
): Promise<string | null> {
  const store = ensureArtifactStore(host);
  const window = await readArtifactWindow(store, id, page);
  return window === null ? null : window.content;
}
