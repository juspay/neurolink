[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ConversationSummary

# Type Alias: ConversationSummary

> **ConversationSummary** = [`ConversationBase`](ConversationBase.md) & `object`

Defined in: [types/conversation.ts:695](https://github.com/juspay/neurolink/blob/release/src/lib/types/conversation.ts#L695)

Conversation summary for listing and selection
Contains conversation preview information without heavy message arrays

## Type Declaration

### firstMessage

> **firstMessage**: `object`

First message preview (for conversation preview)

#### firstMessage.content

> **content**: `string`

#### firstMessage.timestamp

> **timestamp**: `string`

### lastMessage

> **lastMessage**: `object`

Last message preview (for conversation preview)

#### lastMessage.content

> **content**: `string`

#### lastMessage.timestamp

> **timestamp**: `string`

### messageCount

> **messageCount**: `number`

Total number of messages in conversation

### duration

> **duration**: `string`

Human-readable time since last update (e.g., "2 hours ago")
