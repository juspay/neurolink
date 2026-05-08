[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / ConversationBase

# Type Alias: ConversationBase

> **ConversationBase** = `object`

Defined in: [types/conversation.ts:505](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/conversation.ts#L505)

Base conversation metadata (shared fields across all conversation types)
Contains essential conversation information without heavy data arrays

## Properties

### id

> **id**: `string`

Defined in: [types/conversation.ts:507](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/conversation.ts#L507)

Unique conversation identifier (UUID v4)

---

### title

> **title**: `string`

Defined in: [types/conversation.ts:510](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/conversation.ts#L510)

Auto-generated conversation title

---

### sessionId

> **sessionId**: `string`

Defined in: [types/conversation.ts:513](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/conversation.ts#L513)

Session identifier

---

### userId

> **userId**: `string`

Defined in: [types/conversation.ts:516](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/conversation.ts#L516)

User identifier

---

### createdAt

> **createdAt**: `string`

Defined in: [types/conversation.ts:519](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/conversation.ts#L519)

When this conversation was first created

---

### updatedAt

> **updatedAt**: `string`

Defined in: [types/conversation.ts:522](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/conversation.ts#L522)

When this conversation was last updated

---

### summarizedUpToMessageId?

> `optional` **summarizedUpToMessageId?**: `string`

Defined in: [types/conversation.ts:525](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/conversation.ts#L525)

Pointer to last summarized message (token-based memory)

---

### summarizedMessage?

> `optional` **summarizedMessage?**: `string`

Defined in: [types/conversation.ts:528](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/conversation.ts#L528)

Stored summary message that condenses conversation history up to summarizedUpToMessageId

---

### tokenThreshold?

> `optional` **tokenThreshold?**: `number`

Defined in: [types/conversation.ts:531](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/conversation.ts#L531)

Per-session token threshold override

---

### lastTokenCount?

> `optional` **lastTokenCount?**: `number`

Defined in: [types/conversation.ts:534](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/conversation.ts#L534)

Cached token count for efficiency

---

### lastCountedAt?

> `optional` **lastCountedAt?**: `number`

Defined in: [types/conversation.ts:537](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/conversation.ts#L537)

Timestamp of last token count

---

### lastApiTokenCount?

> `optional` **lastApiTokenCount?**: `object`

Defined in: [types/conversation.ts:540](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/conversation.ts#L540)

API-reported token count from last request

#### inputTokens?

> `optional` **inputTokens?**: `number`

#### outputTokens?

> `optional` **outputTokens?**: `number`

#### totalTokens?

> `optional` **totalTokens?**: `number`

#### cacheReadTokens?

> `optional` **cacheReadTokens?**: `number`

#### cacheWriteTokens?

> `optional` **cacheWriteTokens?**: `number`

---

### additionalMetadata?

> `optional` **additionalMetadata?**: `object`

Defined in: [types/conversation.ts:549](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/conversation.ts#L549)

Additional metadata for extensible conversation-level data

#### Index Signature

\[`key`: `string`\]: `unknown`

Allow future extensibility

#### agenticLoopReports?

> `optional` **agenticLoopReports?**: [`AgenticLoopReportMetadata`](AgenticLoopReportMetadata.md)[]

Agentic loop reports associated with this conversation
