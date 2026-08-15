[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / createTimeoutInterceptor

# Function: createTimeoutInterceptor()

> **createTimeoutInterceptor**(`options`): [`ClientMiddleware`](../type-aliases/ClientMiddleware.md)

Defined in: [client/interceptors.ts:649](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/client/interceptors.ts#L649)

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
