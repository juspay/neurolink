[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / RateLimiterPendingRequest

# Type Alias: RateLimiterPendingRequest

> **RateLimiterPendingRequest** = `object`

Defined in: [types/utilities.ts:294](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/utilities.ts#L294)

Pending request held by TokenBucketRateLimiter's queue.
Named RateLimiterPendingRequest to disambiguate from the MCP
PendingRequest in mcp.ts (Rule 9).

## Properties

### resolve

> **resolve**: () => `void`

Defined in: [types/utilities.ts:295](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/utilities.ts#L295)

#### Returns

`void`

---

### reject

> **reject**: (`error`) => `void`

Defined in: [types/utilities.ts:296](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/utilities.ts#L296)

#### Parameters

##### error

`Error`

#### Returns

`void`

---

### timestamp

> **timestamp**: `number`

Defined in: [types/utilities.ts:297](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/utilities.ts#L297)

---

### timeoutTimer?

> `optional` **timeoutTimer?**: `ReturnType`\<_typeof_ `setTimeout`\>

Defined in: [types/utilities.ts:298](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/utilities.ts#L298)
