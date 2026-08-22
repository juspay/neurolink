[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / createResponseTransformInterceptor

# Function: createResponseTransformInterceptor()

> **createResponseTransformInterceptor**(`transform`): [`ClientMiddleware`](../type-aliases/ClientMiddleware.md)

Defined in: [client/interceptors.ts:499](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/client/interceptors.ts#L499)

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
