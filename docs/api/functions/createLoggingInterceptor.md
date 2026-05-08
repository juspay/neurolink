[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / createLoggingInterceptor

# Function: createLoggingInterceptor()

> **createLoggingInterceptor**(`options?`): [`ClientMiddleware`](../type-aliases/ClientMiddleware.md)

Defined in: [client/interceptors.ts:148](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/client/interceptors.ts#L148)

Logging interceptor

Logs request and response details for debugging.

## Parameters

### options?

[`LoggingInterceptorOptions`](../type-aliases/LoggingInterceptorOptions.md) = `{}`

## Returns

[`ClientMiddleware`](../type-aliases/ClientMiddleware.md)

## Example

```typescript
client.use(
  createLoggingInterceptor({
    logRequest: true,
    logResponse: true,
    redactFields: ["apiKey", "password"],
  }),
);
```
