[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / MemorySqliteStorageConfig

# Type Alias: MemorySqliteStorageConfig

> **MemorySqliteStorageConfig** = `object`

Defined in: [types/memory.ts:23](https://github.com/juspay/neurolink/blob/release/src/lib/types/memory.ts#L23)

Local structural types for the optional @juspay/hippocampus integration.

These mirror the public shapes that ship with @juspay/hippocampus's
`dist/types.d.ts` so NeuroLink's public type surface stays compatible
for consumers that already configure memory, while the runtime package
itself becomes an optional peer dependency. The previous setup (a hard
value import of @juspay/hippocampus) made pnpm pull a registry copy of
@juspay/neurolink to satisfy Hippocampus's peer, which transitively
dragged @ai-sdk/google + @ai-sdk/google-vertex into the production
dependency graph.

Naming:

- Hippocampus's own `StorageType` and `RedisStorageConfig` collide with
  NeuroLink's in-house Redis manager types in `common.ts` /
  `conversation.ts`. To satisfy the `unique-type-names` ESLint rule,
  the storage variants get a `Memory*` prefix here.
- `HippocampusMemory` (consumer-facing) and `StorageConfig` (legacy
  re-export) keep their original public names — only their definitions
  move from `import("@juspay/hippocampus").Foo` to local structural form.

## Properties

### type

> **type**: `"sqlite"`

Defined in: [types/memory.ts:24](https://github.com/juspay/neurolink/blob/release/src/lib/types/memory.ts#L24)

---

### path?

> `optional` **path?**: `string`

Defined in: [types/memory.ts:26](https://github.com/juspay/neurolink/blob/release/src/lib/types/memory.ts#L26)

Path to SQLite file. Default: ./data/hippocampus.sqlite
