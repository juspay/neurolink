[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ArtifactRef

# Type Alias: ArtifactRef

> **ArtifactRef** = `object`

Lightweight descriptor returned after a successful ArtifactStore.store().

## Properties

### id

> **id**: `string`

UUID v4 — stable identifier used in surrogate results and metadata.

---

### preview

> **preview**: `string`

First N characters of the payload (for surrogate headers).

---

### sizeBytes

> **sizeBytes**: `number`

Full serialized byte size.

---

### meta

> **meta**: [`ArtifactMeta`](ArtifactMeta.md)

Stored metadata.
