[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / createBearerAuthInterceptor

# Function: createBearerAuthInterceptor()

> **createBearerAuthInterceptor**(`token`): [`ClientMiddleware`](../type-aliases/ClientMiddleware.md)

Bearer token authentication interceptor

Adds Authorization header with Bearer token.

## Parameters

### token

`string`

## Returns

[`ClientMiddleware`](../type-aliases/ClientMiddleware.md)

## Example

```typescript
client.use(createBearerAuthInterceptor("your-token"));
```
