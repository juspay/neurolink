[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ClaudeFinalRequestLogger

# Type Alias: ClaudeFinalRequestLogger

> **ClaudeFinalRequestLogger** = (`status`, `accountLabel`, `accountType`, `errorType?`, `errorMessage?`, `extra?`) => `void`

Defined in: [types/proxy.ts:1251](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1251)

## Parameters

### status

`number`

### accountLabel

`string`

### accountType

`string`

### errorType?

`string`

### errorMessage?

`string`

### extra?

#### inputTokens?

`number`

#### outputTokens?

`number`

#### cacheCreationTokens?

`number`

#### cacheReadTokens?

`number`

#### cacheReadTokensObserved?

`boolean`

False when the provider reported no cache breakdown; see RequestLogEntry.

#### cacheCreationTokensObserved?

`boolean`

#### reasoningTokens?

`number`

#### errorCode?

`string`

#### retryable?

`boolean`

#### transportScope?

[`ProxyTransportScope`](ProxyTransportScope.md)

## Returns

`void`
