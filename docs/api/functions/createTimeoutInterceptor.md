[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / createTimeoutInterceptor

# Function: createTimeoutInterceptor()

> **createTimeoutInterceptor**(`options`): [`ClientMiddleware`](../type-aliases/ClientMiddleware.md)

Defined in: [client/interceptors.ts:649](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/client/interceptors.ts#L649)

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
