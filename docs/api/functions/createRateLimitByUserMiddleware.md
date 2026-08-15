[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / createRateLimitByUserMiddleware

# Function: createRateLimitByUserMiddleware()

> **createRateLimitByUserMiddleware**(`config`, `storage?`): (`context`) => `Promise`\<[`RateLimitMiddlewareResult`](../type-aliases/RateLimitMiddlewareResult.md)\>

Defined in: [auth/middleware/rateLimitByUser.ts:557](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/auth/middleware/rateLimitByUser.ts#L557)

Create rate limiting middleware for authenticated requests

## Parameters

### config

[`AuthRateLimitConfig`](../type-aliases/AuthRateLimitConfig.md)

Rate limit configuration

### storage?

[`RateLimitStorage`](../type-aliases/RateLimitStorage.md)

Optional custom storage backend

## Returns

Middleware function

(`context`) => `Promise`\<[`RateLimitMiddlewareResult`](../type-aliases/RateLimitMiddlewareResult.md)\>

## Example

```typescript
const rateLimitMiddleware = createRateLimitByUserMiddleware({
  maxRequests: 100,
  windowMs: 60000, // 1 minute
  roleLimits: {
    premium: 500,
    admin: 1000,
  },
  skipRoles: ["super-admin"],
});

// Use in server
app.use(async (request, context) => {
  const result = await rateLimitMiddleware(context);
  if (!result.proceed) {
    return result.response;
  }
  // Continue processing...
});
```
