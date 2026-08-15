[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / MiddlewareChainConfig

# Type Alias: MiddlewareChainConfig

> **MiddlewareChainConfig** = `object`

Defined in: [types/middleware.ts:295](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/middleware.ts#L295)

Middleware chain configuration

## Properties

### middlewares

> **middlewares**: [`MiddlewareFactoryConfig`](MiddlewareFactoryConfig.md)[]

Defined in: [types/middleware.ts:296](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/middleware.ts#L296)

---

### errorHandling

> **errorHandling**: `"continue"` \| `"stop"` \| `"rollback"`

Defined in: [types/middleware.ts:297](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/middleware.ts#L297)

---

### timeout?

> `optional` **timeout?**: `number`

Defined in: [types/middleware.ts:298](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/middleware.ts#L298)

---

### retries?

> `optional` **retries?**: `number`

Defined in: [types/middleware.ts:299](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/middleware.ts#L299)
