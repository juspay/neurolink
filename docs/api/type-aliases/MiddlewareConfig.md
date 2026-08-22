[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / MiddlewareConfig

# Type Alias: MiddlewareConfig

> **MiddlewareConfig** = `object`

Defined in: [types/middleware.ts:70](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/middleware.ts#L70)

Middleware configuration options

## Properties

### enabled?

> `optional` **enabled?**: `boolean`

Defined in: [types/middleware.ts:72](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/middleware.ts#L72)

Whether the middleware is enabled

---

### config?

> `optional` **config?**: `Record`\<`string`, `unknown`\>

Defined in: [types/middleware.ts:74](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/middleware.ts#L74)

Middleware-specific configuration

---

### conditions?

> `optional` **conditions?**: [`MiddlewareConditions`](MiddlewareConditions.md)

Defined in: [types/middleware.ts:76](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/middleware.ts#L76)

Conditions under which to apply this middleware
