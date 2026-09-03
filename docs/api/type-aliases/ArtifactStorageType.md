[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ArtifactStorageType

# Type Alias: ArtifactStorageType

> **ArtifactStorageType** = `"local"` \| `"redis"`

Defined in: [types/artifact.ts:255](https://github.com/juspay/neurolink/blob/release/src/lib/types/artifact.ts#L255)

Where artifacts live. Mirrors conversation memory's `STORAGE_TYPE`:

- "local" OS temp directory, per-process index with a cross-process
  sidecar. Fine for one machine; artifacts do not survive a pod.
- "redis" Shared across replicas, expired by TTL, range reads via
  `GETRANGE`. Uses the same connection pool as Redis conversation
  memory.
