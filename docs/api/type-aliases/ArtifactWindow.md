[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ArtifactWindow

# Type Alias: ArtifactWindow

> **ArtifactWindow** = `object`

One window of an artifact, as returned by `ArtifactStore.retrieveRange` or
by the shared reader when the store only supports whole-payload reads.

Offsets and lengths are CHARACTERS (UTF-16 code units, the unit
`String.prototype.slice` and `retrieve_context`'s `offset` / `limit` use),
never bytes — so a model advancing `offset` by the characters it received
lands exactly where the previous window ended.

## Properties

### content

> **content**: `string`

The characters in `[offset, offset + content.length)`.

---

### offset

> **offset**: `number`

Character offset this window starts at.

---

### totalLength

> **totalLength**: `number`

Total character length of the whole payload.
