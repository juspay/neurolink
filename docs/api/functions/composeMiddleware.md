[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / composeMiddleware

# Function: composeMiddleware()

> **composeMiddleware**(...`middlewares`): [`ClientMiddleware`](../type-aliases/ClientMiddleware.md)

Defined in: [client/interceptors.ts:764](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/client/interceptors.ts#L764)

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
