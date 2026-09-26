[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / createRateLimitInterceptor

# Function: createRateLimitInterceptor()

> **createRateLimitInterceptor**(`options`): [`ClientMiddleware`](../type-aliases/ClientMiddleware.md)

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
