[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / createApiKeyAuthInterceptor

# Function: createApiKeyAuthInterceptor()

> **createApiKeyAuthInterceptor**(`apiKey`): [`ClientMiddleware`](../type-aliases/ClientMiddleware.md)

Defined in: [client/interceptors.ts:72](https://github.com/juspay/neurolink/blob/release/src/lib/client/interceptors.ts#L72)

API Key authentication interceptor

Adds X-API-Key header to all requests.

## Parameters

### apiKey

`string`

## Returns

[`ClientMiddleware`](../type-aliases/ClientMiddleware.md)

## Example

```typescript
client.use(createApiKeyAuthInterceptor("your-api-key"));
```
