[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / conditionalMiddleware

# Function: conditionalMiddleware()

> **conditionalMiddleware**(`condition`, `middleware`): [`ClientMiddleware`](../type-aliases/ClientMiddleware.md)

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
