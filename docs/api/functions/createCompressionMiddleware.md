[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / createCompressionMiddleware

# Function: createCompressionMiddleware()

> **createCompressionMiddleware**(`options?`): [`MiddlewareDefinition`](../type-aliases/MiddlewareDefinition.md)

Defined in: [server/middleware/common.ts:398](https://github.com/juspay/neurolink/blob/release/src/lib/server/middleware/common.ts#L398)

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
