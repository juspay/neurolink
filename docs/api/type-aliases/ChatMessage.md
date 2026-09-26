[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ChatMessage

# Type Alias: ChatMessage

> **ChatMessage** = `object`

Chat message format for conversation history

## Properties

### id

> **id**: `string`

Unique message identifier (required for token-based memory)

---

### role

> **role**: `"user"` \| `"assistant"` \| `"system"` \| `"tool_call"` \| `"tool_result"`

Role/type of the message

---

### content

> **content**: `string`

Content of the message

---

### timestamp?

> `optional` **timestamp?**: `string`

Message timestamp.
Format: ISO 8601 string (e.g., "2025-01-01T12:30:00.000Z").
Optional - may be omitted for system-generated messages.
Use `metadata.timestamp` for numeric Unix ms representation.

---

### tool?

> `optional` **tool?**: `string`

Tool name (optional) - for tool_call/tool_result messages

---

### toolCallId?

> `optional` **toolCallId?**: `string`

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

Tool arguments (optional) - for tool_call messages

---

### result?

> `optional` **result?**: [`ToolResultData`](ToolResultData.md)

Tool result metadata (optional) - for tool_result messages

---

### events?

> `optional` **events?**: [`StreamEventSequence`](StreamEventSequence.md)[]

Event sequence for rich history reconstruction
Stores ordered events (text-chunk, ui-component, tool calls, HITL, etc.)
Enables proper ordering and complete context restoration

#### Since

8.21.0

---

### metadata?

> `optional` **metadata?**: [`ChatMessageMetadata`](ChatMessageMetadata.md)

Message metadata

---

### condenseId?

> `optional` **condenseId?**: `string`

UUID identifying this condensation group

---

### condenseParent?

> `optional` **condenseParent?**: `string`

Points to summary that replaces this message

---

### truncationId?

> `optional` **truncationId?**: `string`

UUID identifying this truncation group

---

### truncationParent?

> `optional` **truncationParent?**: `string`

Points to truncation marker that hides this message

---

### isTruncationMarker?

> `optional` **isTruncationMarker?**: `boolean`

Marks this message as a truncation boundary marker
