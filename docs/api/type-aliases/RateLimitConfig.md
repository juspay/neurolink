[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / RateLimitConfig

# Type Alias: RateLimitConfig

> **RateLimitConfig** = `object`

Defined in: [types/server.ts:119](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/server.ts#L119)

Rate limiting configuration

## Properties

### enabled?

> `optional` **enabled?**: `boolean`

Defined in: [types/server.ts:121](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/server.ts#L121)

Enable rate limiting (default: true)

---

### windowMs?

> `optional` **windowMs?**: `number`

Defined in: [types/server.ts:124](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/server.ts#L124)

Time window in milliseconds (default: 15 minutes)

---

### maxRequests?

> `optional` **maxRequests?**: `number`

Defined in: [types/server.ts:127](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/server.ts#L127)

Maximum requests per window (default: 100)

---

### message?

> `optional` **message?**: `string`

Defined in: [types/server.ts:130](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/server.ts#L130)

Custom error message

---

### skipPaths?

> `optional` **skipPaths?**: `string`[]

Defined in: [types/server.ts:133](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/server.ts#L133)

Skip rate limiting for certain paths

---

### keyGenerator?

> `optional` **keyGenerator?**: (`ctx`) => `string`

Defined in: [types/server.ts:136](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/server.ts#L136)

Custom key generator function

#### Parameters

##### ctx

[`ServerContext`](ServerContext.md)

#### Returns

`string`
