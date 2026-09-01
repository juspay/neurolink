[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ToolResultData

# Type Alias: ToolResultData

> **ToolResultData** = `object`

Defined in: [types/conversation.ts:250](https://github.com/juspay/neurolink/blob/release/src/lib/types/conversation.ts#L250)

Structured metadata for tool_result messages.

## Properties

### success?

> `optional` **success?**: `boolean`

Defined in: [types/conversation.ts:252](https://github.com/juspay/neurolink/blob/release/src/lib/types/conversation.ts#L252)

Whether the tool execution succeeded

---

### expression?

> `optional` **expression?**: `string`

Defined in: [types/conversation.ts:254](https://github.com/juspay/neurolink/blob/release/src/lib/types/conversation.ts#L254)

Expression that was evaluated (for calculation tools)

---

### ~~result?~~

> `optional` **result?**: `unknown`

Defined in: [types/conversation.ts:260](https://github.com/juspay/neurolink/blob/release/src/lib/types/conversation.ts#L260)

The tool execution result.

#### Deprecated

Read from ChatMessage.content instead. This field is dynamically
populated from content for backward compatibility and will be removed in a future version.

---

### type?

> `optional` **type?**: `string`

Defined in: [types/conversation.ts:262](https://github.com/juspay/neurolink/blob/release/src/lib/types/conversation.ts#L262)

Result type hint

---

### error?

> `optional` **error?**: `string`

Defined in: [types/conversation.ts:264](https://github.com/juspay/neurolink/blob/release/src/lib/types/conversation.ts#L264)

Error message if execution failed
