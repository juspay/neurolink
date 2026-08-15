[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / createTokenManagerMiddleware

# Function: createTokenManagerMiddleware()

> **createTokenManagerMiddleware**(`tokenManager`): [`ClientMiddleware`](../type-aliases/ClientMiddleware.md)

Defined in: [client/auth.ts:326](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/client/auth.ts#L326)

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
