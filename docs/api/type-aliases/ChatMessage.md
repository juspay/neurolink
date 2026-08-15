[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / ChatMessage

# Type Alias: ChatMessage

> **ChatMessage** = `object`

Defined in: [types/conversation.ts:333](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/conversation.ts#L333)

Chat message format for conversation history

## Properties

### id

> **id**: `string`

Defined in: [types/conversation.ts:335](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/conversation.ts#L335)

Unique message identifier (required for token-based memory)

---

### role

> **role**: `"user"` \| `"assistant"` \| `"system"` \| `"tool_call"` \| `"tool_result"`

Defined in: [types/conversation.ts:338](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/conversation.ts#L338)

Role/type of the message

---

### content

> **content**: `string`

Defined in: [types/conversation.ts:341](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/conversation.ts#L341)

Content of the message

---

### timestamp?

> `optional` **timestamp?**: `string`

Defined in: [types/conversation.ts:349](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/conversation.ts#L349)

Message timestamp.
Format: ISO 8601 string (e.g., "2025-01-01T12:30:00.000Z").
Optional - may be omitted for system-generated messages.
Use `metadata.timestamp` for numeric Unix ms representation.

---

### tool?

> `optional` **tool?**: `string`

Defined in: [types/conversation.ts:352](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/conversation.ts#L352)

Tool name (optional) - for tool_call/tool_result messages

---

### toolCallId?

> `optional` **toolCallId?**: `string`

Defined in: [types/conversation.ts:364](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/conversation.ts#L364)

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

Defined in: [types/conversation.ts:367](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/conversation.ts#L367)

Tool arguments (optional) - for tool_call messages

---

### result?

> `optional` **result?**: [`ToolResultData`](ToolResultData.md)

Defined in: [types/conversation.ts:370](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/conversation.ts#L370)

Tool result metadata (optional) - for tool_result messages

---

### events?

> `optional` **events?**: [`StreamEventSequence`](StreamEventSequence.md)[]

Defined in: [types/conversation.ts:378](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/conversation.ts#L378)

Event sequence for rich history reconstruction
Stores ordered events (text-chunk, ui-component, tool calls, HITL, etc.)
Enables proper ordering and complete context restoration

#### Since

8.21.0

---

### metadata?

> `optional` **metadata?**: [`ChatMessageMetadata`](ChatMessageMetadata.md)

Defined in: [types/conversation.ts:381](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/conversation.ts#L381)

Message metadata

---

### condenseId?

> `optional` **condenseId?**: `string`

Defined in: [types/conversation.ts:384](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/conversation.ts#L384)

UUID identifying this condensation group

---

### condenseParent?

> `optional` **condenseParent?**: `string`

Defined in: [types/conversation.ts:386](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/conversation.ts#L386)

Points to summary that replaces this message

---

### truncationId?

> `optional` **truncationId?**: `string`

Defined in: [types/conversation.ts:388](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/conversation.ts#L388)

UUID identifying this truncation group

---

### truncationParent?

> `optional` **truncationParent?**: `string`

Defined in: [types/conversation.ts:390](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/conversation.ts#L390)

Points to truncation marker that hides this message

---

### isTruncationMarker?

> `optional` **isTruncationMarker?**: `boolean`

Defined in: [types/conversation.ts:392](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/conversation.ts#L392)

Marks this message as a truncation boundary marker
