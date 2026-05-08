[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / createDynamicAuthInterceptor

# Function: createDynamicAuthInterceptor()

> **createDynamicAuthInterceptor**(`getAuth`): [`ClientMiddleware`](../type-aliases/ClientMiddleware.md)

Defined in: [client/interceptors.ts:110](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/client/interceptors.ts#L110)

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
