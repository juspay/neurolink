[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / RedisConversationObject

# Type Alias: RedisConversationObject

> **RedisConversationObject** = [`ConversationBase`](ConversationBase.md) & `object`

Defined in: [types/conversation.ts:561](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/conversation.ts#L561)

Redis conversation storage object format
Contains conversation metadata and full message history

## Type Declaration

### messages

> **messages**: [`ChatMessage`](ChatMessage.md)[]

Array of conversation messages
