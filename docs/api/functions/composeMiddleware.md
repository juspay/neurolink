[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / composeMiddleware

# Function: composeMiddleware()

> **composeMiddleware**(...`middlewares`): [`ClientMiddleware`](../type-aliases/ClientMiddleware.md)

Compose multiple middleware into one

## Parameters

### middlewares

...[`ClientMiddleware`](../type-aliases/ClientMiddleware.md)[]

## Returns

[`ClientMiddleware`](../type-aliases/ClientMiddleware.md)

## Example

```typescript
const combinedMiddleware = composeMiddleware(
  createLoggingInterceptor(),
  createRetryInterceptor({ maxAttempts: 3 }),
  createRateLimitInterceptor({ maxRequests: 100, windowMs: 60000 }),
);

client.use(combinedMiddleware);
```
