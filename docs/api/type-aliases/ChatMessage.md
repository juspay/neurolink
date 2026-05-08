[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / ChatMessage

# Type Alias: ChatMessage

> **ChatMessage** = `object`

Defined in: [types/conversation.ts:289](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/conversation.ts#L289)

Chat message format for conversation history

## Properties

### id

> **id**: `string`

Defined in: [types/conversation.ts:291](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/conversation.ts#L291)

Unique message identifier (required for token-based memory)

---

### role

> **role**: `"user"` \| `"assistant"` \| `"system"` \| `"tool_call"` \| `"tool_result"`

Defined in: [types/conversation.ts:294](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/conversation.ts#L294)

Role/type of the message

---

### content

> **content**: `string`

Defined in: [types/conversation.ts:297](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/conversation.ts#L297)

Content of the message

---

### timestamp?

> `optional` **timestamp?**: `string`

Defined in: [types/conversation.ts:305](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/conversation.ts#L305)

Message timestamp.
Format: ISO 8601 string (e.g., "2025-01-01T12:30:00.000Z").
Optional - may be omitted for system-generated messages.
Use `metadata.timestamp` for numeric Unix ms representation.

---

### tool?

> `optional` **tool?**: `string`

Defined in: [types/conversation.ts:308](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/conversation.ts#L308)

Tool name (optional) - for tool_call/tool_result messages

---

### args?

> `optional` **args?**: `Record`\<`string`, `unknown`\>

Defined in: [types/conversation.ts:311](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/conversation.ts#L311)

Tool arguments (optional) - for tool_call messages

---

### result?

> `optional` **result?**: [`ToolResultData`](ToolResultData.md)

Defined in: [types/conversation.ts:314](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/conversation.ts#L314)

Tool result metadata (optional) - for tool_result messages

---

### events?

> `optional` **events?**: [`StreamEventSequence`](StreamEventSequence.md)[]

Defined in: [types/conversation.ts:322](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/conversation.ts#L322)

Event sequence for rich history reconstruction
Stores ordered events (text-chunk, ui-component, tool calls, HITL, etc.)
Enables proper ordering and complete context restoration

#### Since

8.21.0

---

### metadata?

> `optional` **metadata?**: [`ChatMessageMetadata`](ChatMessageMetadata.md)

Defined in: [types/conversation.ts:325](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/conversation.ts#L325)

Message metadata

---

### condenseId?

> `optional` **condenseId?**: `string`

Defined in: [types/conversation.ts:328](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/conversation.ts#L328)

UUID identifying this condensation group

---

### condenseParent?

> `optional` **condenseParent?**: `string`

Defined in: [types/conversation.ts:330](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/conversation.ts#L330)

Points to summary that replaces this message

---

### truncationId?

> `optional` **truncationId?**: `string`

Defined in: [types/conversation.ts:332](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/conversation.ts#L332)

UUID identifying this truncation group

---

### truncationParent?

> `optional` **truncationParent?**: `string`

Defined in: [types/conversation.ts:334](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/conversation.ts#L334)

Points to truncation marker that hides this message

---

### isTruncationMarker?

> `optional` **isTruncationMarker?**: `boolean`

Defined in: [types/conversation.ts:336](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/conversation.ts#L336)

Marks this message as a truncation boundary marker
