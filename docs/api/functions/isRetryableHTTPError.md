[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / isRetryableHTTPError

# Function: isRetryableHTTPError()

> **isRetryableHTTPError**(`error`, `config?`): `boolean`

Defined in: [mcp/httpRetryHandler.ts:64](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/mcp/httpRetryHandler.ts#L64)

Check if an error is retryable for HTTP operations

Considers:

- Network errors (ECONNRESET, ENOTFOUND, ECONNREFUSED, ETIMEDOUT)
- Timeout errors
- HTTP status codes in the retryable list
- Fetch/network-related errors

## Parameters

### error

`unknown`

Error to check

### config?

[`HTTPRetryConfig`](../type-aliases/HTTPRetryConfig.md) = `DEFAULT_HTTP_RETRY_CONFIG`

HTTP retry configuration (optional)

## Returns

`boolean`

True if the error is retryable
