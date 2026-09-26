[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / SessionMemory

# Type Alias: SessionMemory

> **SessionMemory** = `object`

Complete memory for a conversation session
ULTRA-OPTIMIZED: Direct ChatMessage[] storage - zero conversion overhead

## Properties

### sessionId

> **sessionId**: `string`

Unique session identifier

---

### userId?

> `optional` **userId?**: `string`

User identifier (optional)

---

### title?

> `optional` **title?**: `string`

Auto-generated conversation title (created on first user message)

---

### messages

> **messages**: [`ChatMessage`](ChatMessage.md)[]

Direct message storage - ready for immediate AI consumption

---

### createdAt

> **createdAt**: `number`

When this session was created.
Format: Unix epoch milliseconds (number).
Example: 1735689600000 for January 1, 2025, 00:00:00 UTC.

---

### lastActivity

> **lastActivity**: `number`

When this session was last active.
Format: Unix epoch milliseconds (number).
Updated on every message addition or session interaction.

---

### summarizedUpToMessageId?

> `optional` **summarizedUpToMessageId?**: `string`

Pointer to last summarized message ID (NEW - for token-based memory)

---

### summarizedMessage?

> `optional` **summarizedMessage?**: `string`

Stored summary message that condenses conversation history up to summarizedUpToMessageId

---

### tokenThreshold?

> `optional` **tokenThreshold?**: `number`

Per-session token threshold override (NEW - for token-based memory)

---

### lastTokenCount?

> `optional` **lastTokenCount?**: `number`

Cached token count for performance (NEW - for token-based memory)

---

### lastCountedAt?

> `optional` **lastCountedAt?**: `number`

When token count was last calculated (NEW - for token-based memory)

---

### lastApiTokenCount?

> `optional` **lastApiTokenCount?**: `object`

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
