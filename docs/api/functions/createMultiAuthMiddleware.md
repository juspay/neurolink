[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / createMultiAuthMiddleware

# Function: createMultiAuthMiddleware()

> **createMultiAuthMiddleware**(`config`): [`ClientMiddleware`](../type-aliases/ClientMiddleware.md)

Defined in: [client/auth.ts:392](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/client/auth.ts#L392)

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
