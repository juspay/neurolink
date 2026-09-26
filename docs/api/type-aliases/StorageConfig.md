[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / StorageConfig

# Type Alias: StorageConfig

> **StorageConfig** = [`HippocampusStorageConfig`](HippocampusStorageConfig.md)

Legacy public alias for the Hippocampus storage configuration.
The structural definition lives in `./memory.ts`; this re-export keeps
the SDK surface stable for callers who imported `StorageConfig` from
the package barrel. Defined as a `type` alias rather than a re-export
so the canonical `HippocampusStorageConfig` name is the one ESLint
uniqueness checks see.
