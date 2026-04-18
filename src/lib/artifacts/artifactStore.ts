/**
 * Artifact Store
 *
 * Pluggable storage for externalized MCP tool outputs.
 *
 * When `mcp.outputLimits.strategy = "externalize"` the full tool payload is
 * written here instead of being sent inline to the LLM. The model receives a
 * compact surrogate with a preview and an artifact ID. The full payload can be
 * retrieved on demand via the `retrieve_context` tool.
 *
 * Architecture:
 *   ArtifactStore (interface) — canonical types in src/lib/types/artifactTypes.ts
 *   LocalTempArtifactStore   — single-process, filesystem-backed implementation
 *
 * Distributed backends (S3, Redis blobs) can be added later by implementing
 * ArtifactStore from types/artifactTypes.ts.
 *
 * @module artifacts/artifactStore
 */

import { randomUUID } from "node:crypto";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { logger } from "../utils/logger.js";
import type {
  ArtifactMeta,
  ArtifactRef,
  ArtifactStore,
  IndexEntry,
} from "../types/index.js";

// Re-export so callers can import everything from one place

// ---------------------------------------------------------------------------
// LocalTempArtifactStore
// ---------------------------------------------------------------------------

/** Characters used for the quick preview embedded in surrogate results. */
const DEFAULT_PREVIEW_CHARS = 500;

/**
 * Filesystem-backed artifact store using the OS temp directory.
 *
 * Files are written with mode 0o600 (owner read/write only).
 * An in-memory index tracks metadata without a separate index file.
 *
 * Suitable for:
 *  - CLI usage
 *  - Single-process SDK deployments
 *  - Multi-process deployments where each process manages its own artifacts
 *    (artifacts created in one process are not visible to others)
 *
 * @example
 * ```typescript
 * const store = new LocalTempArtifactStore();
 * const ref = await store.store(largeJson, {
 *   toolName: "list_files",
 *   serverId: "filesystem-server",
 *   sizeBytes: Buffer.byteLength(largeJson),
 *   contentType: "json",
 * });
 * // Later, via retrieve_context:
 * const full = await store.retrieve(ref.id);
 * ```
 */
export class LocalTempArtifactStore implements ArtifactStore {
  private readonly dir: string;
  private readonly index: Map<string, IndexEntry> = new Map();

  constructor(dir?: string) {
    this.dir = dir ?? join(tmpdir(), "neurolink-artifacts");
  }

  generatePreview(payload: string): string {
    if (payload.length <= DEFAULT_PREVIEW_CHARS) {
      return payload;
    }
    return `${payload.slice(0, DEFAULT_PREVIEW_CHARS)}…`;
  }

  async store(
    payload: string,
    meta: Omit<ArtifactMeta, "createdAt">,
  ): Promise<ArtifactRef> {
    await mkdir(this.dir, { recursive: true, mode: 0o700 });

    const id = randomUUID();
    const ext = meta.contentType === "json" ? ".json" : ".txt";
    const filePath = join(this.dir, `${id}${ext}`);

    await writeFile(filePath, payload, { encoding: "utf-8", mode: 0o600 });

    const fullMeta: IndexEntry = {
      ...meta,
      createdAt: Date.now(),
      path: filePath,
    };
    this.index.set(id, fullMeta);

    logger.debug(
      `[ArtifactStore] Stored artifact ${id} for tool "${meta.toolName}" ` +
        `(${formatBytes(meta.sizeBytes)})`,
    );

    return {
      id,
      preview: this.generatePreview(payload),
      sizeBytes: meta.sizeBytes,
      meta: { ...meta, createdAt: fullMeta.createdAt },
    };
  }

  async retrieve(id: string): Promise<string | null> {
    const entry = this.index.get(id);
    if (!entry) {
      logger.debug(`[ArtifactStore] Artifact ${id} not in index`);
      return null;
    }
    try {
      const content = await readFile(entry.path, "utf-8");
      logger.debug(
        `[ArtifactStore] Retrieved artifact ${id} (${formatBytes(entry.sizeBytes)})`,
      );
      return content;
    } catch (err) {
      logger.warn(
        `[ArtifactStore] Failed to read artifact ${id}: ${
          err instanceof Error ? err.message : String(err)
        }`,
      );
      return null;
    }
  }

  async delete(id: string): Promise<void> {
    const entry = this.index.get(id);
    if (!entry) {
      return;
    }
    try {
      await rm(entry.path, { force: true });
    } catch {
      // Suppress — file may already be gone
    }
    this.index.delete(id);
  }

  async cleanup(olderThanMs: number): Promise<number> {
    const cutoff = Date.now() - olderThanMs;
    let count = 0;
    for (const [id, entry] of this.index.entries()) {
      if (entry.createdAt < cutoff) {
        await this.delete(id);
        count++;
      }
    }
    if (count > 0) {
      logger.debug(`[ArtifactStore] Cleaned up ${count} expired artifact(s)`);
    }
    return count;
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatBytes(bytes: number): string {
  if (bytes < 1024) {
    return `${bytes} B`;
  }
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
