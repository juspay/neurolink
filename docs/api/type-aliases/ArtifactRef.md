[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / ArtifactRef

# Type Alias: ArtifactRef

> **ArtifactRef** = `object`

Defined in: [types/artifact.ts:32](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/artifact.ts#L32)

Lightweight descriptor returned after a successful ArtifactStore.store().

## Properties

### id

> **id**: `string`

Defined in: [types/artifact.ts:34](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/artifact.ts#L34)

UUID v4 — stable identifier used in surrogate results and metadata.

---

### preview

> **preview**: `string`

Defined in: [types/artifact.ts:36](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/artifact.ts#L36)

First N characters of the payload (for surrogate headers).

---

### sizeBytes

> **sizeBytes**: `number`

Defined in: [types/artifact.ts:38](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/artifact.ts#L38)

Full serialized byte size.

---

### meta

> **meta**: [`ArtifactMeta`](ArtifactMeta.md)

Defined in: [types/artifact.ts:40](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/artifact.ts#L40)

Stored metadata.
