[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / createAuthenticatedRateLimitMiddleware

# Function: createAuthenticatedRateLimitMiddleware()

> **createAuthenticatedRateLimitMiddleware**(`authMiddleware`, `rateLimitConfig`, `storage?`): (`context`) => `Promise`\<\{ `proceed`: `boolean`; `context?`: [`AuthenticatedContext`](../type-aliases/AuthenticatedContext.md); `rateLimitResult?`: [`RateLimitResult`](../type-aliases/RateLimitResult.md); `response?`: `Response`; \}\>

Defined in: [auth/middleware/rateLimitByUser.ts:609](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/auth/middleware/rateLimitByUser.ts#L609)

Create a combined auth and rate limit middleware

## Parameters

### authMiddleware

(`context`) => `Promise`\<\{ `proceed`: `boolean`; `context?`: [`AuthenticatedContext`](../type-aliases/AuthenticatedContext.md); `response?`: `Response`; \}\>

Authentication middleware function

### rateLimitConfig

[`AuthRateLimitConfig`](../type-aliases/AuthRateLimitConfig.md)

Rate limit configuration

### storage?

[`RateLimitStorage`](../type-aliases/RateLimitStorage.md)

Optional custom storage backend

## Returns

Combined middleware function

(`context`) => `Promise`\<\{ `proceed`: `boolean`; `context?`: [`AuthenticatedContext`](../type-aliases/AuthenticatedContext.md); `rateLimitResult?`: [`RateLimitResult`](../type-aliases/RateLimitResult.md); `response?`: `Response`; \}\>

## Example

```typescript
const protectedRoute = createAuthenticatedRateLimitMiddleware(
  createAuthMiddleware({ provider: authProvider }),
  { maxRequests: 100, windowMs: 60000 },
);

// Use in routes
app.post("/api/generate", async (request) => {
  const result = await protectedRoute(request);
  if (!result.proceed) {
    return result.response;
  }
  // Handle request with result.context
});
```
