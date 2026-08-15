[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / createBearerAuthInterceptor

# Function: createBearerAuthInterceptor()

> **createBearerAuthInterceptor**(`token`): [`ClientMiddleware`](../type-aliases/ClientMiddleware.md)

Defined in: [client/interceptors.ts:89](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/client/interceptors.ts#L89)

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
