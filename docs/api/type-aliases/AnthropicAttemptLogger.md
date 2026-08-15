[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / AnthropicAttemptLogger

# Type Alias: AnthropicAttemptLogger

> **AnthropicAttemptLogger** = (`status`, `errorType?`, `errorMessage?`, `extra?`) => `void`

Defined in: [types/proxy.ts:789](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/proxy.ts#L789)

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
