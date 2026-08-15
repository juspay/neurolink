[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / createMultiAuthMiddleware

# Function: createMultiAuthMiddleware()

> **createMultiAuthMiddleware**(`config`): [`ClientMiddleware`](../type-aliases/ClientMiddleware.md)

Defined in: [client/auth.ts:389](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/client/auth.ts#L389)

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
