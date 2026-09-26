[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ConversationBase

# Type Alias: ConversationBase

> **ConversationBase** = `object`

Base conversation metadata (shared fields across all conversation types)
Contains essential conversation information without heavy data arrays

## Properties

### id

> **id**: `string`

Unique conversation identifier (UUID v4)

---

### title

> **title**: `string`

Auto-generated conversation title

---

### sessionId

> **sessionId**: `string`

Session identifier

---

### userId

> **userId**: `string`

User identifier

---

### createdAt

> **createdAt**: `string`

When this conversation was first created

---

### updatedAt

> **updatedAt**: `string`

When this conversation was last updated

---

### summarizedUpToMessageId?

> `optional` **summarizedUpToMessageId?**: `string`

Pointer to last summarized message (token-based memory)

---

### summarizedMessage?

> `optional` **summarizedMessage?**: `string`

Stored summary message that condenses conversation history up to summarizedUpToMessageId

---

### tokenThreshold?

> `optional` **tokenThreshold?**: `number`

Per-session token threshold override

---

### lastTokenCount?

> `optional` **lastTokenCount?**: `number`

Cached token count for efficiency

---

### lastCountedAt?

> `optional` **lastCountedAt?**: `number`

Timestamp of last token count

---

### lastApiTokenCount?

> `optional` **lastApiTokenCount?**: `object`

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

Additional metadata for extensible conversation-level data

#### Index Signature

\[`key`: `string`\]: `unknown`

Allow future extensibility

#### agenticLoopReports?

> `optional` **agenticLoopReports?**: [`AgenticLoopReportMetadata`](AgenticLoopReportMetadata.md)[]

Agentic loop reports associated with this conversation
