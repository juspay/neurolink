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
// ArtifactStore interface
// ---------------------------------------------------------------------------

/**
 * Pluggable storage contract for externalized MCP tool outputs.
 *
 * Default backend: LocalTempArtifactStore (filesystem, single-process).
 * Future backends can implement this interface for S3, Redis blobs, etc.
 */
export interface ArtifactStore {
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
}
