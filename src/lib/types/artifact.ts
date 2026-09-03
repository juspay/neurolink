/**
 * Artifact Store Types (canonical location)
 *
 * Types for the MCP large-output artifact storage system.
 * When mcp.outputLimits.strategy = "externalize", oversized MCP tool outputs
 * are stored as artifacts and the model receives a compact surrogate instead.
 *
 * @module types/artifactTypes
 */

import type { RedisStorageConfig } from "./conversation.js";

// ---------------------------------------------------------------------------
// Artifact metadata & reference
// ---------------------------------------------------------------------------

/** Metadata recorded alongside a stored artifact. */
export type ArtifactMeta = {
  /** Tool name that produced the output. */
  toolName: string;
  /** MCP server ID. */
  serverId: string;
  /** Session that triggered the tool call (optional). */
  sessionId?: string;
  /** Serialized byte size of the full payload. */
  sizeBytes: number;
  /** Whether the payload is valid JSON or plain text. */
  contentType: "json" | "text";
  /** Unix epoch ms when the artifact was created. */
  createdAt: number;
  /**
   * Human label for a host-banked artifact (e.g. "delegate:auth-review").
   * Absent on artifacts written by the MCP output normalizer.
   */
  label?: string;
  /** What kind of output was banked. Absent for MCP surrogates. */
  kind?: BankedArtifactKind;
};

/** Lightweight descriptor returned after a successful ArtifactStore.store(). */
export type ArtifactRef = {
  /** UUID v4 — stable identifier used in surrogate results and metadata. */
  id: string;
  /** First N characters of the payload (for surrogate headers). */
  preview: string;
  /** Full serialized byte size. */
  sizeBytes: number;
  /** Stored metadata. */
  meta: ArtifactMeta;
};

// ---------------------------------------------------------------------------
// Host-side artifact banking (N3)
// ---------------------------------------------------------------------------

/**
 * What a banked payload is, so previews and logs can say so without the
 * caller re-explaining itself. "other" is the escape hatch, not the default.
 */
export type BankedArtifactKind =
  | "worker-report"
  | "command-output"
  | "stage-output"
  | "other";

/** How to bank one payload. Only `kind` and `label` are required. */
export type BankArtifactOptions = {
  /** What this payload is. */
  kind: BankedArtifactKind;
  /** Short human label, e.g. "delegate:auth-review" — shown in logs. */
  label: string;
  /** Session the payload belongs to, recorded on the artifact metadata. */
  sessionId?: string;
  /** Payload shape; decides the on-disk extension. Default "text". */
  contentType?: "json" | "text";
  /** Preview length in characters. Default 1000, hard cap 4000. */
  previewChars?: number;
};

/**
 * What the conversation gets instead of the payload: an id, a bounded head
 * slice, and the exact call that reads the rest. The FULL payload is always on
 * disk — a preview is a pointer, never a replacement.
 */
export type BankedArtifactRef = {
  /** Id to pass to `retrieve_context({ artifactId })`. */
  artifactId: string;
  label: string;
  kind: BankedArtifactKind;
  /** UTF-8 byte size of the complete payload. */
  sizeBytes: number;
  /** Bounded head slice of the payload (characters, not bytes). */
  preview: string;
  /** Literal read-back call, so the model never has to guess the tool. */
  readBackHint: string;
};

/** Character window for a paginated artifact read. */
export type ArtifactPageRequest = {
  /** Character offset to start at. Default 0. */
  offset?: number;
  /** Maximum characters to return. Default: the rest of the payload. */
  limit?: number;
};

/**
 * One window of an artifact, as returned by `ArtifactStore.retrieveRange` or
 * by the shared reader when the store only supports whole-payload reads.
 *
 * Offsets and lengths are CHARACTERS (UTF-16 code units, the unit
 * `String.prototype.slice` and `retrieve_context`'s `offset` / `limit` use),
 * never bytes — so a model advancing `offset` by the characters it received
 * lands exactly where the previous window ended.
 */
export type ArtifactWindow = {
  /** The characters in `[offset, offset + content.length)`. */
  content: string;
  /** Character offset this window starts at. */
  offset: number;
  /** Total character length of the whole payload. */
  totalLength: number;
};

/** One hit from a literal search over an artifact. */
export type ArtifactSearchMatch = {
  /** Character offset of the match — pass it back as `offset` to read there. */
  offset: number;
  /** 1-based line number the match sits on. */
  line: number;
  /** Character offset the snippet starts at (≤ `offset`). */
  snippetOffset: number;
  /**
   * Bounded context around the match. Bounded on purpose: an MCP artifact is
   * usually one compact JSON line, so "the matching line" would be the whole
   * payload.
   */
  snippet: string;
};

/** Result of a literal search over an artifact. */
export type ArtifactSearchResult = {
  /** Matches returned, in payload order. */
  matches: ArtifactSearchMatch[];
  /** `matches.length`. */
  matchCount: number;
  /** Every match in the payload, including the ones not returned. */
  totalMatches: number;
  /** True when `totalMatches > matchCount`. */
  truncated: boolean;
  /** Character offset to pass as `offset` to search for the next matches. */
  nextSearchOffset?: number;
};

// ---------------------------------------------------------------------------
// ArtifactStore interface
// ---------------------------------------------------------------------------

/**
 * Pluggable storage contract for externalized MCP tool outputs and banked
 * payloads.
 *
 * Shipped backends: `LocalTempArtifactStore` (filesystem, per-process index
 * with a cross-process sidecar) and `RedisArtifactStore` (TTL-expired, shared
 * across replicas, range reads). Pick one with `artifacts.storage` or the
 * `STORAGE_TYPE` environment variable, or inject any implementation via
 * `artifacts.store` / `setArtifactStore()`.
 *
 * Only `store`, `retrieve`, `delete`, `cleanup` and `generatePreview` are
 * required. `retrieveRange` and `close` are optional capabilities: NeuroLink
 * uses them when present and falls back cleanly when absent.
 */
export type ArtifactStore = {
  /**
   * Persist a payload and return a lightweight reference.
   * @param payload  Serialized tool output (JSON string or plain text).
   * @param meta     Descriptor without `createdAt` (assigned internally).
   */
  store(
    payload: string,
    meta: Omit<ArtifactMeta, "createdAt">,
  ): Promise<ArtifactRef>;

  /**
   * Retrieve the full payload by artifact ID.
   * Returns `null` if the artifact is not found or has been cleaned up.
   */
  retrieve(id: string): Promise<string | null>;

  /**
   * Retrieve one character window without materialising the whole payload.
   *
   * Optional. When present, `retrieve_context` and `readArtifact` call it for
   * every paged read instead of `retrieve()` + slice, so a backend with native
   * range reads (Redis `GETRANGE`, S3 `Range`) moves only the window. The
   * result carries `totalLength` so `hasMore` never needs the payload.
   *
   * `offset` and `limit` are characters. A backend that can only address
   * bytes must either know the payload is single-byte (ASCII) or fall back to
   * a full read and slice — it must never return a window that starts at the
   * wrong character. `limit` omitted means "to the end".
   *
   * Returns `null` if the artifact is not found or has expired.
   */
  retrieveRange?(
    id: string,
    range: ArtifactPageRequest,
  ): Promise<ArtifactWindow | null>;

  /** Delete a single artifact. No-op if the ID does not exist. */
  delete(id: string): Promise<void>;

  /**
   * Delete all artifacts older than `olderThanMs` milliseconds.
   * Returns the number of artifacts deleted.
   */
  cleanup(olderThanMs: number): Promise<number>;

  /** Generate a short preview string from a serialized payload. */
  generatePreview(payload: string): string;

  /**
   * Release whatever the store holds open (a pooled connection, a file
   * handle). Optional. NeuroLink calls it — from `shutdown()`, and when
   * `setArtifactStore()` replaces the store — only for stores it built
   * itself; a store you inject is yours to close.
   */
  close?(): Promise<void>;
};

/**
 * In-memory index row tracked by LocalTempArtifactStore.
 * Combines metadata with the on-disk path.
 */
export type IndexEntry = ArtifactMeta & {
  path: string;
  /**
   * Loaded from disk rather than stored by this process. Another process's
   * work: readable, but never expired by this process's `cleanup()`.
   */
  rehydrated?: boolean;
};

// ---------------------------------------------------------------------------
// Backend selection
// ---------------------------------------------------------------------------

/**
 * Where artifacts live. Mirrors conversation memory's `STORAGE_TYPE`:
 *  - "local"  OS temp directory, per-process index with a cross-process
 *             sidecar. Fine for one machine; artifacts do not survive a pod.
 *  - "redis"  Shared across replicas, expired by TTL, range reads via
 *             `GETRANGE`. Uses the same connection pool as Redis conversation
 *             memory.
 */
export type ArtifactStorageType = "local" | "redis";

/**
 * Artifact storage configuration (`new NeuroLink({ artifacts })`).
 *
 * Resolution order for the backend: `store` → `storage` → `STORAGE_TYPE`
 * environment variable → `"local"`. Resolution order for the Redis connection:
 * `redisConfig` → `conversationMemory.redisConfig` → `REDIS_URL` / `REDIS_HOST`
 * environment variables — so a deployment already running conversation memory
 * on Redis keeps its artifacts on the same Redis without new settings.
 */
export type ArtifactStorageConfig = {
  /** Backend to use. Default: `STORAGE_TYPE` env var, else `"local"`. */
  storage?: ArtifactStorageType;
  /**
   * Redis connection for `storage: "redis"`. `keyPrefix` defaults to
   * `neurolink:artifact:` (NOT the conversation prefix). `ttl` is seconds,
   * must be positive, and defaults to 86400; zero or negative is replaced by
   * the default with a warning — artifacts in Redis always expire.
   * `userSessionsKeyPrefix` is ignored.
   */
  redisConfig?: RedisStorageConfig;
  /**
   * A ready-made backend. Wins over `storage`. Use this for S3, a database,
   * or a wrapped store; `setArtifactStore()` does the same after construction.
   */
  store?: ArtifactStore;
};

/**
 * What `RedisArtifactStore` keeps beside each payload. `charLength` is what
 * makes range reads honest: when it equals `sizeBytes` the payload is pure
 * ASCII and a byte range IS a character range.
 */
export type RedisArtifactRecord = ArtifactMeta & {
  /** `payload.length` at store time — characters, not bytes. */
  charLength: number;
};
