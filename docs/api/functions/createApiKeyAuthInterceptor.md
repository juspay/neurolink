[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / createApiKeyAuthInterceptor

# Function: createApiKeyAuthInterceptor()

> **createApiKeyAuthInterceptor**(`apiKey`): [`ClientMiddleware`](../type-aliases/ClientMiddleware.md)

Defined in: [client/interceptors.ts:72](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/client/interceptors.ts#L72)

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
