[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / UsageContext

# Type Alias: UsageContext

> **UsageContext** = `object`

Defined in: [types/proxy.ts:2162](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2162)

Token usage and rate-limit utilisation recorded at end of request.

## Properties

### inputIncludesCachedTokens?

> `optional` **inputIncludesCachedTokens?**: `boolean`

Defined in: [types/proxy.ts:2164](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2164)

True when input includes the cache breakdown (native Codex wire usage).

---

### inputTokens

> **inputTokens**: `number`

Defined in: [types/proxy.ts:2165](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2165)

---

### outputTokens

> **outputTokens**: `number`

Defined in: [types/proxy.ts:2166](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2166)

---

### cacheCreationTokens

> **cacheCreationTokens**: `number`

Defined in: [types/proxy.ts:2167](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2167)

---

### cacheReadTokens

> **cacheReadTokens**: `number`

Defined in: [types/proxy.ts:2168](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2168)

---

### reasoningTokens?

> `optional` **reasoningTokens?**: `number`

Defined in: [types/proxy.ts:2169](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2169)

---

### rateLimitAfter5h?

> `optional` **rateLimitAfter5h?**: `number`

Defined in: [types/proxy.ts:2170](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2170)

---

### rateLimitAfter7d?

> `optional` **rateLimitAfter7d?**: `number`

Defined in: [types/proxy.ts:2171](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2171)
