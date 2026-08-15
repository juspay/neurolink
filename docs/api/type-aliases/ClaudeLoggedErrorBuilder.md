[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / ClaudeLoggedErrorBuilder

# Type Alias: ClaudeLoggedErrorBuilder

> **ClaudeLoggedErrorBuilder** = (`status`, `message`, `errorType?`, `extra?`) => [`ClaudeErrorResponse`](ClaudeErrorResponse.md)

Defined in: [types/proxy.ts:764](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/proxy.ts#L764)

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
