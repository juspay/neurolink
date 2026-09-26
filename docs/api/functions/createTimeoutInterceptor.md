[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / createTimeoutInterceptor

# Function: createTimeoutInterceptor()

> **createTimeoutInterceptor**(`options`): [`ClientMiddleware`](../type-aliases/ClientMiddleware.md)

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
