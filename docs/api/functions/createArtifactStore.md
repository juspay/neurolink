[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / createArtifactStore

# Function: createArtifactStore()

> **createArtifactStore**(`config?`, `fallbackRedis?`): [`ArtifactStore`](../type-aliases/ArtifactStore.md)

Defined in: [artifacts/artifactStoreFactory.ts:106](https://github.com/juspay/neurolink/blob/release/src/lib/artifacts/artifactStoreFactory.ts#L106)

Build the artifact store `config` asks for.

## Parameters

### config?

[`ArtifactStorageConfig`](../type-aliases/ArtifactStorageConfig.md)

`artifacts` constructor config

### fallbackRedis?

[`RedisStorageConfig`](../type-aliases/RedisStorageConfig.md)

conversation memory's `redisConfig`, consulted for the
connection when `config.redisConfig` is absent

## Returns

[`ArtifactStore`](../type-aliases/ArtifactStore.md)
