/**
 * RedisCheckpointStore
 *
 * Redis-based implementation of CheckpointStore for production use.
 * Uses the existing NeuroLink Redis connection pool.
 */

import type { CheckpointStore, CheckpointListing } from "./checkpointStore.js";
import type { LoopSnapshot } from "../loopTypes.js";

/**
 * Redis client type from the redis package.
 */
type RedisClient = {
  get(key: string): Promise<string | null>;
  set(
    key: string,
    value: string,
    options?: { EX?: number },
  ): Promise<string | null>;
  del(key: string): Promise<number>;
  exists(key: string): Promise<number>;
  scan(
    cursor: number,
    options: { MATCH: string; COUNT: number },
  ): Promise<{ cursor: number; keys: string[] }>;
};

/**
 * Configuration for Redis checkpoint store.
 */
export interface RedisCheckpointConfig {
  /** Redis client instance */
  client: RedisClient;
  /** Key prefix (default: "neurolink:checkpoint:") */
  prefix?: string;
  /** TTL in seconds (default: 7 days) */
  ttl?: number;
}

/**
 * Redis-based checkpoint store for production environments.
 *
 * Uses an existing Redis connection for state persistence.
 * Supports TTL for automatic expiration of old checkpoints.
 *
 * @example
 * ```typescript
 * const redis = await getPooledRedisClient(redisConfig);
 * const store = new RedisCheckpointStore({
 *   client: redis,
 *   prefix: "myapp:checkpoint:",
 *   ttl: 86400 // 1 day
 * });
 * ```
 */
export class RedisCheckpointStore implements CheckpointStore {
  private client: RedisClient;
  private prefix: string;
  private ttl?: number;

  constructor(config: RedisCheckpointConfig) {
    this.client = config.client;
    this.prefix = config.prefix ?? "neurolink:checkpoint:";
    this.ttl = config.ttl;
  }

  /**
   * Get the Redis key for a loop.
   */
  private getKey(loopId: string): string {
    return `${this.prefix}${loopId}`;
  }

  async save(snapshot: LoopSnapshot): Promise<void> {
    const key = this.getKey(snapshot.loopId);
    const value = JSON.stringify(snapshot);

    const options: { EX?: number } = {};
    if (this.ttl) {
      options.EX = this.ttl;
    }

    await this.client.set(key, value, options);
  }

  async load(loopId: string): Promise<LoopSnapshot | null> {
    const key = this.getKey(loopId);
    const value = await this.client.get(key);

    if (!value) {
      return null;
    }

    try {
      return JSON.parse(value) as LoopSnapshot;
    } catch {
      return null;
    }
  }

  async list(filter?: { status?: string }): Promise<CheckpointListing[]> {
    const pattern = `${this.prefix}*`;
    const keys: string[] = [];

    // Scan for all checkpoint keys
    let cursor = 0;
    do {
      const result = await this.client.scan(cursor, {
        MATCH: pattern,
        COUNT: 100,
      });
      cursor = result.cursor;
      keys.push(...result.keys);
    } while (cursor !== 0);

    // Load and filter snapshots
    const listings: CheckpointListing[] = [];

    for (const key of keys) {
      try {
        const value = await this.client.get(key);
        if (!value) {
          continue;
        }

        const snapshot = JSON.parse(value) as LoopSnapshot;

        if (filter?.status && snapshot.status !== filter.status) {
          continue;
        }

        // Extract loopId from key
        const loopId = key.slice(this.prefix.length);

        listings.push({
          loopId,
          status: snapshot.status,
          goal: snapshot.goalText.substring(0, 100),
          updatedAt: snapshot.lastCheckpointAt,
        });
      } catch {
        // Skip invalid entries
        continue;
      }
    }

    // Sort by updatedAt descending
    return listings.sort(
      (a, b) =>
        new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
    );
  }

  async delete(loopId: string): Promise<void> {
    const key = this.getKey(loopId);
    await this.client.del(key);
  }

  async exists(loopId: string): Promise<boolean> {
    const key = this.getKey(loopId);
    const result = await this.client.exists(key);
    return result > 0;
  }

  /**
   * Get the configured key prefix.
   */
  getPrefix(): string {
    return this.prefix;
  }

  /**
   * Get the TTL in seconds.
   */
  getTTL(): number | undefined {
    return this.ttl;
  }
}
