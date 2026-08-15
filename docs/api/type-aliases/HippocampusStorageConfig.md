[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / HippocampusStorageConfig

# Type Alias: HippocampusStorageConfig

> **HippocampusStorageConfig** = [`MemorySqliteStorageConfig`](MemorySqliteStorageConfig.md) \| [`MemoryRedisStorageConfig`](MemoryRedisStorageConfig.md) \| [`MemoryS3StorageConfig`](MemoryS3StorageConfig.md) \| [`MemoryCustomStorageConfig`](MemoryCustomStorageConfig.md)

Defined in: [types/memory.ts:58](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/memory.ts#L58)

Storage configuration accepted by the optional Hippocampus client.
Re-exported with the legacy `StorageConfig` name from `conversation.ts`
to preserve the existing public type surface.
