[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / OpenAICompatChatMessage

# Type Alias: OpenAICompatChatMessage

> **OpenAICompatChatMessage** = \{ `role`: `"system"`; `content`: `string` \| [`OpenAICompatMessageContent`](OpenAICompatMessageContent.md)[]; \} \| \{ `role`: `"user"`; `content`: `string` \| [`OpenAICompatMessageContent`](OpenAICompatMessageContent.md)[]; \} \| \{ `role`: `"assistant"`; `content?`: `string` \| [`OpenAICompatMessageContent`](OpenAICompatMessageContent.md)[] \| `null`; `tool_calls?`: [`OpenAICompatToolCallWire`](OpenAICompatToolCallWire.md)[]; \} \| \{ `role`: `"tool"`; `content`: `string`; `tool_call_id`: `string`; \}

Defined in: [types/openaiCompatible.ts:39](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/openaiCompatible.ts#L39)
