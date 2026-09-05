[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / AnthropicAttemptLogger

# Type Alias: AnthropicAttemptLogger

> **AnthropicAttemptLogger** = (`status`, `errorType?`, `errorMessage?`, `extra?`) => `void`

Defined in: [types/proxy.ts:873](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L873)

## Parameters

### status

`number`

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

#### retryable?

`boolean`

#### connectPhase?

`boolean`

The transport failure happened before any request byte was sent.

#### errorCode?

`string`

Low-level transport code such as ETIMEDOUT or EADDRNOTAVAIL.

#### transportScope?

[`ProxyTransportScope`](ProxyTransportScope.md)

#### rateLimitKind?

`"transient"` \| `"quota"`

#### cooldownReason?

`"transient"` \| `"session"` \| `"weekly"` \| `"unified"`

#### attemptDurationMs?

`number`

Override for nested retries whose attempt starts after this logger.

#### attempt?

`number`

Override used when one account selection performs an OAuth retry fetch.

## Returns

`void`
