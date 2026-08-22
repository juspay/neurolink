[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / RateLimiterPendingRequest

# Type Alias: RateLimiterPendingRequest

> **RateLimiterPendingRequest** = `object`

Defined in: [types/utilities.ts:294](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/utilities.ts#L294)

Pending request held by TokenBucketRateLimiter's queue.
Named RateLimiterPendingRequest to disambiguate from the MCP
PendingRequest in mcp.ts (Rule 9).

## Properties

### resolve

> **resolve**: () => `void`

Defined in: [types/utilities.ts:295](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/utilities.ts#L295)

#### Returns

`void`

---

### reject

> **reject**: (`error`) => `void`

Defined in: [types/utilities.ts:296](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/utilities.ts#L296)

#### Parameters

##### error

`Error`

#### Returns

`void`

---

### timestamp

> **timestamp**: `number`

Defined in: [types/utilities.ts:297](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/utilities.ts#L297)

---

### timeoutTimer?

> `optional` **timeoutTimer?**: `ReturnType`\<_typeof_ `setTimeout`\>

Defined in: [types/utilities.ts:298](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/utilities.ts#L298)
