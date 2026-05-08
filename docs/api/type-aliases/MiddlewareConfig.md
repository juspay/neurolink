[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / MiddlewareConfig

# Type Alias: MiddlewareConfig

> **MiddlewareConfig** = `object`

Defined in: [types/middleware.ts:40](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/middleware.ts#L40)

Middleware configuration options

## Properties

### enabled?

> `optional` **enabled?**: `boolean`

Defined in: [types/middleware.ts:42](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/middleware.ts#L42)

Whether the middleware is enabled

---

### config?

> `optional` **config?**: `Record`\<`string`, `unknown`\>

Defined in: [types/middleware.ts:44](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/middleware.ts#L44)

Middleware-specific configuration

---

### conditions?

> `optional` **conditions?**: [`MiddlewareConditions`](MiddlewareConditions.md)

Defined in: [types/middleware.ts:46](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/middleware.ts#L46)

Conditions under which to apply this middleware
