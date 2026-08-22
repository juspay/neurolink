[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / MiddlewareChainConfig

# Type Alias: MiddlewareChainConfig

> **MiddlewareChainConfig** = `object`

Defined in: [types/middleware.ts:295](https://github.com/juspay/neurolink/blob/release/src/lib/types/middleware.ts#L295)

Middleware chain configuration

## Properties

### middlewares

> **middlewares**: [`MiddlewareFactoryConfig`](MiddlewareFactoryConfig.md)[]

Defined in: [types/middleware.ts:296](https://github.com/juspay/neurolink/blob/release/src/lib/types/middleware.ts#L296)

---

### errorHandling

> **errorHandling**: `"continue"` \| `"stop"` \| `"rollback"`

Defined in: [types/middleware.ts:297](https://github.com/juspay/neurolink/blob/release/src/lib/types/middleware.ts#L297)

---

### timeout?

> `optional` **timeout?**: `number`

Defined in: [types/middleware.ts:298](https://github.com/juspay/neurolink/blob/release/src/lib/types/middleware.ts#L298)

---

### retries?

> `optional` **retries?**: `number`

Defined in: [types/middleware.ts:299](https://github.com/juspay/neurolink/blob/release/src/lib/types/middleware.ts#L299)
