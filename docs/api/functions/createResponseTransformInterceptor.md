[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / createResponseTransformInterceptor

# Function: createResponseTransformInterceptor()

> **createResponseTransformInterceptor**(`transform`): [`ClientMiddleware`](../type-aliases/ClientMiddleware.md)

Defined in: [client/interceptors.ts:499](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/client/interceptors.ts#L499)

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
