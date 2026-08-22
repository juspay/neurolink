[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / conditionalMiddleware

# Function: conditionalMiddleware()

> **conditionalMiddleware**(`condition`, `middleware`): [`ClientMiddleware`](../type-aliases/ClientMiddleware.md)

Defined in: [client/interceptors.ts:793](https://github.com/juspay/neurolink/blob/release/src/lib/client/interceptors.ts#L793)

Conditionally apply middleware

## Parameters

### condition

(`request`) => `boolean`

### middleware

[`ClientMiddleware`](../type-aliases/ClientMiddleware.md)

## Returns

[`ClientMiddleware`](../type-aliases/ClientMiddleware.md)

## Example

```typescript
client.use(
  conditionalMiddleware(
    (request) => request.url.includes("/api/agents"),
    createLoggingInterceptor(),
  ),
);
```
