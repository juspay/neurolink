[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / DeferredUsage

# Type Alias: DeferredUsage

> **DeferredUsage** = `object`

Defined in: [types/common.ts:390](https://github.com/juspay/neurolink/blob/release/src/lib/types/common.ts#L390)

Aggregated usage resolved by a provider's deferred-analytics pair after a
multi-step stream loop ends. The cache fields are optional — only providers
with prompt caching (Anthropic) populate them.

## Properties

### promptTokens

> **promptTokens**: `number`

Defined in: [types/common.ts:391](https://github.com/juspay/neurolink/blob/release/src/lib/types/common.ts#L391)

---

### completionTokens

> **completionTokens**: `number`

Defined in: [types/common.ts:392](https://github.com/juspay/neurolink/blob/release/src/lib/types/common.ts#L392)

---

### totalTokens

> **totalTokens**: `number`

Defined in: [types/common.ts:393](https://github.com/juspay/neurolink/blob/release/src/lib/types/common.ts#L393)

---

### cacheReadTokens?

> `optional` **cacheReadTokens?**: `number`

Defined in: [types/common.ts:394](https://github.com/juspay/neurolink/blob/release/src/lib/types/common.ts#L394)

---

### cacheCreationTokens?

> `optional` **cacheCreationTokens?**: `number`

Defined in: [types/common.ts:395](https://github.com/juspay/neurolink/blob/release/src/lib/types/common.ts#L395)

---

### reasoningTokens?

> `optional` **reasoningTokens?**: `number`

Defined in: [types/common.ts:397](https://github.com/juspay/neurolink/blob/release/src/lib/types/common.ts#L397)

Reasoning/thinking tokens — a SUBSET already included in completionTokens.
