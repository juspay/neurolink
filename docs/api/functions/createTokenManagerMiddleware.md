[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / createTokenManagerMiddleware

# Function: createTokenManagerMiddleware()

> **createTokenManagerMiddleware**(`tokenManager`): [`ClientMiddleware`](../type-aliases/ClientMiddleware.md)

Defined in: [client/auth.ts:326](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/client/auth.ts#L326)

Create a dynamic authentication middleware with token manager

## Parameters

### tokenManager

[`OAuth2TokenManager`](../classes/OAuth2TokenManager.md) \| [`JWTTokenManager`](../classes/JWTTokenManager.md)

## Returns

[`ClientMiddleware`](../type-aliases/ClientMiddleware.md)

## Example

```typescript
const tokenManager = new OAuth2TokenManager({
  tokenUrl: "https://auth.example.com/oauth/token",
  clientId: "client-id",
  clientSecret: "client-secret",
});

const client = createClient({ baseUrl: "https://api.example.com" });
client.use(createTokenManagerMiddleware(tokenManager));
```
