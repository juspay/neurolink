[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ToolRoutingCacheEntry

# Type Alias: ToolRoutingCacheEntry

> **ToolRoutingCacheEntry** = `object`

Defined in: [types/toolRouting.ts:203](https://github.com/juspay/neurolink/blob/release/src/lib/types/toolRouting.ts#L203)

Internal cache entry for `ToolRoutingCache`.

## Properties

### excludedToolNames

> **excludedToolNames**: `string`[]

Defined in: [types/toolRouting.ts:204](https://github.com/juspay/neurolink/blob/release/src/lib/types/toolRouting.ts#L204)

---

### selectedServerIds

> **selectedServerIds**: `string`[]

Defined in: [types/toolRouting.ts:205](https://github.com/juspay/neurolink/blob/release/src/lib/types/toolRouting.ts#L205)

---

### expiresAt

> **expiresAt**: `number`

Defined in: [types/toolRouting.ts:207](https://github.com/juspay/neurolink/blob/release/src/lib/types/toolRouting.ts#L207)

Absolute expiry timestamp (from the injected `now()` clock).

---

### accessOrder

> **accessOrder**: `number`

Defined in: [types/toolRouting.ts:209](https://github.com/juspay/neurolink/blob/release/src/lib/types/toolRouting.ts#L209)

LRU eviction order — lower = older. Bumped on each get/set.
