[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / RateLimiterPendingRequest

# Type Alias: RateLimiterPendingRequest

> **RateLimiterPendingRequest** = `object`

Pending request held by TokenBucketRateLimiter's queue.
Named RateLimiterPendingRequest to disambiguate from the MCP
PendingRequest in mcp.ts (Rule 9).

## Properties

### resolve

> **resolve**: () => `void`

#### Returns

`void`

---

### reject

> **reject**: (`error`) => `void`

#### Parameters

##### error

`Error`

#### Returns

`void`

---

### timestamp

> **timestamp**: `number`

---

### timeoutTimer?

> `optional` **timeoutTimer?**: `ReturnType`\<_typeof_ `setTimeout`\>
