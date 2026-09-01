[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ChatMessage

# Type Alias: ChatMessage

> **ChatMessage** = `object`

Defined in: [types/conversation.ts:341](https://github.com/juspay/neurolink/blob/release/src/lib/types/conversation.ts#L341)

Chat message format for conversation history

## Properties

### id

> **id**: `string`

Defined in: [types/conversation.ts:343](https://github.com/juspay/neurolink/blob/release/src/lib/types/conversation.ts#L343)

Unique message identifier (required for token-based memory)

---

### role

> **role**: `"user"` \| `"assistant"` \| `"system"` \| `"tool_call"` \| `"tool_result"`

Defined in: [types/conversation.ts:346](https://github.com/juspay/neurolink/blob/release/src/lib/types/conversation.ts#L346)

Role/type of the message

---

### content

> **content**: `string`

Defined in: [types/conversation.ts:349](https://github.com/juspay/neurolink/blob/release/src/lib/types/conversation.ts#L349)

Content of the message

---

### timestamp?

> `optional` **timestamp?**: `string`

Defined in: [types/conversation.ts:357](https://github.com/juspay/neurolink/blob/release/src/lib/types/conversation.ts#L357)

Message timestamp.
Format: ISO 8601 string (e.g., "2025-01-01T12:30:00.000Z").
Optional - may be omitted for system-generated messages.
Use `metadata.timestamp` for numeric Unix ms representation.

---

### tool?

> `optional` **tool?**: `string`

Defined in: [types/conversation.ts:360](https://github.com/juspay/neurolink/blob/release/src/lib/types/conversation.ts#L360)

Tool name (optional) - for tool_call/tool_result messages

---

### toolCallId?

> `optional` **toolCallId?**: `string`

Defined in: [types/conversation.ts:372](https://github.com/juspay/neurolink/blob/release/src/lib/types/conversation.ts#L372)

Provider tool-call correlation ID, carried on BOTH the `tool_call` and its
matching `tool_result`. This is the only reliable way to pair the two:
a step with parallel tool calls is persisted as every `tool_call` followed
by every `tool_result` (see flushPendingToolData), so adjacency does
NOT imply pairing and position-based matching corrupts the batch.

Optional for backward compatibility — sessions written before this field
existed pair positionally within a batch (see repairToolPairs legacy mode).

---

### args?

> `optional` **args?**: `Record`\<`string`, `unknown`\>

Defined in: [types/conversation.ts:375](https://github.com/juspay/neurolink/blob/release/src/lib/types/conversation.ts#L375)

Tool arguments (optional) - for tool_call messages

---

### result?

> `optional` **result?**: [`ToolResultData`](ToolResultData.md)

Defined in: [types/conversation.ts:378](https://github.com/juspay/neurolink/blob/release/src/lib/types/conversation.ts#L378)

Tool result metadata (optional) - for tool_result messages

---

### events?

> `optional` **events?**: [`StreamEventSequence`](StreamEventSequence.md)[]

Defined in: [types/conversation.ts:386](https://github.com/juspay/neurolink/blob/release/src/lib/types/conversation.ts#L386)

Event sequence for rich history reconstruction
Stores ordered events (text-chunk, ui-component, tool calls, HITL, etc.)
Enables proper ordering and complete context restoration

#### Since

8.21.0

---

### metadata?

> `optional` **metadata?**: [`ChatMessageMetadata`](ChatMessageMetadata.md)

Defined in: [types/conversation.ts:389](https://github.com/juspay/neurolink/blob/release/src/lib/types/conversation.ts#L389)

Message metadata

---

### condenseId?

> `optional` **condenseId?**: `string`

Defined in: [types/conversation.ts:392](https://github.com/juspay/neurolink/blob/release/src/lib/types/conversation.ts#L392)

UUID identifying this condensation group

---

### condenseParent?

> `optional` **condenseParent?**: `string`

Defined in: [types/conversation.ts:394](https://github.com/juspay/neurolink/blob/release/src/lib/types/conversation.ts#L394)

Points to summary that replaces this message

---

### truncationId?

> `optional` **truncationId?**: `string`

Defined in: [types/conversation.ts:396](https://github.com/juspay/neurolink/blob/release/src/lib/types/conversation.ts#L396)

UUID identifying this truncation group

---

### truncationParent?

> `optional` **truncationParent?**: `string`

Defined in: [types/conversation.ts:398](https://github.com/juspay/neurolink/blob/release/src/lib/types/conversation.ts#L398)

Points to truncation marker that hides this message

---

### isTruncationMarker?

> `optional` **isTruncationMarker?**: `boolean`

Defined in: [types/conversation.ts:400](https://github.com/juspay/neurolink/blob/release/src/lib/types/conversation.ts#L400)

Marks this message as a truncation boundary marker
