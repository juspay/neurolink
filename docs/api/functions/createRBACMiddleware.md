[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / createRBACMiddleware

# Function: createRBACMiddleware()

> **createRBACMiddleware**(`config`): [`AuthMiddlewareHandler`](../type-aliases/AuthMiddlewareHandler.md)\<[`AuthenticatedContext`](../type-aliases/AuthenticatedContext.md)\>

Defined in: [auth/middleware/AuthMiddleware.ts:351](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/auth/middleware/AuthMiddleware.ts#L351)

Create RBAC (Role-Based Access Control) middleware

Checks if authenticated user has required roles/permissions.

## Parameters

### config

[`RBACMiddlewareConfig`](../type-aliases/RBACMiddlewareConfig.md)

## Returns

[`AuthMiddlewareHandler`](../type-aliases/AuthMiddlewareHandler.md)\<[`AuthenticatedContext`](../type-aliases/AuthenticatedContext.md)\>

## Example

```typescript
const rbacMiddleware = createRBACMiddleware({
  roles: ["admin", "moderator"],
  permissions: ["read:users"],
});

// Use after auth middleware
const authResult = await authMiddleware(context);
if (authResult.proceed && authResult.context) {
  const rbacResult = await rbacMiddleware(authResult.context);
  if (!rbacResult.proceed) {
    res.status(403).json({ error: rbacResult.error.message });
  }
}
```
