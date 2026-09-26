[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ToolRoutingCacheEntry

# Type Alias: ToolRoutingCacheEntry

> **ToolRoutingCacheEntry** = `object`

Internal cache entry for `ToolRoutingCache`.

## Properties

### excludedToolNames

> **excludedToolNames**: `string`[]

---

### selectedServerIds

> **selectedServerIds**: `string`[]

---

### expiresAt

> **expiresAt**: `number`

Absolute expiry timestamp (from the injected `now()` clock).

---

### accessOrder

> **accessOrder**: `number`

LRU eviction order — lower = older. Bumped on each get/set.
