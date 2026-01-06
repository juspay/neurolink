[**NeuroLink API Reference v8.32.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / withHTTPRetry

# Function: withHTTPRetry()

> **withHTTPRetry**\<`T`\>(`operation`, `config`): `Promise`\<`T`\>

Defined in: [mcp/httpRetryHandler.ts:155](https://github.com/juspay/neurolink/blob/e2ee0ff27847312a233f21617e325b3d2c69c76c/src/lib/mcp/httpRetryHandler.ts#L155)

Execute an HTTP operation with retry logic

Implements exponential backoff with jitter to avoid thundering herd problems.
Uses the calculateBackoffDelay function from the core retry handler for
consistent delay calculation across the codebase.

## Type Parameters

### T

`T`

## Parameters

### operation

() => `Promise`\<`T`\>

Async operation to execute with retries

### config

`Partial`\<[`HTTPRetryConfig`](../type-aliases/HTTPRetryConfig.md)\> = `{}`

Partial HTTP retry configuration (merged with defaults)

## Returns

`Promise`\<`T`\>

Result of the operation

## Throws

Last error if all retry attempts fail

## Example

```typescript
const result = await withHTTPRetry(
  async () => {
    const response = await fetch(url);
    if (!response.ok) {
      const error = new Error(`HTTP ${response.status}`) as Error & {
        status: number;
      };
      error.status = response.status;
      throw error;
    }
    return response.json();
  },
  { maxAttempts: 5, initialDelay: 500 },
);
```
