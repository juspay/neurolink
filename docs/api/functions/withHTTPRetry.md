[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / withHTTPRetry

# Function: withHTTPRetry()

> **withHTTPRetry**\<`T`\>(`operation`, `config?`): `Promise`\<`T`\>

Defined in: [mcp/httpRetryHandler.ts:166](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/mcp/httpRetryHandler.ts#L166)

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

### config?

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
