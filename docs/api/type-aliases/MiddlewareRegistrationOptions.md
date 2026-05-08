[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / MiddlewareRegistrationOptions

# Type Alias: MiddlewareRegistrationOptions

> **MiddlewareRegistrationOptions** = `object`

Defined in: [types/middleware.ts:85](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/middleware.ts#L85)

Middleware registration options

## Properties

### replace?

> `optional` **replace?**: `boolean`

Defined in: [types/middleware.ts:87](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/middleware.ts#L87)

Whether to replace existing middleware with same ID

---

### defaultEnabled?

> `optional` **defaultEnabled?**: `boolean`

Defined in: [types/middleware.ts:89](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/middleware.ts#L89)

Whether to enable the middleware by default

---

### globalConfig?

> `optional` **globalConfig?**: `Record`\<`string`, [`JsonValue`](JsonValue.md)\>

Defined in: [types/middleware.ts:91](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/middleware.ts#L91)

Global configuration for the middleware
