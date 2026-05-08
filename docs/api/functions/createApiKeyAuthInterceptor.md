[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / createApiKeyAuthInterceptor

# Function: createApiKeyAuthInterceptor()

> **createApiKeyAuthInterceptor**(`apiKey`): [`ClientMiddleware`](../type-aliases/ClientMiddleware.md)

Defined in: [client/interceptors.ts:72](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/client/interceptors.ts#L72)

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
