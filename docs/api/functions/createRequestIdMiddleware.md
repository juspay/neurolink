[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / createRequestIdMiddleware

# Function: createRequestIdMiddleware()

> **createRequestIdMiddleware**(`options?`): [`MiddlewareDefinition`](../type-aliases/MiddlewareDefinition.md)

Defined in: [server/middleware/common.ts:105](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/server/middleware/common.ts#L105)

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
