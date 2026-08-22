[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / createDynamicAuthInterceptor

# Function: createDynamicAuthInterceptor()

> **createDynamicAuthInterceptor**(`getAuth`): [`ClientMiddleware`](../type-aliases/ClientMiddleware.md)

Defined in: [client/interceptors.ts:110](https://github.com/juspay/neurolink/blob/release/src/lib/client/interceptors.ts#L110)

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
