[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / createAuthProviderMiddleware

# Function: createAuthProviderMiddleware()

> **createAuthProviderMiddleware**(`config`): `Promise`\<[`AuthMiddlewareHandler`](../type-aliases/AuthMiddlewareHandler.md)\<[`AuthRequestContext`](../type-aliases/AuthRequestContext.md)\>\>

Defined in: [auth/middleware/AuthMiddleware.ts:186](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/auth/middleware/AuthMiddleware.ts#L186)

Create authentication middleware

Validates tokens and attaches user context to requests.

## Parameters

### config

[`AuthMiddlewareConfig`](../type-aliases/AuthMiddlewareConfig.md)

## Returns

`Promise`\<[`AuthMiddlewareHandler`](../type-aliases/AuthMiddlewareHandler.md)\<[`AuthRequestContext`](../type-aliases/AuthRequestContext.md)\>\>

## Example

```typescript
const authMiddleware = await createAuthMiddleware({
  provider: "auth0",
  providerConfig: {
    type: "auth0",
    domain: "your-tenant.auth0.com",
    clientId: "your-client-id",
  },
  publicRoutes: ["/health", "/public/*"],
});

// Use in request handler
const result = await authMiddleware(requestContext);
if (result.proceed) {
  // Access authenticated context
  console.log("User:", result.context?.user);
} else {
  // Return error response
  res.status(result.error.statusCode).json({ error: result.error.message });
}
```
