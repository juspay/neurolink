[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / SummarizeConfig

# Type Alias: SummarizeConfig

> **SummarizeConfig** = `object`

Configuration for structured LLM summarization (Stage 3).

## Properties

### provider?

> `optional` **provider?**: `string`

---

### model?

> `optional` **model?**: `string`

---

### keepRecentRatio?

> `optional` **keepRecentRatio?**: `number`

---

### memoryConfig?

> `optional` **memoryConfig?**: `Partial`\<[`ConversationMemoryConfig`](ConversationMemoryConfig.md)\>

---

### targetTokens?

> `optional` **targetTokens?**: `number`

Target token budget — when set, split uses token counting instead of message count
