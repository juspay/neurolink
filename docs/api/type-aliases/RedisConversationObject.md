[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / RedisConversationObject

# Type Alias: RedisConversationObject

> **RedisConversationObject** = [`ConversationBase`](ConversationBase.md) & `object`

Defined in: [types/conversation.ts:670](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/conversation.ts#L670)

Redis conversation storage object format
Contains conversation metadata and full message history

## Type Declaration

### messages

> **messages**: [`ChatMessage`](ChatMessage.md)[]

Array of conversation messages
