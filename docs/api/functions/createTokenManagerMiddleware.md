[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / createTokenManagerMiddleware

# Function: createTokenManagerMiddleware()

> **createTokenManagerMiddleware**(`tokenManager`): [`ClientMiddleware`](../type-aliases/ClientMiddleware.md)

Defined in: [client/auth.ts:329](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/client/auth.ts#L329)

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
