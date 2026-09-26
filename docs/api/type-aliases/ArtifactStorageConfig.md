[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ArtifactStorageConfig

# Type Alias: ArtifactStorageConfig

> **ArtifactStorageConfig** = `object`

Artifact storage configuration (`new NeuroLink({ artifacts })`).

Resolution order for the backend: `store` → `storage` → `STORAGE_TYPE`
environment variable → `"local"`. Resolution order for the Redis connection:
`redisConfig` → `conversationMemory.redisConfig` → `REDIS_URL` / `REDIS_HOST`
environment variables — so a deployment already running conversation memory
on Redis keeps its artifacts on the same Redis without new settings.

## Properties

### storage?

> `optional` **storage?**: [`ArtifactStorageType`](ArtifactStorageType.md)

Backend to use. Default: `STORAGE_TYPE` env var, else `"local"`.

---

### redisConfig?

> `optional` **redisConfig?**: [`RedisStorageConfig`](RedisStorageConfig.md)

Redis connection for `storage: "redis"`. `keyPrefix` defaults to
`neurolink:artifact:` (NOT the conversation prefix). `ttl` is seconds,
must be positive, and defaults to 86400; zero or negative is replaced by
the default with a warning — artifacts in Redis always expire.
`userSessionsKeyPrefix` is ignored.

---

### store?

> `optional` **store?**: [`ArtifactStore`](ArtifactStore.md)

A ready-made backend. Wins over `storage`. Use this for S3, a database,
or a wrapped store; `setArtifactStore()` does the same after construction.
