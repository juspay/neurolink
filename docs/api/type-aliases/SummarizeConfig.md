[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / SummarizeConfig

# Type Alias: SummarizeConfig

> **SummarizeConfig** = `object`

Defined in: [types/context.ts:1025](https://github.com/juspay/neurolink/blob/release/src/lib/types/context.ts#L1025)

Configuration for structured LLM summarization (Stage 3).

## Properties

### provider?

> `optional` **provider?**: `string`

Defined in: [types/context.ts:1026](https://github.com/juspay/neurolink/blob/release/src/lib/types/context.ts#L1026)

---

### model?

> `optional` **model?**: `string`

Defined in: [types/context.ts:1027](https://github.com/juspay/neurolink/blob/release/src/lib/types/context.ts#L1027)

---

### keepRecentRatio?

> `optional` **keepRecentRatio?**: `number`

Defined in: [types/context.ts:1028](https://github.com/juspay/neurolink/blob/release/src/lib/types/context.ts#L1028)

---

### memoryConfig?

> `optional` **memoryConfig?**: `Partial`\<[`ConversationMemoryConfig`](ConversationMemoryConfig.md)\>

Defined in: [types/context.ts:1029](https://github.com/juspay/neurolink/blob/release/src/lib/types/context.ts#L1029)

---

### targetTokens?

> `optional` **targetTokens?**: `number`

Defined in: [types/context.ts:1031](https://github.com/juspay/neurolink/blob/release/src/lib/types/context.ts#L1031)

Target token budget — when set, split uses token counting instead of message count
