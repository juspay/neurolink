[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ToolRoutingCacheOptions

# Type Alias: ToolRoutingCacheOptions

> **ToolRoutingCacheOptions** = `object`

Defined in: [types/toolRouting.ts:220](https://github.com/juspay/neurolink/blob/release/src/lib/types/toolRouting.ts#L220)

Constructor options for `ToolRoutingCache`.

## Properties

### ttlMs?

> `optional` **ttlMs?**: `number`

Defined in: [types/toolRouting.ts:222](https://github.com/juspay/neurolink/blob/release/src/lib/types/toolRouting.ts#L222)

Time-to-live in milliseconds for each cached entry. Default: 60_000.

---

### maxEntries?

> `optional` **maxEntries?**: `number`

Defined in: [types/toolRouting.ts:224](https://github.com/juspay/neurolink/blob/release/src/lib/types/toolRouting.ts#L224)

Maximum number of entries kept in the LRU before eviction. Default: 256.

---

### stickyTurns?

> `optional` **stickyTurns?**: `number`

Defined in: [types/toolRouting.ts:226](https://github.com/juspay/neurolink/blob/release/src/lib/types/toolRouting.ts#L226)

Number of turns a selected server remains sticky per session. Default: 3.

---

### now?

> `optional` **now?**: () => `number`

Defined in: [types/toolRouting.ts:231](https://github.com/juspay/neurolink/blob/release/src/lib/types/toolRouting.ts#L231)

Clock function for TTL calculations. Defaults to `Date.now`.
Inject a deterministic function in tests to control time.

#### Returns

`number`
