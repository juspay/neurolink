[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ClaudeLoggedErrorBuilder

# Type Alias: ClaudeLoggedErrorBuilder

> **ClaudeLoggedErrorBuilder** = (`status`, `message`, `errorType?`, `extra?`) => [`ClaudeErrorResponse`](ClaudeErrorResponse.md)

Defined in: [types/proxy.ts:1208](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1208)

## Parameters

### status

`number`

### message

`string`

### errorType?

`string`

### extra?

#### account?

`string`

#### accountType?

`string`

#### attempt?

`number`

#### errorCode?

`string`

#### retryable?

`boolean`

#### transportScope?

[`ProxyTransportScope`](ProxyTransportScope.md)

## Returns

[`ClaudeErrorResponse`](ClaudeErrorResponse.md)
