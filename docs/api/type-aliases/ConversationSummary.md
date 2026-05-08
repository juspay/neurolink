[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / ConversationSummary

# Type Alias: ConversationSummary

> **ConversationSummary** = [`ConversationBase`](ConversationBase.md) & `object`

Defined in: [types/conversation.ts:586](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/conversation.ts#L586)

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
