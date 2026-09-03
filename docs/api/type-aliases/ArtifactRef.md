[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ArtifactRef

# Type Alias: ArtifactRef

> **ArtifactRef** = `object`

Defined in: [types/artifact.ts:41](https://github.com/juspay/neurolink/blob/release/src/lib/types/artifact.ts#L41)

Lightweight descriptor returned after a successful ArtifactStore.store().

## Properties

### id

> **id**: `string`

Defined in: [types/artifact.ts:43](https://github.com/juspay/neurolink/blob/release/src/lib/types/artifact.ts#L43)

UUID v4 — stable identifier used in surrogate results and metadata.

---

### preview

> **preview**: `string`

Defined in: [types/artifact.ts:45](https://github.com/juspay/neurolink/blob/release/src/lib/types/artifact.ts#L45)

First N characters of the payload (for surrogate headers).

---

### sizeBytes

> **sizeBytes**: `number`

Defined in: [types/artifact.ts:47](https://github.com/juspay/neurolink/blob/release/src/lib/types/artifact.ts#L47)

Full serialized byte size.

---

### meta

> **meta**: [`ArtifactMeta`](ArtifactMeta.md)

Defined in: [types/artifact.ts:49](https://github.com/juspay/neurolink/blob/release/src/lib/types/artifact.ts#L49)

Stored metadata.
