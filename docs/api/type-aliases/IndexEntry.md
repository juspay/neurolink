[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / IndexEntry

# Type Alias: IndexEntry

> **IndexEntry** = [`ArtifactMeta`](ArtifactMeta.md) & `object`

In-memory index row tracked by LocalTempArtifactStore.
Combines metadata with the on-disk path.

## Type Declaration

### path

> **path**: `string`

### rehydrated?

> `optional` **rehydrated?**: `boolean`

Loaded from disk rather than stored by this process. Another process's
work: readable, but never expired by this process's `cleanup()`.
