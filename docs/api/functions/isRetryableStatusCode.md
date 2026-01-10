[**NeuroLink API Reference v8.32.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / isRetryableStatusCode

# Function: isRetryableStatusCode()

> **isRetryableStatusCode**(`status`, `config`): `boolean`

Defined in: [mcp/httpRetryHandler.ts:37](https://github.com/juspay/neurolink/blob/1be79595b7d7307795c98da4267c1728cb50033d/src/lib/mcp/httpRetryHandler.ts#L37)

Check if an HTTP status code is retryable based on configuration

## Parameters

### status

`number`

HTTP status code to check

### config

[`HTTPRetryConfig`](../type-aliases/HTTPRetryConfig.md) = `DEFAULT_HTTP_RETRY_CONFIG`

HTTP retry configuration

## Returns

`boolean`

True if the status code should trigger a retry
