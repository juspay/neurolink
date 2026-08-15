[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / createLoggingInterceptor

# Function: createLoggingInterceptor()

> **createLoggingInterceptor**(`options?`): [`ClientMiddleware`](../type-aliases/ClientMiddleware.md)

Defined in: [client/interceptors.ts:148](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/client/interceptors.ts#L148)

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
