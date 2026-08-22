[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / FixedWindowRateLimitConfig

# Type Alias: FixedWindowRateLimitConfig

> **FixedWindowRateLimitConfig** = `object`

Defined in: [types/middleware.ts:458](https://github.com/juspay/neurolink/blob/release/src/lib/types/middleware.ts#L458)

Simple fixed-window rate-limit configuration.

## Properties

### maxRequests

> **maxRequests**: `number`

Defined in: [types/middleware.ts:459](https://github.com/juspay/neurolink/blob/release/src/lib/types/middleware.ts#L459)

---

### windowMs

> **windowMs**: `number`

Defined in: [types/middleware.ts:460](https://github.com/juspay/neurolink/blob/release/src/lib/types/middleware.ts#L460)

---

### message?

> `optional` **message?**: `string`

Defined in: [types/middleware.ts:461](https://github.com/juspay/neurolink/blob/release/src/lib/types/middleware.ts#L461)

---

### skipPaths?

> `optional` **skipPaths?**: `string`[]

Defined in: [types/middleware.ts:462](https://github.com/juspay/neurolink/blob/release/src/lib/types/middleware.ts#L462)

---

### keyGenerator?

> `optional` **keyGenerator?**: (`ctx`) => `string`

Defined in: [types/middleware.ts:463](https://github.com/juspay/neurolink/blob/release/src/lib/types/middleware.ts#L463)

#### Parameters

##### ctx

[`ServerContext`](ServerContext.md)

#### Returns

`string`

---

### onRateLimitExceeded?

> `optional` **onRateLimitExceeded?**: (`ctx`, `retryAfter`) => `unknown`

Defined in: [types/middleware.ts:464](https://github.com/juspay/neurolink/blob/release/src/lib/types/middleware.ts#L464)

#### Parameters

##### ctx

[`ServerContext`](ServerContext.md)

##### retryAfter

`number`

#### Returns

`unknown`
