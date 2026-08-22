[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / ClaudeLoggedErrorBuilder

# Type Alias: ClaudeLoggedErrorBuilder

> **ClaudeLoggedErrorBuilder** = (`status`, `message`, `errorType?`, `extra?`) => [`ClaudeErrorResponse`](ClaudeErrorResponse.md)

Defined in: [types/proxy.ts:782](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/proxy.ts#L782)

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

#### transportScope?

[`ProxyTransportScope`](ProxyTransportScope.md)

## Returns

[`ClaudeErrorResponse`](ClaudeErrorResponse.md)
