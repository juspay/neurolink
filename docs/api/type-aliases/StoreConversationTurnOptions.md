[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / StoreConversationTurnOptions

# Type Alias: StoreConversationTurnOptions

> **StoreConversationTurnOptions** = `object`

Options for storing a conversation turn

## Properties

### sessionId

> **sessionId**: `string`

---

### userId?

> `optional` **userId?**: `string`

---

### userMessage

> **userMessage**: `string`

---

### aiResponse

> **aiResponse**: `string`

---

### startTimeStamp?

> `optional` **startTimeStamp?**: `Date`

---

### providerDetails?

> `optional` **providerDetails?**: [`ProviderDetails`](ProviderDetails.md)

---

### enableSummarization?

> `optional` **enableSummarization?**: `boolean`

---

### events?

> `optional` **events?**: [`StreamEventSequence`](StreamEventSequence.md)[]

---

### requestId?

> `optional` **requestId?**: `string`

Observability request identifier for log correlation

---

### tokenUsage?

> `optional` **tokenUsage?**: `object`

API-reported token usage from provider response

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

### thoughtSignature?

> `optional` **thoughtSignature?**: `string`

Gemini 3 thought signature for reasoning continuity across turns

---

### skillMessages?

> `optional` **skillMessages?**: [`ChatMessage`](ChatMessage.md)[]

Pinned skill-activation messages (skills v2) recorded during this turn.
Inserted between the user and assistant messages so replayed history
mirrors the actual order: ask → skill loaded → answer. Stored verbatim —
skill instructions are never truncated.

Invariant for history consumers: a skill-bearing turn is a
user → skill(user-role, metadata.isSkill) → assistant triplet, so
stored history is NOT strictly pair-wise alternating. Pair-based
logic must filter `metadata.isSkill` first (see slidingWindowTruncator
for the canonical partition-and-reanchor pattern).
