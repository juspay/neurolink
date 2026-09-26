[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / createAuthMiddleware

# Function: createAuthMiddleware()

> **createAuthMiddleware**(`config`): [`MiddlewareDefinition`](../type-aliases/MiddlewareDefinition.md)

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
