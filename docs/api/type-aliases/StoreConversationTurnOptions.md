[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / StoreConversationTurnOptions

# Type Alias: StoreConversationTurnOptions

> **StoreConversationTurnOptions** = `object`

Defined in: [types/conversation.ts:482](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/conversation.ts#L482)

Options for storing a conversation turn

## Properties

### sessionId

> **sessionId**: `string`

Defined in: [types/conversation.ts:483](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/conversation.ts#L483)

---

### userId?

> `optional` **userId?**: `string`

Defined in: [types/conversation.ts:484](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/conversation.ts#L484)

---

### userMessage

> **userMessage**: `string`

Defined in: [types/conversation.ts:485](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/conversation.ts#L485)

---

### aiResponse

> **aiResponse**: `string`

Defined in: [types/conversation.ts:486](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/conversation.ts#L486)

---

### startTimeStamp?

> `optional` **startTimeStamp?**: `Date`

Defined in: [types/conversation.ts:487](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/conversation.ts#L487)

---

### providerDetails?

> `optional` **providerDetails?**: [`ProviderDetails`](ProviderDetails.md)

Defined in: [types/conversation.ts:488](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/conversation.ts#L488)

---

### enableSummarization?

> `optional` **enableSummarization?**: `boolean`

Defined in: [types/conversation.ts:489](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/conversation.ts#L489)

---

### events?

> `optional` **events?**: [`StreamEventSequence`](StreamEventSequence.md)[]

Defined in: [types/conversation.ts:490](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/conversation.ts#L490)

---

### requestId?

> `optional` **requestId?**: `string`

Defined in: [types/conversation.ts:492](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/conversation.ts#L492)

Observability request identifier for log correlation

---

### tokenUsage?

> `optional` **tokenUsage?**: `object`

Defined in: [types/conversation.ts:494](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/conversation.ts#L494)

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

Defined in: [types/conversation.ts:502](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/conversation.ts#L502)

Gemini 3 thought signature for reasoning continuity across turns

---

### skillMessages?

> `optional` **skillMessages?**: [`ChatMessage`](ChatMessage.md)[]

Defined in: [types/conversation.ts:515](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/conversation.ts#L515)

Pinned skill-activation messages (skills v2) recorded during this turn.
Inserted between the user and assistant messages so replayed history
mirrors the actual order: ask → skill loaded → answer. Stored verbatim —
skill instructions are never truncated.

Invariant for history consumers: a skill-bearing turn is a
user → skill(user-role, metadata.isSkill) → assistant triplet, so
stored history is NOT strictly pair-wise alternating. Pair-based
logic must filter `metadata.isSkill` first (see slidingWindowTruncator
for the canonical partition-and-reanchor pattern).
