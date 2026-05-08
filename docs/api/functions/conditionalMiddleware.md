[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / conditionalMiddleware

# Function: conditionalMiddleware()

> **conditionalMiddleware**(`condition`, `middleware`): [`ClientMiddleware`](../type-aliases/ClientMiddleware.md)

Defined in: [client/interceptors.ts:793](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/client/interceptors.ts#L793)

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
