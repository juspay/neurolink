[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / createRateLimitMiddleware

# Function: createRateLimitMiddleware()

> **createRateLimitMiddleware**(`config`): [`MiddlewareDefinition`](../type-aliases/MiddlewareDefinition.md)

Defined in: [server/middleware/rateLimit.ts:103](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/server/middleware/rateLimit.ts#L103)

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
