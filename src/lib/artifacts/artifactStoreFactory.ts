/**
 * Artifact store factory — picks a backend the way conversation memory does.
 *
 * Backend:    `artifacts.store` → `artifacts.storage` → `STORAGE_TYPE` → local
 * Connection: `artifacts.redisConfig` → conversation memory's `redisConfig`
 *             → `REDIS_URL` / `REDIS_HOST` … environment variables
 *
 * So `STORAGE_TYPE=redis`, which already moves sessions to Redis, moves
 * artifacts there too, on the same pooled connection, with nothing new to
 * set. The one thing never inherited is the KEY PREFIX: artifacts get their
 * own (`neurolink:artifact:`) even when the connection came from the
 * conversation config or `REDIS_KEY_PREFIX`.
 *
 * @module artifacts/artifactStoreFactory
 */

import type {
  ArtifactStorageConfig,
  ArtifactStorageType,
  ArtifactStore,
  RedisStorageConfig,
} from "../types/index.js";
import { logger } from "../utils/logger.js";
import { LocalTempArtifactStore } from "./artifactStore.js";
import {
  DEFAULT_ARTIFACT_KEY_PREFIX,
  RedisArtifactStore,
} from "./redisArtifactStore.js";

function numberFromEnv(name: string): number | undefined {
  const raw = process.env[name];
  if (raw === undefined || raw === "") {
    return undefined;
  }
  const value = Number(raw);
  return Number.isFinite(value) ? value : undefined;
}

/**
 * The Redis connection described by the environment — the same variables
 * conversation memory reads, minus `REDIS_KEY_PREFIX`, which names the
 * conversation keyspace and must not name this one.
 */
export function readArtifactRedisConfigFromEnv(): RedisStorageConfig {
  const config: RedisStorageConfig = {
    host: process.env.REDIS_HOST,
    port: numberFromEnv("REDIS_PORT"),
    password: process.env.REDIS_PASSWORD,
    db: numberFromEnv("REDIS_DB"),
    ttl: numberFromEnv("REDIS_TTL"),
    connectionOptions: {
      connectTimeout: numberFromEnv("REDIS_CONNECT_TIMEOUT"),
      maxRetriesPerRequest: numberFromEnv("REDIS_MAX_RETRIES"),
      retryDelayOnFailover: numberFromEnv("REDIS_RETRY_DELAY"),
    },
  };
  if (process.env.REDIS_URL) {
    config.url = process.env.REDIS_URL;
  }
  return config;
}

/** Which backend `config` and the environment select. */
export function resolveArtifactStorageType(
  config?: ArtifactStorageConfig,
): ArtifactStorageType {
  if (config?.storage) {
    return config.storage;
  }
  const fromEnv = process.env.STORAGE_TYPE?.trim().toLowerCase();
  return fromEnv === "redis" ? "redis" : "local";
}

/**
 * The Redis connection an artifact store should use, with its own key prefix.
 *
 * @param config   `artifacts` constructor config
 * @param fallback conversation memory's `redisConfig`, when one was given
 */
export function resolveArtifactRedisConfig(
  config?: ArtifactStorageConfig,
  fallback?: RedisStorageConfig,
): RedisStorageConfig {
  const source =
    config?.redisConfig ?? fallback ?? readArtifactRedisConfigFromEnv();
  return {
    url: source.url,
    username: source.username,
    host: source.host,
    port: source.port,
    password: source.password,
    db: source.db,
    ttl: source.ttl,
    connectionOptions: source.connectionOptions,
    keyPrefix: config?.redisConfig?.keyPrefix ?? DEFAULT_ARTIFACT_KEY_PREFIX,
  };
}

/**
 * Build the artifact store `config` asks for.
 *
 * @param config   `artifacts` constructor config
 * @param fallbackRedis conversation memory's `redisConfig`, consulted for the
 *   connection when `config.redisConfig` is absent
 */
export function createArtifactStore(
  config?: ArtifactStorageConfig,
  fallbackRedis?: RedisStorageConfig,
): ArtifactStore {
  if (config?.store) {
    logger.debug("[ArtifactStore] Using the injected artifact store");
    return config.store;
  }
  const storage = resolveArtifactStorageType(config);
  if (storage === "redis") {
    const redis = resolveArtifactRedisConfig(config, fallbackRedis);
    logger.debug("[ArtifactStore] Artifact store backend: redis", {
      host: redis.host ?? (redis.url ? "(url)" : "localhost"),
      keyPrefix: redis.keyPrefix,
    });
    return new RedisArtifactStore(redis);
  }
  logger.debug("[ArtifactStore] Artifact store backend: local-temp");
  return new LocalTempArtifactStore();
}
