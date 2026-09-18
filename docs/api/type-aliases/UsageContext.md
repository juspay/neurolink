[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / UsageContext

# Type Alias: UsageContext

> **UsageContext** = `object`

Defined in: [types/proxy.ts:2006](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2006)

Token usage and rate-limit utilisation recorded at end of request.

## Properties

### inputIncludesCachedTokens?

> `optional` **inputIncludesCachedTokens?**: `boolean`

Defined in: [types/proxy.ts:2008](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2008)

True when input includes the cache breakdown (native Codex wire usage).

---

### inputTokens

> **inputTokens**: `number`

Defined in: [types/proxy.ts:2009](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2009)

---

### outputTokens

> **outputTokens**: `number`

Defined in: [types/proxy.ts:2010](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2010)

---

### cacheCreationTokens

> **cacheCreationTokens**: `number`

Defined in: [types/proxy.ts:2011](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2011)

---

### cacheReadTokens

> **cacheReadTokens**: `number`

Defined in: [types/proxy.ts:2012](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2012)

---

### reasoningTokens?

> `optional` **reasoningTokens?**: `number`

Defined in: [types/proxy.ts:2013](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2013)

---

### rateLimitAfter5h?

> `optional` **rateLimitAfter5h?**: `number`

Defined in: [types/proxy.ts:2014](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2014)

---

### rateLimitAfter7d?

> `optional` **rateLimitAfter7d?**: `number`

Defined in: [types/proxy.ts:2015](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2015)
