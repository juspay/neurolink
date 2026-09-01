[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ConversationBase

# Type Alias: ConversationBase

> **ConversationBase** = `object`

Defined in: [types/conversation.ts:622](https://github.com/juspay/neurolink/blob/release/src/lib/types/conversation.ts#L622)

Base conversation metadata (shared fields across all conversation types)
Contains essential conversation information without heavy data arrays

## Properties

### id

> **id**: `string`

Defined in: [types/conversation.ts:624](https://github.com/juspay/neurolink/blob/release/src/lib/types/conversation.ts#L624)

Unique conversation identifier (UUID v4)

---

### title

> **title**: `string`

Defined in: [types/conversation.ts:627](https://github.com/juspay/neurolink/blob/release/src/lib/types/conversation.ts#L627)

Auto-generated conversation title

---

### sessionId

> **sessionId**: `string`

Defined in: [types/conversation.ts:630](https://github.com/juspay/neurolink/blob/release/src/lib/types/conversation.ts#L630)

Session identifier

---

### userId

> **userId**: `string`

Defined in: [types/conversation.ts:633](https://github.com/juspay/neurolink/blob/release/src/lib/types/conversation.ts#L633)

User identifier

---

### createdAt

> **createdAt**: `string`

Defined in: [types/conversation.ts:636](https://github.com/juspay/neurolink/blob/release/src/lib/types/conversation.ts#L636)

When this conversation was first created

---

### updatedAt

> **updatedAt**: `string`

Defined in: [types/conversation.ts:639](https://github.com/juspay/neurolink/blob/release/src/lib/types/conversation.ts#L639)

When this conversation was last updated

---

### summarizedUpToMessageId?

> `optional` **summarizedUpToMessageId?**: `string`

Defined in: [types/conversation.ts:642](https://github.com/juspay/neurolink/blob/release/src/lib/types/conversation.ts#L642)

Pointer to last summarized message (token-based memory)

---

### summarizedMessage?

> `optional` **summarizedMessage?**: `string`

Defined in: [types/conversation.ts:645](https://github.com/juspay/neurolink/blob/release/src/lib/types/conversation.ts#L645)

Stored summary message that condenses conversation history up to summarizedUpToMessageId

---

### tokenThreshold?

> `optional` **tokenThreshold?**: `number`

Defined in: [types/conversation.ts:648](https://github.com/juspay/neurolink/blob/release/src/lib/types/conversation.ts#L648)

Per-session token threshold override

---

### lastTokenCount?

> `optional` **lastTokenCount?**: `number`

Defined in: [types/conversation.ts:651](https://github.com/juspay/neurolink/blob/release/src/lib/types/conversation.ts#L651)

Cached token count for efficiency

---

### lastCountedAt?

> `optional` **lastCountedAt?**: `number`

Defined in: [types/conversation.ts:654](https://github.com/juspay/neurolink/blob/release/src/lib/types/conversation.ts#L654)

Timestamp of last token count

---

### lastApiTokenCount?

> `optional` **lastApiTokenCount?**: `object`

Defined in: [types/conversation.ts:657](https://github.com/juspay/neurolink/blob/release/src/lib/types/conversation.ts#L657)

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

Defined in: [types/conversation.ts:666](https://github.com/juspay/neurolink/blob/release/src/lib/types/conversation.ts#L666)

Additional metadata for extensible conversation-level data

#### Index Signature

\[`key`: `string`\]: `unknown`

Allow future extensibility

#### agenticLoopReports?

> `optional` **agenticLoopReports?**: [`AgenticLoopReportMetadata`](AgenticLoopReportMetadata.md)[]

Agentic loop reports associated with this conversation
