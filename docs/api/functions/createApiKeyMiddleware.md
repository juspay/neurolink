[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / createApiKeyMiddleware

# Function: createApiKeyMiddleware()

> **createApiKeyMiddleware**(`apiKey`, `headerName?`): [`ClientMiddleware`](../type-aliases/ClientMiddleware.md)

Defined in: [client/auth.ts:288](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/client/auth.ts#L288)

Create an API key authentication middleware

## Parameters

### apiKey

`string`

### headerName?

`string` = `"X-API-Key"`

## Returns

[`ClientMiddleware`](../type-aliases/ClientMiddleware.md)

## Example

```typescript
const client = createClient({ baseUrl: "https://api.example.com" });
client.use(createApiKeyMiddleware("your-api-key"));
```
