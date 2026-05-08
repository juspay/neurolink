[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / createProtectedMiddleware

# Function: createProtectedMiddleware()

> **createProtectedMiddleware**(`config`): `Promise`\<[`AuthMiddlewareHandler`](../type-aliases/AuthMiddlewareHandler.md)\<[`AuthRequestContext`](../type-aliases/AuthRequestContext.md)\>\>

Defined in: [auth/middleware/AuthMiddleware.ts:546](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/auth/middleware/AuthMiddleware.ts#L546)

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
