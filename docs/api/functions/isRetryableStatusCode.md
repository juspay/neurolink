[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / isRetryableStatusCode

# Function: isRetryableStatusCode()

> **isRetryableStatusCode**(`status`, `config?`): `boolean`

Defined in: [mcp/httpRetryHandler.ts:44](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/mcp/httpRetryHandler.ts#L44)

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
