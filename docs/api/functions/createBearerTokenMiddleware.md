[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / createBearerTokenMiddleware

# Function: createBearerTokenMiddleware()

> **createBearerTokenMiddleware**(`token`): [`ClientMiddleware`](../type-aliases/ClientMiddleware.md)

Defined in: [client/auth.ts:304](https://github.com/juspay/neurolink/blob/release/src/lib/client/auth.ts#L304)

Create a Bearer token authentication middleware

## Parameters

### token

`string`

## Returns

[`ClientMiddleware`](../type-aliases/ClientMiddleware.md)

## Example

```typescript
const client = createClient({ baseUrl: "https://api.example.com" });
client.use(createBearerTokenMiddleware("your-jwt-token"));
```
