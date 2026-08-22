[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / createApiKeyAuthInterceptor

# Function: createApiKeyAuthInterceptor()

> **createApiKeyAuthInterceptor**(`apiKey`): [`ClientMiddleware`](../type-aliases/ClientMiddleware.md)

Defined in: [client/interceptors.ts:72](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/client/interceptors.ts#L72)

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
