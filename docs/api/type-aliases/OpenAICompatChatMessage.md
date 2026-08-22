[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / OpenAICompatChatMessage

# Type Alias: OpenAICompatChatMessage

> **OpenAICompatChatMessage** = \{ `role`: `"system"`; `content`: `string` \| [`OpenAICompatMessageContent`](OpenAICompatMessageContent.md)[]; \} \| \{ `role`: `"user"`; `content`: `string` \| [`OpenAICompatMessageContent`](OpenAICompatMessageContent.md)[]; \} \| \{ `role`: `"assistant"`; `content?`: `string` \| [`OpenAICompatMessageContent`](OpenAICompatMessageContent.md)[] \| `null`; `tool_calls?`: [`OpenAICompatToolCallWire`](OpenAICompatToolCallWire.md)[]; \} \| \{ `role`: `"tool"`; `content`: `string`; `tool_call_id`: `string`; \}

Defined in: [types/openaiCompatible.ts:39](https://github.com/juspay/neurolink/blob/release/src/lib/types/openaiCompatible.ts#L39)
