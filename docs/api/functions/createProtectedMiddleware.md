[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / createProtectedMiddleware

# Function: createProtectedMiddleware()

> **createProtectedMiddleware**(`config`): `Promise`\<[`AuthMiddlewareHandler`](../type-aliases/AuthMiddlewareHandler.md)\<[`AuthRequestContext`](../type-aliases/AuthRequestContext.md)\>\>

Defined in: [auth/middleware/AuthMiddleware.ts:546](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/auth/middleware/AuthMiddleware.ts#L546)

Create combined auth + RBAC middleware

Convenience function that combines authentication and authorization.

## Parameters

### config

#### auth

[`AuthMiddlewareConfig`](../type-aliases/AuthMiddlewareConfig.md)

#### rbac?

[`RBACMiddlewareConfig`](../type-aliases/RBACMiddlewareConfig.md)

## Returns

`Promise`\<[`AuthMiddlewareHandler`](../type-aliases/AuthMiddlewareHandler.md)\<[`AuthRequestContext`](../type-aliases/AuthRequestContext.md)\>\>

## Example

```typescript
const protectedMiddleware = await createProtectedMiddleware({
  auth: {
    provider: "auth0",
    providerConfig: { type: "auth0", domain: "...", clientId: "..." },
  },
  rbac: {
    roles: ["admin"],
  },
});

const result = await protectedMiddleware(context);
```
