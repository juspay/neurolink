[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / MiddlewareConfig

# Type Alias: MiddlewareConfig

> **MiddlewareConfig** = `object`

Defined in: [types/middleware.ts:64](https://github.com/juspay/neurolink/blob/release/src/lib/types/middleware.ts#L64)

Middleware configuration options

## Properties

### enabled?

> `optional` **enabled?**: `boolean`

Defined in: [types/middleware.ts:66](https://github.com/juspay/neurolink/blob/release/src/lib/types/middleware.ts#L66)

Whether the middleware is enabled

---

### config?

> `optional` **config?**: `Record`\<`string`, `unknown`\>

Defined in: [types/middleware.ts:68](https://github.com/juspay/neurolink/blob/release/src/lib/types/middleware.ts#L68)

Middleware-specific configuration

---

### conditions?

> `optional` **conditions?**: [`MiddlewareConditions`](MiddlewareConditions.md)

Defined in: [types/middleware.ts:70](https://github.com/juspay/neurolink/blob/release/src/lib/types/middleware.ts#L70)

Conditions under which to apply this middleware
