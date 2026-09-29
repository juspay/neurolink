[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ClaudeFinalRequestLogger

# Type Alias: ClaudeFinalRequestLogger

> **ClaudeFinalRequestLogger** = (`status`, `accountLabel`, `accountType`, `errorType?`, `errorMessage?`, `extra?`) => `void`

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

#### cacheCreation1hTokens?

`number`

1h-TTL share of `cacheCreationTokens` (subset); unset when not reported.

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
