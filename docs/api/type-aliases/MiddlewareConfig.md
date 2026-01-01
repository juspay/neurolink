[**NeuroLink API Reference v8.26.1**](../README.md)

---

[NeuroLink API Reference](../globals.md) / MiddlewareConfig

# Type Alias: MiddlewareConfig

> **MiddlewareConfig** = `object`

Defined in: [types/middlewareTypes.ts:37](https://github.com/juspay/neurolink/blob/997832c0dc437abf3a045a6ab43aafda5c330f4e/src/lib/types/middlewareTypes.ts#L37)

Middleware configuration options

## Properties

### enabled?

> `optional` **enabled**: `boolean`

Defined in: [types/middlewareTypes.ts:39](https://github.com/juspay/neurolink/blob/997832c0dc437abf3a045a6ab43aafda5c330f4e/src/lib/types/middlewareTypes.ts#L39)

Whether the middleware is enabled

---

### config?

> `optional` **config**: `Record`\<`string`, `unknown`\>

Defined in: [types/middlewareTypes.ts:41](https://github.com/juspay/neurolink/blob/997832c0dc437abf3a045a6ab43aafda5c330f4e/src/lib/types/middlewareTypes.ts#L41)

Middleware-specific configuration

---

### conditions?

> `optional` **conditions**: `MiddlewareConditions`

Defined in: [types/middlewareTypes.ts:43](https://github.com/juspay/neurolink/blob/997832c0dc437abf3a045a6ab43aafda5c330f4e/src/lib/types/middlewareTypes.ts#L43)

Conditions under which to apply this middleware
