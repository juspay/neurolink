[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / createErrorHandlerInterceptor

# Function: createErrorHandlerInterceptor()

> **createErrorHandlerInterceptor**(`options?`): [`ClientMiddleware`](../type-aliases/ClientMiddleware.md)

Defined in: [client/interceptors.ts:713](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/client/interceptors.ts#L713)

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
