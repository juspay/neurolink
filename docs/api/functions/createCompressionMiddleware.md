[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / createCompressionMiddleware

# Function: createCompressionMiddleware()

> **createCompressionMiddleware**(`options?`): [`MiddlewareDefinition`](../type-aliases/MiddlewareDefinition.md)

Defined in: [server/middleware/common.ts:398](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/server/middleware/common.ts#L398)

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
