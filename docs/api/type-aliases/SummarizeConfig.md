[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / SummarizeConfig

# Type Alias: SummarizeConfig

> **SummarizeConfig** = `object`

Defined in: [types/context.ts:1011](https://github.com/juspay/neurolink/blob/release/src/lib/types/context.ts#L1011)

Configuration for structured LLM summarization (Stage 3).

## Properties

### provider?

> `optional` **provider?**: `string`

Defined in: [types/context.ts:1012](https://github.com/juspay/neurolink/blob/release/src/lib/types/context.ts#L1012)

---

### model?

> `optional` **model?**: `string`

Defined in: [types/context.ts:1013](https://github.com/juspay/neurolink/blob/release/src/lib/types/context.ts#L1013)

---

### keepRecentRatio?

> `optional` **keepRecentRatio?**: `number`

Defined in: [types/context.ts:1014](https://github.com/juspay/neurolink/blob/release/src/lib/types/context.ts#L1014)

---

### memoryConfig?

> `optional` **memoryConfig?**: `Partial`\<[`ConversationMemoryConfig`](ConversationMemoryConfig.md)\>

Defined in: [types/context.ts:1015](https://github.com/juspay/neurolink/blob/release/src/lib/types/context.ts#L1015)

---

### targetTokens?

> `optional` **targetTokens?**: `number`

Defined in: [types/context.ts:1017](https://github.com/juspay/neurolink/blob/release/src/lib/types/context.ts#L1017)

Target token budget — when set, split uses token counting instead of message count
