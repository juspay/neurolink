[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / createCompressionMiddleware

# Function: createCompressionMiddleware()

> **createCompressionMiddleware**(`options?`): [`MiddlewareDefinition`](../type-aliases/MiddlewareDefinition.md)

Defined in: [server/middleware/common.ts:398](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/server/middleware/common.ts#L398)

Create compression preference middleware
Signals compression preference to adapters

## Parameters

### options?

#### threshold?

`number`

Minimum response size to compress (bytes)

#### contentTypes?

`string`[]

Content types to compress

## Returns

[`MiddlewareDefinition`](../type-aliases/MiddlewareDefinition.md)
