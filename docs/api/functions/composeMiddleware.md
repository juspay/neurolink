[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / composeMiddleware

# Function: composeMiddleware()

> **composeMiddleware**(...`middlewares`): [`ClientMiddleware`](../type-aliases/ClientMiddleware.md)

Defined in: [client/interceptors.ts:764](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/client/interceptors.ts#L764)

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
