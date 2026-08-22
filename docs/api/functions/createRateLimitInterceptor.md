[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / createRateLimitInterceptor

# Function: createRateLimitInterceptor()

> **createRateLimitInterceptor**(`options`): [`ClientMiddleware`](../type-aliases/ClientMiddleware.md)

Defined in: [client/interceptors.ts:435](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/client/interceptors.ts#L435)

Rate limiting interceptor

Limits the rate of requests to prevent overwhelming the API.

## Parameters

### options

[`RateLimiterOptions`](../type-aliases/RateLimiterOptions.md)

## Returns

[`ClientMiddleware`](../type-aliases/ClientMiddleware.md)

## Example

```typescript
client.use(
  createRateLimitInterceptor({
    maxRequests: 100,
    windowMs: 60000, // 100 requests per minute
    strategy: "queue",
    onRateLimited: (waitTime) =>
      console.log(`Rate limited, waiting ${waitTime}ms`),
  }),
);
```
