[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / MiddlewareRegistrationOptions

# Type Alias: MiddlewareRegistrationOptions

> **MiddlewareRegistrationOptions** = `object`

Defined in: [types/middleware.ts:115](https://github.com/juspay/neurolink/blob/release/src/lib/types/middleware.ts#L115)

Middleware registration options

## Properties

### replace?

> `optional` **replace?**: `boolean`

Defined in: [types/middleware.ts:117](https://github.com/juspay/neurolink/blob/release/src/lib/types/middleware.ts#L117)

Whether to replace existing middleware with same ID

---

### defaultEnabled?

> `optional` **defaultEnabled?**: `boolean`

Defined in: [types/middleware.ts:119](https://github.com/juspay/neurolink/blob/release/src/lib/types/middleware.ts#L119)

Whether to enable the middleware by default

---

### globalConfig?

> `optional` **globalConfig?**: `Record`\<`string`, [`JsonValue`](JsonValue.md)\>

Defined in: [types/middleware.ts:121](https://github.com/juspay/neurolink/blob/release/src/lib/types/middleware.ts#L121)

Global configuration for the middleware
