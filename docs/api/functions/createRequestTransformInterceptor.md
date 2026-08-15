[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / createRequestTransformInterceptor

# Function: createRequestTransformInterceptor()

> **createRequestTransformInterceptor**(`transform`): [`ClientMiddleware`](../type-aliases/ClientMiddleware.md)

Defined in: [client/interceptors.ts:472](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/client/interceptors.ts#L472)

Request transformation interceptor

Transform request before sending.

## Parameters

### transform

(`request`) => [`ClientMiddlewareRequest`](../type-aliases/ClientMiddlewareRequest.md) \| `Promise`\<[`ClientMiddlewareRequest`](../type-aliases/ClientMiddlewareRequest.md)\>

## Returns

[`ClientMiddleware`](../type-aliases/ClientMiddleware.md)

## Example

```typescript
client.use(
  createRequestTransformInterceptor((request) => {
    // Add custom header based on request body
    if (request.body?.priority === "high") {
      request.headers["X-Priority"] = "high";
    }
    return request;
  }),
);
```
