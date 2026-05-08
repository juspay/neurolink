[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / ToolResultData

# Type Alias: ToolResultData

> **ToolResultData** = `object`

Defined in: [types/conversation.ts:215](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/conversation.ts#L215)

Structured metadata for tool_result messages.

## Properties

### success?

> `optional` **success?**: `boolean`

Defined in: [types/conversation.ts:217](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/conversation.ts#L217)

Whether the tool execution succeeded

---

### expression?

> `optional` **expression?**: `string`

Defined in: [types/conversation.ts:219](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/conversation.ts#L219)

Expression that was evaluated (for calculation tools)

---

### ~~result?~~

> `optional` **result?**: `unknown`

Defined in: [types/conversation.ts:225](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/conversation.ts#L225)

The tool execution result.

#### Deprecated

Read from ChatMessage.content instead. This field is dynamically
populated from content for backward compatibility and will be removed in a future version.

---

### type?

> `optional` **type?**: `string`

Defined in: [types/conversation.ts:227](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/conversation.ts#L227)

Result type hint

---

### error?

> `optional` **error?**: `string`

Defined in: [types/conversation.ts:229](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/conversation.ts#L229)

Error message if execution failed
