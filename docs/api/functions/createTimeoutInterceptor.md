[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / createTimeoutInterceptor

# Function: createTimeoutInterceptor()

> **createTimeoutInterceptor**(`options`): [`ClientMiddleware`](../type-aliases/ClientMiddleware.md)

Defined in: [client/interceptors.ts:649](https://github.com/juspay/neurolink/blob/release/src/lib/client/interceptors.ts#L649)

Timeout interceptor

Adds a timeout to requests.

## Parameters

### options

[`TimeoutInterceptorOptions`](../type-aliases/TimeoutInterceptorOptions.md)

## Returns

[`ClientMiddleware`](../type-aliases/ClientMiddleware.md)

## Example

```typescript
client.use(
  createTimeoutInterceptor({
    timeout: 30000, // 30 seconds
    onTimeout: (request) => console.log("Request timed out:", request.url),
  }),
);
```
