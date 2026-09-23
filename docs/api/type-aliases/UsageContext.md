[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / UsageContext

# Type Alias: UsageContext

> **UsageContext** = `object`

Defined in: [types/proxy.ts:2142](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2142)

Token usage and rate-limit utilisation recorded at end of request.

## Properties

### inputIncludesCachedTokens?

> `optional` **inputIncludesCachedTokens?**: `boolean`

Defined in: [types/proxy.ts:2144](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2144)

True when input includes the cache breakdown (native Codex wire usage).

---

### inputTokens

> **inputTokens**: `number`

Defined in: [types/proxy.ts:2145](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2145)

---

### outputTokens

> **outputTokens**: `number`

Defined in: [types/proxy.ts:2146](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2146)

---

### cacheCreationTokens

> **cacheCreationTokens**: `number`

Defined in: [types/proxy.ts:2147](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2147)

---

### cacheReadTokens

> **cacheReadTokens**: `number`

Defined in: [types/proxy.ts:2148](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2148)

---

### reasoningTokens?

> `optional` **reasoningTokens?**: `number`

Defined in: [types/proxy.ts:2149](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2149)

---

### rateLimitAfter5h?

> `optional` **rateLimitAfter5h?**: `number`

Defined in: [types/proxy.ts:2150](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2150)

---

### rateLimitAfter7d?

> `optional` **rateLimitAfter7d?**: `number`

Defined in: [types/proxy.ts:2151](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2151)
