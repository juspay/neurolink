[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / createResponseTransformInterceptor

# Function: createResponseTransformInterceptor()

> **createResponseTransformInterceptor**(`transform`): [`ClientMiddleware`](../type-aliases/ClientMiddleware.md)

Defined in: [client/interceptors.ts:499](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/client/interceptors.ts#L499)

Response transformation interceptor

Transform response before returning.

## Parameters

### transform

(`response`) => [`ClientMiddlewareResponse`](../type-aliases/ClientMiddlewareResponse.md) \| `Promise`\<[`ClientMiddlewareResponse`](../type-aliases/ClientMiddlewareResponse.md)\>

## Returns

[`ClientMiddleware`](../type-aliases/ClientMiddleware.md)

## Example

```typescript
client.use(
  createResponseTransformInterceptor((response) => {
    // Add metadata to response
    response.context.processedAt = Date.now();
    return response;
  }),
);
```
