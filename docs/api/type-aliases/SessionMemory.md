[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / SessionMemory

# Type Alias: SessionMemory

> **SessionMemory** = `object`

Defined in: [types/conversation.ts:150](https://github.com/juspay/neurolink/blob/release/src/lib/types/conversation.ts#L150)

Complete memory for a conversation session
ULTRA-OPTIMIZED: Direct ChatMessage[] storage - zero conversion overhead

## Properties

### sessionId

> **sessionId**: `string`

Defined in: [types/conversation.ts:152](https://github.com/juspay/neurolink/blob/release/src/lib/types/conversation.ts#L152)

Unique session identifier

---

### userId?

> `optional` **userId?**: `string`

Defined in: [types/conversation.ts:155](https://github.com/juspay/neurolink/blob/release/src/lib/types/conversation.ts#L155)

User identifier (optional)

---

### title?

> `optional` **title?**: `string`

Defined in: [types/conversation.ts:158](https://github.com/juspay/neurolink/blob/release/src/lib/types/conversation.ts#L158)

Auto-generated conversation title (created on first user message)

---

### messages

> **messages**: [`ChatMessage`](ChatMessage.md)[]

Defined in: [types/conversation.ts:161](https://github.com/juspay/neurolink/blob/release/src/lib/types/conversation.ts#L161)

Direct message storage - ready for immediate AI consumption

---

### createdAt

> **createdAt**: `number`

Defined in: [types/conversation.ts:168](https://github.com/juspay/neurolink/blob/release/src/lib/types/conversation.ts#L168)

When this session was created.
Format: Unix epoch milliseconds (number).
Example: 1735689600000 for January 1, 2025, 00:00:00 UTC.

---

### lastActivity

> **lastActivity**: `number`

Defined in: [types/conversation.ts:175](https://github.com/juspay/neurolink/blob/release/src/lib/types/conversation.ts#L175)

When this session was last active.
Format: Unix epoch milliseconds (number).
Updated on every message addition or session interaction.

---

### summarizedUpToMessageId?

> `optional` **summarizedUpToMessageId?**: `string`

Defined in: [types/conversation.ts:178](https://github.com/juspay/neurolink/blob/release/src/lib/types/conversation.ts#L178)

Pointer to last summarized message ID (NEW - for token-based memory)

---

### summarizedMessage?

> `optional` **summarizedMessage?**: `string`

Defined in: [types/conversation.ts:181](https://github.com/juspay/neurolink/blob/release/src/lib/types/conversation.ts#L181)

Stored summary message that condenses conversation history up to summarizedUpToMessageId

---

### tokenThreshold?

> `optional` **tokenThreshold?**: `number`

Defined in: [types/conversation.ts:184](https://github.com/juspay/neurolink/blob/release/src/lib/types/conversation.ts#L184)

Per-session token threshold override (NEW - for token-based memory)

---

### lastTokenCount?

> `optional` **lastTokenCount?**: `number`

Defined in: [types/conversation.ts:187](https://github.com/juspay/neurolink/blob/release/src/lib/types/conversation.ts#L187)

Cached token count for performance (NEW - for token-based memory)

---

### lastCountedAt?

> `optional` **lastCountedAt?**: `number`

Defined in: [types/conversation.ts:190](https://github.com/juspay/neurolink/blob/release/src/lib/types/conversation.ts#L190)

When token count was last calculated (NEW - for token-based memory)

---

### lastApiTokenCount?

> `optional` **lastApiTokenCount?**: `object`

Defined in: [types/conversation.ts:193](https://github.com/juspay/neurolink/blob/release/src/lib/types/conversation.ts#L193)

API-reported token count from last request (most accurate)

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

### metadata?

> `optional` **metadata?**: `object`

Defined in: [types/conversation.ts:202](https://github.com/juspay/neurolink/blob/release/src/lib/types/conversation.ts#L202)

Optional session metadata

#### userRole?

> `optional` **userRole?**: `string`

User role or permissions

#### tags?

> `optional` **tags?**: `string`[]

Tags for categorizing this session

#### customData?

> `optional` **customData?**: `Record`\<`string`, `unknown`\>

Custom data specific to the organization
