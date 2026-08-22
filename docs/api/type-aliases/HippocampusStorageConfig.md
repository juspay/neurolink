[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / HippocampusStorageConfig

# Type Alias: HippocampusStorageConfig

> **HippocampusStorageConfig** = [`MemorySqliteStorageConfig`](MemorySqliteStorageConfig.md) \| [`MemoryRedisStorageConfig`](MemoryRedisStorageConfig.md) \| [`MemoryS3StorageConfig`](MemoryS3StorageConfig.md) \| [`MemoryCustomStorageConfig`](MemoryCustomStorageConfig.md)

Defined in: [types/memory.ts:58](https://github.com/juspay/neurolink/blob/release/src/lib/types/memory.ts#L58)

Storage configuration accepted by the optional Hippocampus client.
Re-exported with the legacy `StorageConfig` name from `conversation.ts`
to preserve the existing public type surface.
