[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / createBearerTokenMiddleware

# Function: createBearerTokenMiddleware()

> **createBearerTokenMiddleware**(`token`): [`ClientMiddleware`](../type-aliases/ClientMiddleware.md)

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
