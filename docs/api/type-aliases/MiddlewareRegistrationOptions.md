[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / MiddlewareRegistrationOptions

# Type Alias: MiddlewareRegistrationOptions

> **MiddlewareRegistrationOptions** = `object`

Defined in: [types/middleware.ts:109](https://github.com/juspay/neurolink/blob/release/src/lib/types/middleware.ts#L109)

Middleware registration options

## Properties

### replace?

> `optional` **replace?**: `boolean`

Defined in: [types/middleware.ts:111](https://github.com/juspay/neurolink/blob/release/src/lib/types/middleware.ts#L111)

Whether to replace existing middleware with same ID

---

### defaultEnabled?

> `optional` **defaultEnabled?**: `boolean`

Defined in: [types/middleware.ts:113](https://github.com/juspay/neurolink/blob/release/src/lib/types/middleware.ts#L113)

Whether to enable the middleware by default

---

### globalConfig?

> `optional` **globalConfig?**: `Record`\<`string`, [`JsonValue`](JsonValue.md)\>

Defined in: [types/middleware.ts:115](https://github.com/juspay/neurolink/blob/release/src/lib/types/middleware.ts#L115)

Global configuration for the middleware
