[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / OpenAICompatChatMessage

# Type Alias: OpenAICompatChatMessage

> **OpenAICompatChatMessage** = \{ `role`: `"system"`; `content`: `string` \| [`OpenAICompatMessageContent`](OpenAICompatMessageContent.md)[]; \} \| \{ `role`: `"user"`; `content`: `string` \| [`OpenAICompatMessageContent`](OpenAICompatMessageContent.md)[]; \} \| \{ `role`: `"assistant"`; `content?`: `string` \| [`OpenAICompatMessageContent`](OpenAICompatMessageContent.md)[] \| `null`; `tool_calls?`: [`OpenAICompatToolCallWire`](OpenAICompatToolCallWire.md)[]; `reasoning_content?`: `string`; \} \| \{ `role`: `"tool"`; `content`: `string`; `tool_call_id`: `string`; \}

Defined in: [types/openaiCompatible.ts:39](https://github.com/juspay/neurolink/blob/release/src/lib/types/openaiCompatible.ts#L39)

## Union Members

### Type Literal

\{ `role`: `"system"`; `content`: `string` \| [`OpenAICompatMessageContent`](OpenAICompatMessageContent.md)[]; \}

---

### Type Literal

\{ `role`: `"user"`; `content`: `string` \| [`OpenAICompatMessageContent`](OpenAICompatMessageContent.md)[]; \}

---

### Type Literal

\{ `role`: `"assistant"`; `content?`: `string` \| [`OpenAICompatMessageContent`](OpenAICompatMessageContent.md)[] \| `null`; `tool_calls?`: [`OpenAICompatToolCallWire`](OpenAICompatToolCallWire.md)[]; `reasoning_content?`: `string`; \}

#### role

> **role**: `"assistant"`

#### content?

> `optional` **content?**: `string` \| [`OpenAICompatMessageContent`](OpenAICompatMessageContent.md)[] \| `null`

#### tool_calls?

> `optional` **tool_calls?**: [`OpenAICompatToolCallWire`](OpenAICompatToolCallWire.md)[]

#### reasoning_content?

> `optional` **reasoning_content?**: `string`

The turn's reasoning, sent back only where the catalog opts in
(DeepSeek's replayReasoningContent quirk).

---

### Type Literal

\{ `role`: `"tool"`; `content`: `string`; `tool_call_id`: `string`; \}
