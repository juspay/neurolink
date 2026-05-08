[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / SummarizeConfig

# Type Alias: SummarizeConfig

> **SummarizeConfig** = `object`

Defined in: [types/context.ts:901](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/context.ts#L901)

Configuration for structured LLM summarization (Stage 3).

## Properties

### provider?

> `optional` **provider?**: `string`

Defined in: [types/context.ts:902](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/context.ts#L902)

---

### model?

> `optional` **model?**: `string`

Defined in: [types/context.ts:903](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/context.ts#L903)

---

### keepRecentRatio?

> `optional` **keepRecentRatio?**: `number`

Defined in: [types/context.ts:904](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/context.ts#L904)

---

### memoryConfig?

> `optional` **memoryConfig?**: `Partial`\<[`ConversationMemoryConfig`](ConversationMemoryConfig.md)\>

Defined in: [types/context.ts:905](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/context.ts#L905)

---

### targetTokens?

> `optional` **targetTokens?**: `number`

Defined in: [types/context.ts:907](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/context.ts#L907)

Target token budget — when set, split uses token counting instead of message count
