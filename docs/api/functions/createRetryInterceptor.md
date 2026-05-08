[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / createRetryInterceptor

# Function: createRetryInterceptor()

> **createRetryInterceptor**(`options`): [`ClientMiddleware`](../type-aliases/ClientMiddleware.md)

Defined in: [client/interceptors.ts:255](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/client/interceptors.ts#L255)

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
