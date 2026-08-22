[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / ToolResultData

# Type Alias: ToolResultData

> **ToolResultData** = `object`

Defined in: [types/conversation.ts:242](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/conversation.ts#L242)

Structured metadata for tool_result messages.

## Properties

### success?

> `optional` **success?**: `boolean`

Defined in: [types/conversation.ts:244](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/conversation.ts#L244)

Whether the tool execution succeeded

---

### expression?

> `optional` **expression?**: `string`

Defined in: [types/conversation.ts:246](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/conversation.ts#L246)

Expression that was evaluated (for calculation tools)

---

### ~~result?~~

> `optional` **result?**: `unknown`

Defined in: [types/conversation.ts:252](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/conversation.ts#L252)

The tool execution result.

#### Deprecated

Read from ChatMessage.content instead. This field is dynamically
populated from content for backward compatibility and will be removed in a future version.

---

### type?

> `optional` **type?**: `string`

Defined in: [types/conversation.ts:254](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/conversation.ts#L254)

Result type hint

---

### error?

> `optional` **error?**: `string`

Defined in: [types/conversation.ts:256](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/conversation.ts#L256)

Error message if execution failed
