[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / FixedWindowRateLimitConfig

# Type Alias: FixedWindowRateLimitConfig

> **FixedWindowRateLimitConfig** = `object`

Defined in: [types/middleware.ts:400](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/middleware.ts#L400)

Simple fixed-window rate-limit configuration.

## Properties

### maxRequests

> **maxRequests**: `number`

Defined in: [types/middleware.ts:401](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/middleware.ts#L401)

---

### windowMs

> **windowMs**: `number`

Defined in: [types/middleware.ts:402](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/middleware.ts#L402)

---

### message?

> `optional` **message?**: `string`

Defined in: [types/middleware.ts:403](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/middleware.ts#L403)

---

### skipPaths?

> `optional` **skipPaths?**: `string`[]

Defined in: [types/middleware.ts:404](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/middleware.ts#L404)

---

### keyGenerator?

> `optional` **keyGenerator?**: (`ctx`) => `string`

Defined in: [types/middleware.ts:405](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/middleware.ts#L405)

#### Parameters

##### ctx

[`ServerContext`](ServerContext.md)

#### Returns

`string`

---

### onRateLimitExceeded?

> `optional` **onRateLimitExceeded?**: (`ctx`, `retryAfter`) => `unknown`

Defined in: [types/middleware.ts:406](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/middleware.ts#L406)

#### Parameters

##### ctx

[`ServerContext`](ServerContext.md)

##### retryAfter

`number`

#### Returns

`unknown`
