[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / UsageContext

# Type Alias: UsageContext

> **UsageContext** = `object`

Token usage and rate-limit utilisation recorded at end of request.

## Properties

### inputIncludesCachedTokens?

> `optional` **inputIncludesCachedTokens?**: `boolean`

True when input includes the cache breakdown (native Codex wire usage).

---

### inputTokens

> **inputTokens**: `number`

---

### outputTokens

> **outputTokens**: `number`

---

### cacheCreationTokens

> **cacheCreationTokens**: `number`

---

### cacheReadTokens

> **cacheReadTokens**: `number`

---

### cacheReadTokensObserved?

> `optional` **cacheReadTokensObserved?**: `boolean`

Whether the provider actually reported each cache count. Omitted means
observed, so every path that genuinely reports a breakdown is unchanged.
When false the count is not recorded at all, because a zero written into
`proxy_tokens_cache_read` is indistinguishable from a real cache miss and
biases every rate built on that counter downward.

---

### cacheCreationTokensObserved?

> `optional` **cacheCreationTokensObserved?**: `boolean`

---

### reasoningTokens?

> `optional` **reasoningTokens?**: `number`

---

### rateLimitAfter5h?

> `optional` **rateLimitAfter5h?**: `number`

---

### rateLimitAfter7d?

> `optional` **rateLimitAfter7d?**: `number`
