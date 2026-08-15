[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / ToolRoutingCacheOptions

# Type Alias: ToolRoutingCacheOptions

> **ToolRoutingCacheOptions** = `object`

Defined in: [types/toolRouting.ts:208](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/toolRouting.ts#L208)

Constructor options for `ToolRoutingCache`.

## Properties

### ttlMs?

> `optional` **ttlMs?**: `number`

Defined in: [types/toolRouting.ts:210](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/toolRouting.ts#L210)

Time-to-live in milliseconds for each cached entry. Default: 60_000.

---

### maxEntries?

> `optional` **maxEntries?**: `number`

Defined in: [types/toolRouting.ts:212](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/toolRouting.ts#L212)

Maximum number of entries kept in the LRU before eviction. Default: 256.

---

### stickyTurns?

> `optional` **stickyTurns?**: `number`

Defined in: [types/toolRouting.ts:214](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/toolRouting.ts#L214)

Number of turns a selected server remains sticky per session. Default: 3.

---

### now?

> `optional` **now?**: () => `number`

Defined in: [types/toolRouting.ts:219](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/toolRouting.ts#L219)

Clock function for TTL calculations. Defaults to `Date.now`.
Inject a deterministic function in tests to control time.

#### Returns

`number`
