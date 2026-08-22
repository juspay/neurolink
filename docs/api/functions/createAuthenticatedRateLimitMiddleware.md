[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / createAuthenticatedRateLimitMiddleware

# Function: createAuthenticatedRateLimitMiddleware()

> **createAuthenticatedRateLimitMiddleware**(`authMiddleware`, `rateLimitConfig`, `storage?`): (`context`) => `Promise`\<\{ `proceed`: `boolean`; `context?`: [`AuthenticatedContext`](../type-aliases/AuthenticatedContext.md); `rateLimitResult?`: [`RateLimitResult`](../type-aliases/RateLimitResult.md); `response?`: `Response`; \}\>

Defined in: [auth/middleware/rateLimitByUser.ts:609](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/auth/middleware/rateLimitByUser.ts#L609)

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
