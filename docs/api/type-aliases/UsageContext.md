[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / UsageContext

# Type Alias: UsageContext

> **UsageContext** = `object`

Defined in: [types/proxy.ts:2230](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2230)

Token usage and rate-limit utilisation recorded at end of request.

## Properties

### inputIncludesCachedTokens?

> `optional` **inputIncludesCachedTokens?**: `boolean`

Defined in: [types/proxy.ts:2232](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2232)

True when input includes the cache breakdown (native Codex wire usage).

---

### inputTokens

> **inputTokens**: `number`

Defined in: [types/proxy.ts:2233](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2233)

---

### outputTokens

> **outputTokens**: `number`

Defined in: [types/proxy.ts:2234](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2234)

---

### cacheCreationTokens

> **cacheCreationTokens**: `number`

Defined in: [types/proxy.ts:2235](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2235)

---

### cacheReadTokens

> **cacheReadTokens**: `number`

Defined in: [types/proxy.ts:2236](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2236)

---

### reasoningTokens?

> `optional` **reasoningTokens?**: `number`

Defined in: [types/proxy.ts:2237](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2237)

---

### rateLimitAfter5h?

> `optional` **rateLimitAfter5h?**: `number`

Defined in: [types/proxy.ts:2238](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2238)

---

### rateLimitAfter7d?

> `optional` **rateLimitAfter7d?**: `number`

Defined in: [types/proxy.ts:2239](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2239)
