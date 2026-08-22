[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / AnthropicAttemptLogger

# Type Alias: AnthropicAttemptLogger

> **AnthropicAttemptLogger** = (`status`, `errorType?`, `errorMessage?`, `extra?`) => `void`

Defined in: [types/proxy.ts:807](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/proxy.ts#L807)

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
