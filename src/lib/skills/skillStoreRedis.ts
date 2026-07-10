/**
 * Redis-backed skill store.
 *
 * Reuses NeuroLink's pooled Redis client (`redis` v5 is already a core
 * dependency, shared with Redis conversation memory). One JSON value per
 * skill under `<keyPrefix><id>`; the index is derived with SCAN + MGET —
 * no separate index document to drift. Skills are persistent (no TTL).
 */

import type {
  RedisClient,
  SkillDefinition,
  SkillIndexItem,
  SkillRedisStorageConfig,
  SkillStore,
} from "../types/index.js";
import {
  getNormalizedConfig,
  getPooledRedisClient,
  scanKeys,
} from "../utils/redis.js";
import { logger } from "../utils/logger.js";
import { isSafeSkillResourcePath, toSkillIndexItem } from "./skillMatcher.js";

const DEFAULT_KEY_PREFIX = "neurolink:skills:";

export class RedisSkillStore implements SkillStore {
  private readonly keyPrefix: string;
  /**
   * Resources live under `<keyPrefix>__resources__:` — a reserved segment
   * inside the skill prefix, explicitly excluded from the index SCAN so
   * resource values are never mistaken for skills, whatever the
   * configured keyPrefix looks like.
   */
  private readonly resourcePrefix: string;
  private readonly normalizedConfig: ReturnType<typeof getNormalizedConfig>;
  private clientPromise: Promise<RedisClient> | null = null;

  constructor(config: SkillRedisStorageConfig) {
    this.keyPrefix = config.keyPrefix ?? DEFAULT_KEY_PREFIX;
    this.resourcePrefix = `${this.keyPrefix}__resources__:`;
    this.normalizedConfig = getNormalizedConfig({
      ...(config.url ? { url: config.url } : {}),
      ...(config.host ? { host: config.host } : {}),
      ...(config.port !== undefined ? { port: config.port } : {}),
      ...(config.username ? { username: config.username } : {}),
      ...(config.password ? { password: config.password } : {}),
      ...(config.db !== undefined ? { db: config.db } : {}),
      keyPrefix: this.keyPrefix,
    });
  }

  private getClient(): Promise<RedisClient> {
    if (!this.clientPromise) {
      this.clientPromise = getPooledRedisClient(this.normalizedConfig).catch(
        (error) => {
          // Reset so a later call can retry after a transient outage.
          this.clientPromise = null;
          throw error;
        },
      );
    }
    return this.clientPromise;
  }

  private skillKey(id: string): string {
    return `${this.keyPrefix}${id}`;
  }

  async getResource(id: string, resourcePath: string): Promise<string | null> {
    if (!isSafeSkillResourcePath(resourcePath)) {
      return null;
    }
    const client = await this.getClient();
    const raw = await client.get(`${this.resourcePrefix}${id}:${resourcePath}`);
    return raw ? String(raw) : null;
  }

  async get(id: string): Promise<SkillDefinition | null> {
    const client = await this.getClient();
    const raw = await client.get(this.skillKey(id));
    return raw ? this.parseSkill(String(raw), this.skillKey(id)) : null;
  }

  async put(skill: SkillDefinition): Promise<void> {
    const client = await this.getClient();
    // Persistent — deliberately no TTL: skills must not expire silently.
    await client.set(this.skillKey(skill.id), JSON.stringify(skill));
  }

  async delete(id: string): Promise<void> {
    const client = await this.getClient();
    await client.del(this.skillKey(id));
  }

  async index(): Promise<SkillIndexItem[]> {
    const client = await this.getClient();
    const keys = (await scanKeys(client, `${this.keyPrefix}*`)).filter(
      (key) => !key.startsWith(this.resourcePrefix),
    );
    if (keys.length === 0) {
      return [];
    }
    const values = await client.mGet(keys);
    const items: SkillIndexItem[] = [];
    values.forEach((value, i) => {
      if (!value) {
        return;
      }
      const skill = this.parseSkill(String(value), keys[i]);
      if (skill) {
        items.push(toSkillIndexItem(skill));
      }
    });
    return items;
  }

  private parseSkill(raw: string, key: string): SkillDefinition | null {
    try {
      const parsed = JSON.parse(raw) as SkillDefinition;
      if (
        typeof parsed?.id === "string" &&
        typeof parsed?.name === "string" &&
        typeof parsed?.description === "string" &&
        typeof parsed?.instructions === "string"
      ) {
        return parsed;
      }
      logger.warn("[SkillStoreRedis] Value is not a valid skill — skipping", {
        key,
      });
      return null;
    } catch (error) {
      logger.warn("[SkillStoreRedis] Failed to parse skill value", {
        key,
        error: error instanceof Error ? error.message : String(error),
      });
      return null;
    }
  }
}
