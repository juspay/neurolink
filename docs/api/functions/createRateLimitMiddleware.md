[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / createRateLimitMiddleware

# Function: createRateLimitMiddleware()

> **createRateLimitMiddleware**(`config`): [`MiddlewareDefinition`](../type-aliases/MiddlewareDefinition.md)

Defined in: [server/middleware/rateLimit.ts:103](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/server/middleware/rateLimit.ts#L103)

Create rate limiting middleware

Response headers set on all requests:

- `X-RateLimit-Limit`: Maximum requests allowed per window
- `X-RateLimit-Remaining`: Requests remaining in current window
- `X-RateLimit-Reset`: Unix timestamp when the window resets

Additional headers on rate limit exceeded (HTTP 429):

- `Retry-After`: Seconds to wait before retrying

## Parameters

### config

[`RateLimitMiddlewareConfig`](../type-aliases/RateLimitMiddlewareConfig.md)

## Returns

[`MiddlewareDefinition`](../type-aliases/MiddlewareDefinition.md)

## Example

```typescript
const rateLimiter = createRateLimitMiddleware({
  maxRequests: 100,
  windowMs: 15 * 60 * 1000, // 15 minutes
  skipPaths: ["/api/health"],
});

server.registerMiddleware(rateLimiter);
```
