/**
 * Artifact Store Types (canonical location)
 *
 * Types for the MCP large-output artifact storage system.
 * When mcp.outputLimits.strategy = "externalize", oversized MCP tool outputs
 * are stored as artifacts and the model receives a compact surrogate instead.
 *
 * @module types/artifactTypes
 */

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

// ---------------------------------------------------------------------------
// ArtifactStore interface
// ---------------------------------------------------------------------------

/**
 * Pluggable storage contract for externalized MCP tool outputs.
 *
 * Default backend: LocalTempArtifactStore (filesystem, single-process).
 * Future backends can implement this interface for S3, Redis blobs, etc.
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

  /** Delete a single artifact. No-op if the ID does not exist. */
  delete(id: string): Promise<void>;

  /**
   * Delete all artifacts older than `olderThanMs` milliseconds.
   * Returns the number of artifacts deleted.
   */
  cleanup(olderThanMs: number): Promise<number>;

  /** Generate a short preview string from a serialized payload. */
  generatePreview(payload: string): string;
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
