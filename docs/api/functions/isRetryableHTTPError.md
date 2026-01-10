[**NeuroLink API Reference v8.32.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / isRetryableHTTPError

# Function: isRetryableHTTPError()

> **isRetryableHTTPError**(`error`, `config`): `boolean`

Defined in: [mcp/httpRetryHandler.ts:57](https://github.com/juspay/neurolink/blob/1be79595b7d7307795c98da4267c1728cb50033d/src/lib/mcp/httpRetryHandler.ts#L57)

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

### config

[`HTTPRetryConfig`](../type-aliases/HTTPRetryConfig.md) = `DEFAULT_HTTP_RETRY_CONFIG`

HTTP retry configuration (optional)

## Returns

`boolean`

True if the error is retryable
