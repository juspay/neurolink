[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / createBearerAuthInterceptor

# Function: createBearerAuthInterceptor()

> **createBearerAuthInterceptor**(`token`): [`ClientMiddleware`](../type-aliases/ClientMiddleware.md)

Defined in: [client/interceptors.ts:89](https://github.com/juspay/neurolink/blob/release/src/lib/client/interceptors.ts#L89)

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
