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
 * `RedisArtifactStore` is the shared-across-replicas backend; anything else
 * (S3, a database) implements ArtifactStore and is injected via
 * `artifacts.store` or `setArtifactStore()`.
 *
 * @module artifacts/artifactStore
 */

import { randomUUID } from "node:crypto";
import { mkdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { logger } from "../utils/logger.js";
import type {
  ArtifactMeta,
  ArtifactRef,
  ArtifactStore,
  IndexEntry,
} from "../types/index.js";
import { generateArtifactPreview, isSafeArtifactId } from "./artifactReader.js";

// ---------------------------------------------------------------------------
// LocalTempArtifactStore
// ---------------------------------------------------------------------------

/**
 * Sidecar written beside every payload so a process that never called
 * `store()` can still resolve the id (see the index-miss path in `retrieve`).
 */
const META_SUFFIX = ".meta.json";

/** Extensions `store()` can produce, in the order the fallback probes them. */
const PAYLOAD_EXTENSIONS = [".json", ".txt"] as const;

/**
 * Runtime shape check for a sidecar read off disk — it is untrusted input
 * (another process, an older version, a truncated write), so it is validated
 * rather than asserted into `IndexEntry`.
 */
function parseSidecar(value: unknown): IndexEntry | undefined {
  if (!value || typeof value !== "object") {
    return undefined;
  }
  const row: Record<string, unknown> = { ...value };
  const { toolName, serverId, sizeBytes, contentType, createdAt, path } = row;
  if (
    typeof toolName !== "string" ||
    typeof serverId !== "string" ||
    typeof sizeBytes !== "number" ||
    (contentType !== "json" && contentType !== "text") ||
    typeof createdAt !== "number" ||
    typeof path !== "string"
  ) {
    return undefined;
  }
  const entry: IndexEntry = {
    toolName,
    serverId,
    sizeBytes,
    contentType,
    createdAt,
    path,
  };
  if (typeof row.sessionId === "string") {
    entry.sessionId = row.sessionId;
  }
  if (typeof row.label === "string") {
    entry.label = row.label;
  }
  const kind = row.kind;
  if (
    kind === "worker-report" ||
    kind === "command-output" ||
    kind === "stage-output" ||
    kind === "other"
  ) {
    entry.kind = kind;
  }
  return entry;
}

/**
 * Filesystem-backed artifact store using the OS temp directory.
 *
 * Files are written with mode 0o600 (owner read/write only).
 * An in-memory index tracks metadata for the fast path; every payload also
 * gets a `<id>.meta.json` sidecar, so an id this process never stored — from
 * another process, or from before a restart — still resolves (see
 * `rehydrate`). `cleanup()` remains index-scoped: it expires what this process
 * knows about, and never walks the directory deleting another process's work.
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
  private readonly rehydrateFromDisk: boolean;

  /**
   * @param dir - Storage directory; defaults to `tmpdir()/neurolink-artifacts`
   * @param options - `rehydrateFromDisk` (default true) lets `retrieve()` and
   *   `delete()` fall back to the on-disk sidecar index on an in-memory miss,
   *   which makes artifacts READABLE AND DELETABLE ACROSS PROCESSES sharing
   *   the same directory and unix user. Pass `false` — or set
   *   `NEUROLINK_ARTIFACT_REHYDRATE=false` — to restore strict per-process
   *   isolation: ids not stored by this process resolve to nothing.
   */
  constructor(dir?: string, options?: { rehydrateFromDisk?: boolean }) {
    this.dir = dir ?? join(tmpdir(), "neurolink-artifacts");
    this.rehydrateFromDisk =
      options?.rehydrateFromDisk ??
      process.env.NEUROLINK_ARTIFACT_REHYDRATE !== "false";
  }

  generatePreview(payload: string): string {
    return generateArtifactPreview(payload);
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
    await this.writeSidecar(id, fullMeta);

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
    const entry =
      this.index.get(id) ??
      (this.rehydrateFromDisk ? await this.rehydrate(id) : undefined);
    if (!entry) {
      logger.debug(`[ArtifactStore] Artifact ${id} not found on disk`);
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
    const entry =
      this.index.get(id) ??
      (this.rehydrateFromDisk ? await this.rehydrate(id) : undefined);
    if (!entry) {
      return;
    }
    try {
      await rm(entry.path, { force: true });
      await rm(join(this.dir, `${id}${META_SUFFIX}`), { force: true });
    } catch {
      // Suppress — files may already be gone
    }
    this.index.delete(id);
  }

  async cleanup(olderThanMs: number): Promise<number> {
    const cutoff = Date.now() - olderThanMs;
    let count = 0;
    for (const [id, entry] of this.index.entries()) {
      // Rehydrated entries are another process's artifacts — readable from
      // here, but never this process's to expire.
      if (entry.rehydrated === true) {
        continue;
      }
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

  /**
   * Record the index row next to the payload.
   *
   * The index is per-process, so without this an artifact written by one
   * process is invisible to every other one — and to the same process after a
   * restart. A failed sidecar write is logged, never fatal: the payload is
   * already safely on disk and this process can still read it from its index.
   */
  private async writeSidecar(id: string, entry: IndexEntry): Promise<void> {
    try {
      await writeFile(
        join(this.dir, `${id}${META_SUFFIX}`),
        JSON.stringify(entry),
        { encoding: "utf-8", mode: 0o600 },
      );
    } catch (err) {
      logger.warn(
        `[ArtifactStore] Failed to write index sidecar for ${id} — the ` +
          `artifact stays readable in this process only: ${
            err instanceof Error ? err.message : String(err)
          }`,
      );
    }
  }

  /**
   * Resolve an id the in-memory index does not know: another process stored
   * it, or this process restarted. Reads the sidecar first (full metadata);
   * falls back to probing the payload file itself, so an artifact whose
   * sidecar was lost is still readable with metadata recovered from `stat`.
   *
   * Returns undefined for an unsafe id without touching the filesystem: before
   * this fallback existed an unknown id simply missed the in-memory map, and
   * now that a miss probes `join(dir, id + ext)` the id — which arrives from
   * the model — reaches the path layer. See `isSafeArtifactId`.
   */
  private async rehydrate(id: string): Promise<IndexEntry | undefined> {
    if (!isSafeArtifactId(id)) {
      logger.debug(`[ArtifactStore] Rejected unsafe artifact id "${id}"`);
      return undefined;
    }
    try {
      const raw = await readFile(
        join(this.dir, `${id}${META_SUFFIX}`),
        "utf-8",
      );
      const entry = parseSidecar(JSON.parse(raw));
      if (entry) {
        // The payload's location is fully determined by id + contentType, and
        // the store directory is shared OS temp — so the path is DERIVED, never
        // honoured from a sidecar another local account could have planted
        // before this store first ran.
        const derived: IndexEntry = {
          ...entry,
          path: join(
            this.dir,
            `${id}${entry.contentType === "json" ? ".json" : ".txt"}`,
          ),
          rehydrated: true,
        };
        this.index.set(id, derived);
        return derived;
      }
    } catch {
      // No sidecar, or an unreadable one — fall through to the probe.
    }
    for (const ext of PAYLOAD_EXTENSIONS) {
      const path = join(this.dir, `${id}${ext}`);
      try {
        const stats = await stat(path);
        const entry: IndexEntry = {
          toolName: "unknown",
          serverId: "unknown",
          sizeBytes: stats.size,
          contentType: ext === ".json" ? "json" : "text",
          createdAt: stats.mtimeMs,
          path,
          rehydrated: true,
        };
        this.index.set(id, entry);
        return entry;
      } catch {
        // Not this extension — try the next.
      }
    }
    return undefined;
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
