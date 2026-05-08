[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / createRequestTransformInterceptor

# Function: createRequestTransformInterceptor()

> **createRequestTransformInterceptor**(`transform`): [`ClientMiddleware`](../type-aliases/ClientMiddleware.md)

Defined in: [client/interceptors.ts:472](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/client/interceptors.ts#L472)

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
