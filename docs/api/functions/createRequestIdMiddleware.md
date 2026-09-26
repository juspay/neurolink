[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / createRequestIdMiddleware

# Function: createRequestIdMiddleware()

> **createRequestIdMiddleware**(`options?`): [`MiddlewareDefinition`](../type-aliases/MiddlewareDefinition.md)

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
