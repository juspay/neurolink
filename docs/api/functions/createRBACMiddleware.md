[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / createRBACMiddleware

# Function: createRBACMiddleware()

> **createRBACMiddleware**(`config`): [`AuthMiddlewareHandler`](../type-aliases/AuthMiddlewareHandler.md)\<[`AuthenticatedContext`](../type-aliases/AuthenticatedContext.md)\>

Defined in: [auth/middleware/AuthMiddleware.ts:351](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/auth/middleware/AuthMiddleware.ts#L351)

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
