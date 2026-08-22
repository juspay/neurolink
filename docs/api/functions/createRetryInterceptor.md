[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / createRetryInterceptor

# Function: createRetryInterceptor()

> **createRetryInterceptor**(`options`): [`ClientMiddleware`](../type-aliases/ClientMiddleware.md)

Defined in: [client/interceptors.ts:255](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/client/interceptors.ts#L255)

Retry interceptor with exponential backoff

Automatically retries failed requests with configurable backoff.

## Parameters

### options

[`RetryInterceptorOptions`](../type-aliases/RetryInterceptorOptions.md)

## Returns

[`ClientMiddleware`](../type-aliases/ClientMiddleware.md)

## Example

```typescript
client.use(
  createRetryInterceptor({
    maxAttempts: 3,
    initialDelayMs: 1000,
    maxDelayMs: 10000,
    backoffMultiplier: 2,
    retryableStatusCodes: [429, 500, 502, 503, 504],
    onRetry: (attempt, error) => console.log(`Retry ${attempt}:`, error),
  }),
);
```
