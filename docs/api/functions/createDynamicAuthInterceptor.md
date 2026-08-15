[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / createDynamicAuthInterceptor

# Function: createDynamicAuthInterceptor()

> **createDynamicAuthInterceptor**(`getAuth`): [`ClientMiddleware`](../type-aliases/ClientMiddleware.md)

Defined in: [client/interceptors.ts:110](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/client/interceptors.ts#L110)

Dynamic authentication interceptor

Retrieves authentication token dynamically for each request.
Useful for token refresh scenarios.

## Parameters

### getAuth

() => `Promise`\<\{ `type`: `"apiKey"`; `key`: `string`; \} \| \{ `type`: `"bearer"`; `token`: `string`; \} \| `null`\>

## Returns

[`ClientMiddleware`](../type-aliases/ClientMiddleware.md)

## Example

```typescript
client.use(
  createDynamicAuthInterceptor(async () => {
    const token = await getAccessToken();
    return { type: "bearer", token };
  }),
);
```
