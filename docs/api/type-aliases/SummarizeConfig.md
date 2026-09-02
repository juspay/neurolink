[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / SummarizeConfig

# Type Alias: SummarizeConfig

> **SummarizeConfig** = `object`

Defined in: [types/context.ts:1034](https://github.com/juspay/neurolink/blob/release/src/lib/types/context.ts#L1034)

Configuration for structured LLM summarization (Stage 3).

## Properties

### provider?

> `optional` **provider?**: `string`

Defined in: [types/context.ts:1035](https://github.com/juspay/neurolink/blob/release/src/lib/types/context.ts#L1035)

---

### model?

> `optional` **model?**: `string`

Defined in: [types/context.ts:1036](https://github.com/juspay/neurolink/blob/release/src/lib/types/context.ts#L1036)

---

### keepRecentRatio?

> `optional` **keepRecentRatio?**: `number`

Defined in: [types/context.ts:1037](https://github.com/juspay/neurolink/blob/release/src/lib/types/context.ts#L1037)

---

### memoryConfig?

> `optional` **memoryConfig?**: `Partial`\<[`ConversationMemoryConfig`](ConversationMemoryConfig.md)\>

Defined in: [types/context.ts:1038](https://github.com/juspay/neurolink/blob/release/src/lib/types/context.ts#L1038)

---

### targetTokens?

> `optional` **targetTokens?**: `number`

Defined in: [types/context.ts:1040](https://github.com/juspay/neurolink/blob/release/src/lib/types/context.ts#L1040)

Target token budget — when set, split uses token counting instead of message count
