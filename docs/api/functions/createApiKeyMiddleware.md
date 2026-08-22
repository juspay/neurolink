[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / createApiKeyMiddleware

# Function: createApiKeyMiddleware()

> **createApiKeyMiddleware**(`apiKey`, `headerName?`): [`ClientMiddleware`](../type-aliases/ClientMiddleware.md)

Defined in: [client/auth.ts:285](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/client/auth.ts#L285)

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
