[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / isRetryableStatusCode

# Function: isRetryableStatusCode()

> **isRetryableStatusCode**(`status`, `config?`): `boolean`

Defined in: [mcp/httpRetryHandler.ts:44](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/mcp/httpRetryHandler.ts#L44)

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
