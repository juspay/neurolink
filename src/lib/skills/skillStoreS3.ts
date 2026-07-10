/**
 * S3-backed skill store.
 *
 * Layout (curator-compatible):
 *   <prefix>skills/<id>.json  — one JSON-serialized SkillDefinition per object
 *   <prefix>index.json        — { lastUpdated, skills: SkillIndexItem[] }
 *
 * The index document is upserted on every write and rebuilt from a bucket
 * listing when missing or unparsable (self-healing). Concurrent writers can
 * race the index read-modify-write; the rebuild path recovers from any
 * resulting drift, matching curator's production behavior.
 *
 * @aws-sdk/client-s3 is an optional peer — loaded lazily with the same
 * createRequire pattern as memory's @juspay/hippocampus so importing
 * NeuroLink core never requires the AWS SDK. Tests (and hosts with
 * pre-configured clients) inject a SkillS3ObjectOps implementation instead.
 */

import { createRequire } from "node:module";
import type {
  SkillDefinition,
  SkillIndexItem,
  SkillS3ConditionalGetResult,
  SkillS3IndexDocument,
  SkillS3ModuleSurface,
  SkillS3ObjectOps,
  SkillS3StorageConfig,
  SkillStore,
} from "../types/index.js";
import { logger } from "../utils/logger.js";
import { isSafeSkillResourcePath, toSkillIndexItem } from "./skillMatcher.js";

const lazyRequire = createRequire(import.meta.url);

let cachedS3Module: SkillS3ModuleSurface | null | undefined;

function loadS3Module(): SkillS3ModuleSurface | null {
  if (cachedS3Module !== undefined) {
    return cachedS3Module;
  }
  try {
    cachedS3Module = lazyRequire("@aws-sdk/client-s3") as SkillS3ModuleSurface;
    return cachedS3Module;
  } catch (error) {
    cachedS3Module = null;
    logger.debug(
      "[SkillStoreS3] @aws-sdk/client-s3 is not installed; S3 skill storage unavailable.",
      { error: error instanceof Error ? error.message : String(error) },
    );
    return null;
  }
}

/** Build default object ops from @aws-sdk/client-s3. Throws when absent. */
function createDefaultOps(config: SkillS3StorageConfig): SkillS3ObjectOps {
  const mod = loadS3Module();
  if (!mod) {
    throw new Error(
      "Skills S3 storage requires @aws-sdk/client-s3. Run `pnpm add @aws-sdk/client-s3` " +
        "(or your package manager equivalent), or supply a custom store instead.",
    );
  }

  const client = new mod.S3Client({
    ...(config.region ? { region: config.region } : {}),
    ...(config.endpoint ? { endpoint: config.endpoint } : {}),
    ...(config.forcePathStyle !== undefined
      ? { forcePathStyle: config.forcePathStyle }
      : {}),
    ...(config.credentials ? { credentials: config.credentials } : {}),
  });
  const bucket = config.bucket;

  return {
    async getObject(key: string): Promise<string | null> {
      try {
        const response = (await client.send(
          new mod.GetObjectCommand({ Bucket: bucket, Key: key }),
        )) as { Body?: { transformToString: () => Promise<string> } };
        return (await response.Body?.transformToString()) ?? null;
      } catch (error) {
        const name = (error as { name?: string }).name;
        if (name === "NoSuchKey" || name === "NotFound") {
          return null;
        }
        throw error;
      }
    },
    async putObject(key: string, body: string): Promise<void> {
      await client.send(
        new mod.PutObjectCommand({
          Bucket: bucket,
          Key: key,
          Body: body,
          ContentType: "application/json",
        }),
      );
    },
    async deleteObject(key: string): Promise<void> {
      await client.send(
        new mod.DeleteObjectCommand({ Bucket: bucket, Key: key }),
      );
    },
    async listKeys(prefix: string): Promise<string[]> {
      const keys: string[] = [];
      let continuationToken: string | undefined;
      do {
        const response = (await client.send(
          new mod.ListObjectsV2Command({
            Bucket: bucket,
            Prefix: prefix,
            ...(continuationToken
              ? { ContinuationToken: continuationToken }
              : {}),
          }),
        )) as {
          Contents?: Array<{ Key?: string }>;
          NextContinuationToken?: string;
          IsTruncated?: boolean;
        };
        for (const item of response.Contents ?? []) {
          if (item.Key) {
            keys.push(item.Key);
          }
        }
        continuationToken = response.IsTruncated
          ? response.NextContinuationToken
          : undefined;
      } while (continuationToken);
      return keys;
    },
    async getObjectConditional(
      key: string,
      etag?: string,
    ): Promise<SkillS3ConditionalGetResult> {
      try {
        const response = (await client.send(
          new mod.GetObjectCommand({
            Bucket: bucket,
            Key: key,
            ...(etag ? { IfNoneMatch: etag } : {}),
          }),
        )) as {
          Body?: { transformToString: () => Promise<string> };
          ETag?: string;
        };
        const body = (await response.Body?.transformToString()) ?? null;
        return {
          body,
          ...(response.ETag ? { etag: response.ETag } : {}),
        };
      } catch (error) {
        const name = (error as { name?: string }).name;
        const status = (error as { $metadata?: { httpStatusCode?: number } })
          .$metadata?.httpStatusCode;
        if (status === 304 || name === "304" || name === "NotModified") {
          return { body: null, notModified: true };
        }
        if (name === "NoSuchKey" || name === "NotFound") {
          return { body: null };
        }
        throw error;
      }
    },
  };
}

export class S3SkillStore implements SkillStore {
  private readonly prefix: string;
  private ops: SkillS3ObjectOps | null = null;
  /** Last parsed index + its ETag, revalidated with If-None-Match reads. */
  private cachedIndexDoc: SkillS3IndexDocument | null = null;
  private cachedIndexEtag: string | undefined;

  constructor(
    private readonly config: SkillS3StorageConfig,
    /** Test/host seam — omit to build ops from @aws-sdk/client-s3 lazily. */
    private readonly injectedOps?: SkillS3ObjectOps,
  ) {
    const rawPrefix = config.prefix ?? "neurolink-skills/";
    this.prefix =
      rawPrefix === "" || rawPrefix.endsWith("/") ? rawPrefix : `${rawPrefix}/`;
  }

  invalidate(): void {
    this.cachedIndexDoc = null;
    this.cachedIndexEtag = undefined;
  }

  private getOps(): SkillS3ObjectOps {
    if (!this.ops) {
      this.ops = this.injectedOps ?? createDefaultOps(this.config);
    }
    return this.ops;
  }

  private skillKey(id: string): string {
    return `${this.prefix}skills/${id}.json`;
  }

  private indexKey(): string {
    return `${this.prefix}index.json`;
  }

  /** Resources live beside the skill object: <prefix>skills/<id>/<path>. */
  private resourceKey(id: string, resourcePath: string): string {
    return `${this.prefix}skills/${id}/${resourcePath}`;
  }

  async getResource(id: string, resourcePath: string): Promise<string | null> {
    if (!isSafeSkillResourcePath(resourcePath)) {
      return null;
    }
    return this.getOps().getObject(this.resourceKey(id, resourcePath));
  }

  async get(id: string): Promise<SkillDefinition | null> {
    const body = await this.getOps().getObject(this.skillKey(id));
    if (!body) {
      return null;
    }
    try {
      return JSON.parse(body) as SkillDefinition;
    } catch (error) {
      logger.warn("[SkillStoreS3] Failed to parse skill object", {
        id,
        error: error instanceof Error ? error.message : String(error),
      });
      return null;
    }
  }

  async put(skill: SkillDefinition): Promise<void> {
    const ops = this.getOps();
    await ops.putObject(
      this.skillKey(skill.id),
      JSON.stringify(skill, null, 2),
    );
    const index = await this.readOrRebuildIndex();
    const entry = toSkillIndexItem(skill);
    const position = index.skills.findIndex((s) => s.id === skill.id);
    if (position >= 0) {
      index.skills[position] = entry;
    } else {
      index.skills.push(entry);
    }
    await this.writeIndex(index);
  }

  async delete(id: string): Promise<void> {
    const ops = this.getOps();
    await ops.deleteObject(this.skillKey(id));
    const index = await this.readOrRebuildIndex();
    index.skills = index.skills.filter((s) => s.id !== id);
    await this.writeIndex(index);
  }

  async index(): Promise<SkillIndexItem[]> {
    const index = await this.readOrRebuildIndex();
    return index.skills;
  }

  private async writeIndex(index: SkillS3IndexDocument): Promise<void> {
    index.lastUpdated = new Date().toISOString();
    await this.getOps().putObject(
      this.indexKey(),
      JSON.stringify(index, null, 2),
    );
    // The write changed the object's ETag; keep the doc, revalidate next read.
    this.cachedIndexDoc = index;
    this.cachedIndexEtag = undefined;
  }

  /**
   * Raw index.json read. Returns the body (with its ETag when available),
   * null body when the object is absent, or notModified when a
   * conditional read reported the cached copy unchanged.
   */
  private async readIndexObject(
    ops: SkillS3ObjectOps,
  ): Promise<SkillS3ConditionalGetResult> {
    if (ops.getObjectConditional) {
      return ops.getObjectConditional(
        this.indexKey(),
        this.cachedIndexDoc ? this.cachedIndexEtag : undefined,
      );
    }
    return { body: await ops.getObject(this.indexKey()) };
  }

  /**
   * Read index.json (ETag-revalidated when the ops support conditional
   * reads — an unchanged index costs a 304, not a download); when missing
   * or unparsable, rebuild it from a listing of the skills/ prefix and
   * persist the rebuilt document (self-heal).
   */
  private async readOrRebuildIndex(): Promise<SkillS3IndexDocument> {
    const ops = this.getOps();
    const read = await this.readIndexObject(ops);
    if (read.notModified && this.cachedIndexDoc) {
      return this.cachedIndexDoc;
    }
    if (read.body) {
      try {
        const parsed = JSON.parse(read.body) as SkillS3IndexDocument;
        if (Array.isArray(parsed.skills)) {
          this.cachedIndexDoc = parsed;
          // Cache the ETag only for a body that parsed: pairing a corrupt
          // object's ETag with the previous good doc would make every
          // later conditional read 304 into permanently stale data.
          this.cachedIndexEtag = read.etag;
          return parsed;
        }
      } catch (error) {
        logger.warn("[SkillStoreS3] index.json unparsable — rebuilding", {
          error: error instanceof Error ? error.message : String(error),
        });
      }
      this.cachedIndexEtag = undefined;
    }

    const skillsPrefix = `${this.prefix}skills/`;
    const keys = await ops.listKeys(skillsPrefix);
    const skills: SkillIndexItem[] = [];
    for (const key of keys) {
      if (!key.endsWith(".json")) {
        continue;
      }
      const body = await ops.getObject(key);
      if (!body) {
        continue;
      }
      try {
        skills.push(toSkillIndexItem(JSON.parse(body) as SkillDefinition));
      } catch {
        logger.warn("[SkillStoreS3] Skipping unparsable skill during rebuild", {
          key,
        });
      }
    }

    const rebuilt: SkillS3IndexDocument = {
      lastUpdated: new Date().toISOString(),
      skills,
    };
    // Cache the rebuilt doc even when persistence below fails, so reads
    // don't fall back to a stale pre-rebuild copy.
    this.cachedIndexDoc = rebuilt;
    this.cachedIndexEtag = undefined;
    try {
      await this.writeIndex(rebuilt);
      logger.info("[SkillStoreS3] Rebuilt skills index", {
        count: skills.length,
      });
    } catch (error) {
      // Index persistence is best-effort; the rebuilt in-memory copy is
      // still returned so reads keep working.
      logger.warn("[SkillStoreS3] Failed to persist rebuilt index", {
        error: error instanceof Error ? error.message : String(error),
      });
    }
    return rebuilt;
  }
}
