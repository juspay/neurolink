[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / createRequestIdMiddleware

# Function: createRequestIdMiddleware()

> **createRequestIdMiddleware**(`options?`): [`MiddlewareDefinition`](../type-aliases/MiddlewareDefinition.md)

Defined in: [server/middleware/common.ts:105](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/server/middleware/common.ts#L105)

Create request ID middleware
Ensures every request has a unique ID

## Parameters

### options?

#### headerName?

`string`

Header name to check for existing ID

#### prefix?

`string`

Prefix for generated IDs

#### generator?

() => `string`

Custom ID generator

## Returns

[`MiddlewareDefinition`](../type-aliases/MiddlewareDefinition.md)

## Example

```typescript
server.registerMiddleware(createRequestIdMiddleware());
```
