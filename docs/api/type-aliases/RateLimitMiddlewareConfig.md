[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / RateLimitMiddlewareConfig

# Type Alias: RateLimitMiddlewareConfig

> **RateLimitMiddlewareConfig** = `object`

Defined in: [types/middleware.ts:427](https://github.com/juspay/neurolink/blob/release/src/lib/types/middleware.ts#L427)

Rate-limit middleware configuration.

## Properties

### maxRequests

> **maxRequests**: `number`

Defined in: [types/middleware.ts:428](https://github.com/juspay/neurolink/blob/release/src/lib/types/middleware.ts#L428)

---

### windowMs

> **windowMs**: `number`

Defined in: [types/middleware.ts:429](https://github.com/juspay/neurolink/blob/release/src/lib/types/middleware.ts#L429)

---

### message?

> `optional` **message?**: `string`

Defined in: [types/middleware.ts:430](https://github.com/juspay/neurolink/blob/release/src/lib/types/middleware.ts#L430)

---

### skipPaths?

> `optional` **skipPaths?**: `string`[]

Defined in: [types/middleware.ts:431](https://github.com/juspay/neurolink/blob/release/src/lib/types/middleware.ts#L431)

---

### keyGenerator?

> `optional` **keyGenerator?**: (`ctx`) => `string`

Defined in: [types/middleware.ts:432](https://github.com/juspay/neurolink/blob/release/src/lib/types/middleware.ts#L432)

#### Parameters

##### ctx

[`ServerContext`](ServerContext.md)

#### Returns

`string`

---

### onRateLimitExceeded?

> `optional` **onRateLimitExceeded?**: (`ctx`, `retryAfter`) => `unknown`

Defined in: [types/middleware.ts:433](https://github.com/juspay/neurolink/blob/release/src/lib/types/middleware.ts#L433)

#### Parameters

##### ctx

[`ServerContext`](ServerContext.md)

##### retryAfter

`number`

#### Returns

`unknown`

---

### store?

> `optional` **store?**: [`RateLimitStore`](RateLimitStore.md)

Defined in: [types/middleware.ts:434](https://github.com/juspay/neurolink/blob/release/src/lib/types/middleware.ts#L434)
