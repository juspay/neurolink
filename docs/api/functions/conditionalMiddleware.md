[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / conditionalMiddleware

# Function: conditionalMiddleware()

> **conditionalMiddleware**(`condition`, `middleware`): [`ClientMiddleware`](../type-aliases/ClientMiddleware.md)

Defined in: [client/interceptors.ts:793](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/client/interceptors.ts#L793)

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
