[**NeuroLink API Reference v8.32.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / MiddlewareConfig

# Type Alias: MiddlewareConfig

> **MiddlewareConfig** = `object`

Defined in: [types/middlewareTypes.ts:37](https://github.com/juspay/neurolink/blob/1be79595b7d7307795c98da4267c1728cb50033d/src/lib/types/middlewareTypes.ts#L37)

Middleware configuration options

## Properties

### enabled?

> `optional` **enabled**: `boolean`

Defined in: [types/middlewareTypes.ts:39](https://github.com/juspay/neurolink/blob/1be79595b7d7307795c98da4267c1728cb50033d/src/lib/types/middlewareTypes.ts#L39)

Whether the middleware is enabled

---

### config?

> `optional` **config**: `Record`\<`string`, `unknown`\>

Defined in: [types/middlewareTypes.ts:41](https://github.com/juspay/neurolink/blob/1be79595b7d7307795c98da4267c1728cb50033d/src/lib/types/middlewareTypes.ts#L41)

Middleware-specific configuration

---

### conditions?

> `optional` **conditions**: `MiddlewareConditions`

Defined in: [types/middlewareTypes.ts:43](https://github.com/juspay/neurolink/blob/1be79595b7d7307795c98da4267c1728cb50033d/src/lib/types/middlewareTypes.ts#L43)

Conditions under which to apply this middleware
