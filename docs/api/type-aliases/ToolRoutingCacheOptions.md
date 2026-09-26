[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ToolRoutingCacheOptions

# Type Alias: ToolRoutingCacheOptions

> **ToolRoutingCacheOptions** = `object`

Constructor options for `ToolRoutingCache`.

## Properties

### ttlMs?

> `optional` **ttlMs?**: `number`

Time-to-live in milliseconds for each cached entry. Default: 60_000.

---

### maxEntries?

> `optional` **maxEntries?**: `number`

Maximum number of entries kept in the LRU before eviction. Default: 256.

---

### stickyTurns?

> `optional` **stickyTurns?**: `number`

Number of turns a selected server remains sticky per session. Default: 3.

---

### now?

> `optional` **now?**: () => `number`

Clock function for TTL calculations. Defaults to `Date.now`.
Inject a deterministic function in tests to control time.

#### Returns

`number`
