[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ArtifactWindow

# Type Alias: ArtifactWindow

> **ArtifactWindow** = `object`

Defined in: [types/artifact.ts:115](https://github.com/juspay/neurolink/blob/release/src/lib/types/artifact.ts#L115)

One window of an artifact, as returned by `ArtifactStore.retrieveRange` or
by the shared reader when the store only supports whole-payload reads.

Offsets and lengths are CHARACTERS (UTF-16 code units, the unit
`String.prototype.slice` and `retrieve_context`'s `offset` / `limit` use),
never bytes — so a model advancing `offset` by the characters it received
lands exactly where the previous window ended.

## Properties

### content

> **content**: `string`

Defined in: [types/artifact.ts:117](https://github.com/juspay/neurolink/blob/release/src/lib/types/artifact.ts#L117)

The characters in `[offset, offset + content.length)`.

---

### offset

> **offset**: `number`

Defined in: [types/artifact.ts:119](https://github.com/juspay/neurolink/blob/release/src/lib/types/artifact.ts#L119)

Character offset this window starts at.

---

### totalLength

> **totalLength**: `number`

Defined in: [types/artifact.ts:121](https://github.com/juspay/neurolink/blob/release/src/lib/types/artifact.ts#L121)

Total character length of the whole payload.
