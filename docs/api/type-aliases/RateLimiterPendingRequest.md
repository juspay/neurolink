[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / RateLimiterPendingRequest

# Type Alias: RateLimiterPendingRequest

> **RateLimiterPendingRequest** = `object`

Defined in: [types/utilities.ts:308](https://github.com/juspay/neurolink/blob/release/src/lib/types/utilities.ts#L308)

Pending request held by TokenBucketRateLimiter's queue.
Named RateLimiterPendingRequest to disambiguate from the MCP
PendingRequest in mcp.ts (Rule 9).

## Properties

### resolve

> **resolve**: () => `void`

Defined in: [types/utilities.ts:309](https://github.com/juspay/neurolink/blob/release/src/lib/types/utilities.ts#L309)

#### Returns

`void`

---

### reject

> **reject**: (`error`) => `void`

Defined in: [types/utilities.ts:310](https://github.com/juspay/neurolink/blob/release/src/lib/types/utilities.ts#L310)

#### Parameters

##### error

`Error`

#### Returns

`void`

---

### timestamp

> **timestamp**: `number`

Defined in: [types/utilities.ts:311](https://github.com/juspay/neurolink/blob/release/src/lib/types/utilities.ts#L311)

---

### timeoutTimer?

> `optional` **timeoutTimer?**: `ReturnType`\<_typeof_ `setTimeout`\>

Defined in: [types/utilities.ts:312](https://github.com/juspay/neurolink/blob/release/src/lib/types/utilities.ts#L312)
