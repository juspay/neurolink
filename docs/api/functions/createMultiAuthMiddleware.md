[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / createMultiAuthMiddleware

# Function: createMultiAuthMiddleware()

> **createMultiAuthMiddleware**(`config`): [`ClientMiddleware`](../type-aliases/ClientMiddleware.md)

Create a multi-auth middleware that supports multiple authentication methods

## Parameters

### config

[`ClientAuthConfig`](../type-aliases/ClientAuthConfig.md)

## Returns

[`ClientMiddleware`](../type-aliases/ClientMiddleware.md)

## Example

```typescript
const client = createClient({ baseUrl: "https://api.example.com" });
client.use(
  createMultiAuthMiddleware({
    apiKey: process.env.API_KEY,
    token: sessionToken,
  }),
);
```
