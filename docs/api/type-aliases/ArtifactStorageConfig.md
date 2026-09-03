[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ArtifactStorageConfig

# Type Alias: ArtifactStorageConfig

> **ArtifactStorageConfig** = `object`

Defined in: [types/artifact.ts:266](https://github.com/juspay/neurolink/blob/release/src/lib/types/artifact.ts#L266)

Artifact storage configuration (`new NeuroLink({ artifacts })`).

Resolution order for the backend: `store` → `storage` → `STORAGE_TYPE`
environment variable → `"local"`. Resolution order for the Redis connection:
`redisConfig` → `conversationMemory.redisConfig` → `REDIS_URL` / `REDIS_HOST`
environment variables — so a deployment already running conversation memory
on Redis keeps its artifacts on the same Redis without new settings.

## Properties

### storage?

> `optional` **storage?**: [`ArtifactStorageType`](ArtifactStorageType.md)

Defined in: [types/artifact.ts:268](https://github.com/juspay/neurolink/blob/release/src/lib/types/artifact.ts#L268)

Backend to use. Default: `STORAGE_TYPE` env var, else `"local"`.

---

### redisConfig?

> `optional` **redisConfig?**: [`RedisStorageConfig`](RedisStorageConfig.md)

Defined in: [types/artifact.ts:276](https://github.com/juspay/neurolink/blob/release/src/lib/types/artifact.ts#L276)

Redis connection for `storage: "redis"`. `keyPrefix` defaults to
`neurolink:artifact:` (NOT the conversation prefix). `ttl` is seconds,
must be positive, and defaults to 86400; zero or negative is replaced by
the default with a warning — artifacts in Redis always expire.
`userSessionsKeyPrefix` is ignored.

---

### store?

> `optional` **store?**: [`ArtifactStore`](ArtifactStore.md)

Defined in: [types/artifact.ts:281](https://github.com/juspay/neurolink/blob/release/src/lib/types/artifact.ts#L281)

A ready-made backend. Wins over `storage`. Use this for S3, a database,
or a wrapped store; `setArtifactStore()` does the same after construction.
