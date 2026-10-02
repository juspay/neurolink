[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / MemoryWriteHooks

# Type Alias: MemoryWriteHooks

> **MemoryWriteHooks** = `object`

Write-side hooks accepted both per call (`generate({ memory })` /
`stream({ memory })`) and on the instance
(`conversationMemory.memory`). When both are set for the same hook, the
per-call one wins for that call.

## Properties

### shouldWrite?

> `optional` **shouldWrite?**: [`MemoryShouldWriteHook`](MemoryShouldWriteHook.md)

---

### onBeforeStore?

> `optional` **onBeforeStore?**: [`MemoryBeforeStoreHook`](MemoryBeforeStoreHook.md)
