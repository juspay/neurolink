[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / createAuthMiddleware

# Function: createAuthMiddleware()

> **createAuthMiddleware**(`config`): [`MiddlewareDefinition`](../type-aliases/MiddlewareDefinition.md)

Defined in: [server/middleware/auth.ts:78](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/server/middleware/auth.ts#L78)

Create authentication middleware

## Parameters

### config

[`ServerServerAuthConfig`](../type-aliases/ServerServerAuthConfig.md)

## Returns

[`MiddlewareDefinition`](../type-aliases/MiddlewareDefinition.md)

## Example

```typescript
const authMiddleware = createAuthMiddleware({
  type: "bearer",
  validate: async (token) => {
    const user = await verifyJWT(token);
    return user ? { id: user.id, email: user.email } : null;
  },
  skipPaths: ["/api/health", "/api/ready"],
});

server.registerMiddleware(authMiddleware);
```
