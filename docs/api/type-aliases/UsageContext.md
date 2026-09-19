[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / UsageContext

# Type Alias: UsageContext

> **UsageContext** = `object`

Defined in: [types/proxy.ts:2091](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2091)

Token usage and rate-limit utilisation recorded at end of request.

## Properties

### inputIncludesCachedTokens?

> `optional` **inputIncludesCachedTokens?**: `boolean`

Defined in: [types/proxy.ts:2093](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2093)

True when input includes the cache breakdown (native Codex wire usage).

---

### inputTokens

> **inputTokens**: `number`

Defined in: [types/proxy.ts:2094](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2094)

---

### outputTokens

> **outputTokens**: `number`

Defined in: [types/proxy.ts:2095](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2095)

---

### cacheCreationTokens

> **cacheCreationTokens**: `number`

Defined in: [types/proxy.ts:2096](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2096)

---

### cacheReadTokens

> **cacheReadTokens**: `number`

Defined in: [types/proxy.ts:2097](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2097)

---

### reasoningTokens?

> `optional` **reasoningTokens?**: `number`

Defined in: [types/proxy.ts:2098](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2098)

---

### rateLimitAfter5h?

> `optional` **rateLimitAfter5h?**: `number`

Defined in: [types/proxy.ts:2099](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2099)

---

### rateLimitAfter7d?

> `optional` **rateLimitAfter7d?**: `number`

Defined in: [types/proxy.ts:2100](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2100)
