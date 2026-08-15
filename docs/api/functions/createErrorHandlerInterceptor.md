[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / createErrorHandlerInterceptor

# Function: createErrorHandlerInterceptor()

> **createErrorHandlerInterceptor**(`options?`): [`ClientMiddleware`](../type-aliases/ClientMiddleware.md)

Defined in: [client/interceptors.ts:713](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/client/interceptors.ts#L713)

Error handling interceptor

Provides centralized error handling and transformation.

## Parameters

### options?

[`ErrorHandlerOptions`](../type-aliases/ErrorHandlerOptions.md) = `{}`

## Returns

[`ClientMiddleware`](../type-aliases/ClientMiddleware.md)

## Example

```typescript
client.use(
  createErrorHandlerInterceptor({
    onError: (error, request) => {
      console.error("Request failed:", error.message);
    },
    reportError: async (error, context) => {
      await errorReportingService.report(error, context);
    },
  }),
);
```
