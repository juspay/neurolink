[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / UsageContext

# Type Alias: UsageContext

> **UsageContext** = `object`

Defined in: [types/proxy.ts:2254](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2254)

Token usage and rate-limit utilisation recorded at end of request.

## Properties

### inputIncludesCachedTokens?

> `optional` **inputIncludesCachedTokens?**: `boolean`

Defined in: [types/proxy.ts:2256](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2256)

True when input includes the cache breakdown (native Codex wire usage).

---

### inputTokens

> **inputTokens**: `number`

Defined in: [types/proxy.ts:2257](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2257)

---

### outputTokens

> **outputTokens**: `number`

Defined in: [types/proxy.ts:2258](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2258)

---

### cacheCreationTokens

> **cacheCreationTokens**: `number`

Defined in: [types/proxy.ts:2259](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2259)

---

### cacheReadTokens

> **cacheReadTokens**: `number`

Defined in: [types/proxy.ts:2260](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2260)

---

### cacheReadTokensObserved?

> `optional` **cacheReadTokensObserved?**: `boolean`

Defined in: [types/proxy.ts:2268](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2268)

Whether the provider actually reported each cache count. Omitted means
observed, so every path that genuinely reports a breakdown is unchanged.
When false the count is not recorded at all, because a zero written into
`proxy_tokens_cache_read` is indistinguishable from a real cache miss and
biases every rate built on that counter downward.

---

### cacheCreationTokensObserved?

> `optional` **cacheCreationTokensObserved?**: `boolean`

Defined in: [types/proxy.ts:2269](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2269)

---

### reasoningTokens?

> `optional` **reasoningTokens?**: `number`

Defined in: [types/proxy.ts:2270](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2270)

---

### rateLimitAfter5h?

> `optional` **rateLimitAfter5h?**: `number`

Defined in: [types/proxy.ts:2271](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2271)

---

### rateLimitAfter7d?

> `optional` **rateLimitAfter7d?**: `number`

Defined in: [types/proxy.ts:2272](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2272)
