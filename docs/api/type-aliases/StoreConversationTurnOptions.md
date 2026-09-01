[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / StoreConversationTurnOptions

# Type Alias: StoreConversationTurnOptions

> **StoreConversationTurnOptions** = `object`

Defined in: [types/conversation.ts:490](https://github.com/juspay/neurolink/blob/release/src/lib/types/conversation.ts#L490)

Options for storing a conversation turn

## Properties

### sessionId

> **sessionId**: `string`

Defined in: [types/conversation.ts:491](https://github.com/juspay/neurolink/blob/release/src/lib/types/conversation.ts#L491)

---

### userId?

> `optional` **userId?**: `string`

Defined in: [types/conversation.ts:492](https://github.com/juspay/neurolink/blob/release/src/lib/types/conversation.ts#L492)

---

### userMessage

> **userMessage**: `string`

Defined in: [types/conversation.ts:493](https://github.com/juspay/neurolink/blob/release/src/lib/types/conversation.ts#L493)

---

### aiResponse

> **aiResponse**: `string`

Defined in: [types/conversation.ts:494](https://github.com/juspay/neurolink/blob/release/src/lib/types/conversation.ts#L494)

---

### startTimeStamp?

> `optional` **startTimeStamp?**: `Date`

Defined in: [types/conversation.ts:495](https://github.com/juspay/neurolink/blob/release/src/lib/types/conversation.ts#L495)

---

### providerDetails?

> `optional` **providerDetails?**: [`ProviderDetails`](ProviderDetails.md)

Defined in: [types/conversation.ts:496](https://github.com/juspay/neurolink/blob/release/src/lib/types/conversation.ts#L496)

---

### enableSummarization?

> `optional` **enableSummarization?**: `boolean`

Defined in: [types/conversation.ts:497](https://github.com/juspay/neurolink/blob/release/src/lib/types/conversation.ts#L497)

---

### events?

> `optional` **events?**: [`StreamEventSequence`](StreamEventSequence.md)[]

Defined in: [types/conversation.ts:498](https://github.com/juspay/neurolink/blob/release/src/lib/types/conversation.ts#L498)

---

### requestId?

> `optional` **requestId?**: `string`

Defined in: [types/conversation.ts:500](https://github.com/juspay/neurolink/blob/release/src/lib/types/conversation.ts#L500)

Observability request identifier for log correlation

---

### tokenUsage?

> `optional` **tokenUsage?**: `object`

Defined in: [types/conversation.ts:502](https://github.com/juspay/neurolink/blob/release/src/lib/types/conversation.ts#L502)

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

Defined in: [types/conversation.ts:510](https://github.com/juspay/neurolink/blob/release/src/lib/types/conversation.ts#L510)

Gemini 3 thought signature for reasoning continuity across turns

---

### skillMessages?

> `optional` **skillMessages?**: [`ChatMessage`](ChatMessage.md)[]

Defined in: [types/conversation.ts:523](https://github.com/juspay/neurolink/blob/release/src/lib/types/conversation.ts#L523)

Pinned skill-activation messages (skills v2) recorded during this turn.
Inserted between the user and assistant messages so replayed history
mirrors the actual order: ask → skill loaded → answer. Stored verbatim —
skill instructions are never truncated.

Invariant for history consumers: a skill-bearing turn is a
user → skill(user-role, metadata.isSkill) → assistant triplet, so
stored history is NOT strictly pair-wise alternating. Pair-based
logic must filter `metadata.isSkill` first (see slidingWindowTruncator
for the canonical partition-and-reanchor pattern).
