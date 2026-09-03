/**
 * Redis Artifact Store
 *
 * The artifact backend for more than one machine. `LocalTempArtifactStore`
 * writes to a pod's own `/tmp`: a replica that did not store an artifact
 * cannot read it, a redeploy loses all of them, and `cleanup()` can only
 * expire what its own process wrote. Here every replica sees every artifact,
 * Redis expires them by TTL, and a paged read moves only the window.
 *
 * Layout, under `keyPrefix` (default `neurolink:artifact:`):
 *
 *   <prefix><id>        STRING  the payload, verbatim
 *   <prefix><id>:meta   STRING  JSON `RedisArtifactRecord`
 *
 * Both keys carry the same TTL and are written in one MULTI, so an id either
 * resolves completely or not at all.
 *
 * Range reads are honest about units. `retrieve_context` addresses characters;
 * `GETRANGE` addresses bytes. The record stores the payload's character length
 * next to its byte length, and only when the two are equal — pure ASCII, which
 * is what JSON tool output and logs almost always are — is a byte range used
 * as a character range. Anything else falls back to a whole read and a slice,
 * which is slower and still correct. A window never starts on the wrong
 * character.
 *
 * The connection is the same pool Redis conversation memory uses, keyed by
 * host, port and database, so a deployment that already keeps sessions in
 * Redis adds no connection by keeping artifacts there too.
 *
 * @module artifacts/redisArtifactStore
 */

import { randomUUID } from "node:crypto";
import type {
  ArtifactMeta,
  ArtifactPageRequest,
  ArtifactRef,
  ArtifactStore,
  ArtifactWindow,
  RedisArtifactRecord,
  RedisClient,
  RedisStorageConfig,
} from "../types/index.js";
import { logger } from "../utils/logger.js";
import {
  getNormalizedConfig,
  getPooledRedisClient,
  releasePooledRedisClient,
} from "../utils/redis.js";
import {
  generateArtifactPreview,
  isSafeArtifactId,
  sliceArtifactWindow,
} from "./artifactReader.js";

/** Key prefix when the caller does not choose one. Never the conversation prefix. */
export const DEFAULT_ARTIFACT_KEY_PREFIX = "neurolink:artifact:";

/** Suffix of the metadata key beside each payload. */
const META_SUFFIX = ":meta";

/** Expiry when the caller does not choose one, or chooses an unusable one. */
export const DEFAULT_ARTIFACT_TTL_SECONDS = 86_400;

/** A TTL Redis can apply: a finite, positive number of seconds. */
function isUsableTtl(ttl: number | undefined): ttl is number {
  return ttl !== undefined && Number.isFinite(ttl) && ttl > 0;
}

/**
 * Runtime shape check for a record read back from Redis. It is untrusted
 * input — another version wrote it, or something else owns the key — so it is
 * validated rather than asserted.
 */
function parseRecord(value: unknown): RedisArtifactRecord | undefined {
  if (!value || typeof value !== "object") {
    return undefined;
  }
  const row: Record<string, unknown> = { ...value };
  const { toolName, serverId, sizeBytes, contentType, createdAt, charLength } =
    row;
  if (
    typeof toolName !== "string" ||
    typeof serverId !== "string" ||
    typeof sizeBytes !== "number" ||
    (contentType !== "json" && contentType !== "text") ||
    typeof createdAt !== "number" ||
    typeof charLength !== "number"
  ) {
    return undefined;
  }
  const record: RedisArtifactRecord = {
    toolName,
    serverId,
    sizeBytes,
    contentType,
    createdAt,
    charLength,
  };
  if (typeof row.sessionId === "string") {
    record.sessionId = row.sessionId;
  }
  if (typeof row.label === "string") {
    record.label = row.label;
  }
  const kind = row.kind;
  if (
    kind === "worker-report" ||
    kind === "command-output" ||
    kind === "stage-output" ||
    kind === "other"
  ) {
    record.kind = kind;
  }
  return record;
}

function parseJson(raw: string): unknown {
  try {
    return JSON.parse(raw);
  } catch {
    return undefined;
  }
}

/**
 * node-redis may hand back a Buffer for a string command; payloads are text.
 * `String(buffer)` is `buffer.toString()`, which decodes UTF-8.
 */
function asText(value: string | Buffer | null): string | null {
  return value === null ? null : String(value);
}

/**
 * Redis-backed artifact store: shared across replicas, expired by TTL,
 * range reads for ASCII payloads.
 *
 * @example
 * ```typescript
 * const store = new RedisArtifactStore({ url: process.env.REDIS_URL });
 * const neurolink = new NeuroLink({ artifacts: { store } });
 * // or let NeuroLink build it: { artifacts: { storage: "redis" } }
 * ```
 */
export class RedisArtifactStore implements ArtifactStore {
  private readonly config: Required<RedisStorageConfig>;
  private client?: RedisClient;
  private connecting?: Promise<RedisClient>;

  /**
   * @param config - Connection and key settings. `keyPrefix` defaults to
   *   `neurolink:artifact:`. `ttl` is seconds and must be positive; it
   *   defaults to 86400 (24 hours), and zero, negative or non-finite values
   *   are replaced by that default with a warning — artifacts in Redis always
   *   expire, there is no "keep forever". `userSessionsKeyPrefix` is
   *   meaningless here and ignored.
   */
  constructor(config: RedisStorageConfig = {}) {
    if (config.ttl !== undefined && !isUsableTtl(config.ttl)) {
      logger.warn(
        `[RedisArtifactStore] Ignoring ttl ${String(config.ttl)}: it must be ` +
          `a positive number of seconds — using ${DEFAULT_ARTIFACT_TTL_SECONDS}s`,
      );
    }
    this.config = getNormalizedConfig({
      ...config,
      keyPrefix: config.keyPrefix ?? DEFAULT_ARTIFACT_KEY_PREFIX,
      ttl: isUsableTtl(config.ttl) ? config.ttl : DEFAULT_ARTIFACT_TTL_SECONDS,
    });
  }

  generatePreview(payload: string): string {
    return generateArtifactPreview(payload);
  }

  async store(
    payload: string,
    meta: Omit<ArtifactMeta, "createdAt">,
  ): Promise<ArtifactRef> {
    const client = await this.getClient();
    const id = randomUUID();
    const createdAt = Date.now();
    // Measured here rather than trusted from `meta`: the ASCII fast path in
    // `retrieveRange` compares these two numbers, and a caller's estimate is
    // not evidence.
    const record: RedisArtifactRecord = {
      ...meta,
      sizeBytes: Buffer.byteLength(payload, "utf-8"),
      createdAt,
      charLength: payload.length,
    };
    const ttl = this.config.ttl;
    const options = { EX: ttl };

    await client
      .multi()
      .set(this.payloadKey(id), payload, options)
      .set(this.metaKey(id), JSON.stringify(record), options)
      .exec();

    logger.debug(
      `[RedisArtifactStore] Stored artifact ${id} for tool "${meta.toolName}" ` +
        `(${record.sizeBytes} B, ttl ${ttl}s)`,
    );

    return {
      id,
      preview: this.generatePreview(payload),
      sizeBytes: meta.sizeBytes,
      meta: { ...meta, createdAt },
    };
  }

  async retrieve(id: string): Promise<string | null> {
    if (!isSafeArtifactId(id)) {
      logger.debug(`[RedisArtifactStore] Rejected unsafe artifact id "${id}"`);
      return null;
    }
    const client = await this.getClient();
    return asText(await client.get(this.payloadKey(id)));
  }

  async retrieveRange(
    id: string,
    range: ArtifactPageRequest,
  ): Promise<ArtifactWindow | null> {
    if (!isSafeArtifactId(id)) {
      logger.debug(`[RedisArtifactStore] Rejected unsafe artifact id "${id}"`);
      return null;
    }
    const client = await this.getClient();
    const offset = Math.max(0, range.offset ?? 0);
    const limit =
      range.limit === undefined ? undefined : Math.max(0, range.limit);

    const rawRecord = asText(await client.get(this.metaKey(id)));
    const record =
      rawRecord === null ? undefined : parseRecord(parseJson(rawRecord));
    if (!record || record.charLength !== record.sizeBytes) {
      // No usable record, or a multi-byte payload where a byte offset is not
      // a character offset: read whole and cut. Still correct, just not cheap.
      const content = asText(await client.get(this.payloadKey(id)));
      return content === null
        ? null
        : sliceArtifactWindow(content, { offset, limit });
    }

    const totalLength = record.charLength;
    if (offset >= totalLength || limit === 0) {
      return { content: "", offset, totalLength };
    }
    const end = limit === undefined ? -1 : offset + limit - 1;
    const content = asText(
      await client.getRange(this.payloadKey(id), offset, end),
    );
    if (content === null || content.length === 0) {
      // GETRANGE on a missing key is "", not nil — the payload expired between
      // the record read and this one.
      return null;
    }
    return { content, offset, totalLength };
  }

  async delete(id: string): Promise<void> {
    if (!isSafeArtifactId(id)) {
      return;
    }
    const client = await this.getClient();
    await client.del([this.payloadKey(id), this.metaKey(id)]);
  }

  /**
   * Nothing to sweep: Redis expires every artifact `ttl` seconds after it was
   * written, on every replica at once, which is what `cleanup()` on the local
   * store could never do.
   */
  async cleanup(olderThanMs: number): Promise<number> {
    logger.debug(
      `[RedisArtifactStore] cleanup(${olderThanMs}) is a no-op — artifacts ` +
        `expire by TTL (${this.config.ttl}s)`,
    );
    return 0;
  }

  /**
   * Release this store's reference on the pooled connection.
   *
   * Waits for a connect that is still in flight: otherwise the reference it
   * is about to acquire would be assigned after this returned, and nothing
   * would ever release it.
   */
  async close(): Promise<void> {
    if (this.connecting) {
      try {
        await this.connecting;
      } catch {
        // The connect failed, so nothing was acquired.
      }
    }
    if (!this.client) {
      return;
    }
    this.client = undefined;
    await releasePooledRedisClient(this.config);
  }

  private payloadKey(id: string): string {
    return `${this.config.keyPrefix}${id}`;
  }

  private metaKey(id: string): string {
    return `${this.config.keyPrefix}${id}${META_SUFFIX}`;
  }

  /** Connect on first use, once, and share the pooled client afterwards. */
  private async getClient(): Promise<RedisClient> {
    if (this.client?.isOpen) {
      return this.client;
    }
    if (!this.connecting) {
      this.connecting = getPooledRedisClient(this.config)
        .then((client) => {
          this.client = client;
          return client;
        })
        .finally(() => {
          this.connecting = undefined;
        });
    }
    return this.connecting;
  }
}
