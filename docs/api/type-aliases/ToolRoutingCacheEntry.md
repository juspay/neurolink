[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / ToolRoutingCacheEntry

# Type Alias: ToolRoutingCacheEntry

> **ToolRoutingCacheEntry** = `object`

Defined in: [types/toolRouting.ts:191](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/toolRouting.ts#L191)

Internal cache entry for `ToolRoutingCache`.

## Properties

### excludedToolNames

> **excludedToolNames**: `string`[]

Defined in: [types/toolRouting.ts:192](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/toolRouting.ts#L192)

---

### selectedServerIds

> **selectedServerIds**: `string`[]

Defined in: [types/toolRouting.ts:193](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/toolRouting.ts#L193)

---

### expiresAt

> **expiresAt**: `number`

Defined in: [types/toolRouting.ts:195](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/toolRouting.ts#L195)

Absolute expiry timestamp (from the injected `now()` clock).

---

### accessOrder

> **accessOrder**: `number`

Defined in: [types/toolRouting.ts:197](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/toolRouting.ts#L197)

LRU eviction order — lower = older. Bumped on each get/set.
