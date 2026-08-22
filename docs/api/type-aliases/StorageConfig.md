[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / StorageConfig

# Type Alias: StorageConfig

> **StorageConfig** = [`HippocampusStorageConfig`](HippocampusStorageConfig.md)

Defined in: [types/conversation.ts:67](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/conversation.ts#L67)

Legacy public alias for the Hippocampus storage configuration.
The structural definition lives in `./memory.ts`; this re-export keeps
the SDK surface stable for callers who imported `StorageConfig` from
the package barrel. Defined as a `type` alias rather than a re-export
so the canonical `HippocampusStorageConfig` name is the one ESLint
uniqueness checks see.
