[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / RedisConversationObject

# Type Alias: RedisConversationObject

> **RedisConversationObject** = [`ConversationBase`](ConversationBase.md) & `object`

Defined in: [types/conversation.ts:670](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/conversation.ts#L670)

Redis conversation storage object format
Contains conversation metadata and full message history

## Type Declaration

### messages

> **messages**: [`ChatMessage`](ChatMessage.md)[]

Array of conversation messages
