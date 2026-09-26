[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / isRetryableHTTPError

# Function: isRetryableHTTPError()

> **isRetryableHTTPError**(`error`, `config?`): `boolean`

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
