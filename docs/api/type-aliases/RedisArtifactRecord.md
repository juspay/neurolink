[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / RedisArtifactRecord

# Type Alias: RedisArtifactRecord

> **RedisArtifactRecord** = [`ArtifactMeta`](ArtifactMeta.md) & `object`

Defined in: [types/artifact.ts:289](https://github.com/juspay/neurolink/blob/release/src/lib/types/artifact.ts#L289)

What `RedisArtifactStore` keeps beside each payload. `charLength` is what
makes range reads honest: when it equals `sizeBytes` the payload is pure
ASCII and a byte range IS a character range.

## Type Declaration

### charLength

> **charLength**: `number`

`payload.length` at store time — characters, not bytes.
