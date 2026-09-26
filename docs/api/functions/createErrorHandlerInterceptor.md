[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / createErrorHandlerInterceptor

# Function: createErrorHandlerInterceptor()

> **createErrorHandlerInterceptor**(`options?`): [`ClientMiddleware`](../type-aliases/ClientMiddleware.md)

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
