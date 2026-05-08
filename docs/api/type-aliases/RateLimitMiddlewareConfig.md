[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / RateLimitMiddlewareConfig

# Type Alias: RateLimitMiddlewareConfig

> **RateLimitMiddlewareConfig** = `object`

Defined in: [types/middleware.ts:375](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/middleware.ts#L375)

Rate-limit middleware configuration.

## Properties

### maxRequests

> **maxRequests**: `number`

Defined in: [types/middleware.ts:376](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/middleware.ts#L376)

---

### windowMs

> **windowMs**: `number`

Defined in: [types/middleware.ts:377](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/middleware.ts#L377)

---

### message?

> `optional` **message?**: `string`

Defined in: [types/middleware.ts:378](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/middleware.ts#L378)

---

### skipPaths?

> `optional` **skipPaths?**: `string`[]

Defined in: [types/middleware.ts:379](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/middleware.ts#L379)

---

### keyGenerator?

> `optional` **keyGenerator?**: (`ctx`) => `string`

Defined in: [types/middleware.ts:380](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/middleware.ts#L380)

#### Parameters

##### ctx

[`ServerContext`](ServerContext.md)

#### Returns

`string`

---

### onRateLimitExceeded?

> `optional` **onRateLimitExceeded?**: (`ctx`, `retryAfter`) => `unknown`

Defined in: [types/middleware.ts:381](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/middleware.ts#L381)

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

Defined in: [types/middleware.ts:382](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/middleware.ts#L382)
