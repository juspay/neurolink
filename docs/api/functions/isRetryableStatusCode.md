[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / isRetryableStatusCode

# Function: isRetryableStatusCode()

> **isRetryableStatusCode**(`status`, `config?`): `boolean`

Defined in: [mcp/httpRetryHandler.ts:44](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/mcp/httpRetryHandler.ts#L44)

Check if an HTTP status code is retryable based on configuration

## Parameters

### status

`number`

HTTP status code to check

### config?

[`HTTPRetryConfig`](../type-aliases/HTTPRetryConfig.md) = `DEFAULT_HTTP_RETRY_CONFIG`

HTTP retry configuration

## Returns

`boolean`

True if the status code should trigger a retry
