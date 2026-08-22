[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / ConversationMemoryEvents

# Type Alias: ConversationMemoryEvents

> **ConversationMemoryEvents** = `object`

Defined in: [types/conversation.ts:404](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/conversation.ts#L404)

Events emitted by conversation memory system

## Properties

### session:created

> **session:created**: `object`

Defined in: [types/conversation.ts:409](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/conversation.ts#L409)

Emitted when a new session is created.
The timestamp field is Unix epoch milliseconds.

#### sessionId

> **sessionId**: `string`

#### userId?

> `optional` **userId?**: `string`

#### timestamp

> **timestamp**: `number`

Event timestamp as Unix epoch milliseconds

---

### turn:stored

> **turn:stored**: `object`

Defined in: [types/conversation.ts:417](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/conversation.ts#L417)

Emitted when a conversation turn is stored

#### sessionId

> **sessionId**: `string`

#### turnIndex

> **turnIndex**: `number`

#### timestamp

> **timestamp**: `number`

---

### session:cleanup

> **session:cleanup**: `object`

Defined in: [types/conversation.ts:424](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/conversation.ts#L424)

Emitted when a session is cleaned up

#### sessionId

> **sessionId**: `string`

#### reason

> **reason**: `"expired"` \| `"limit_exceeded"`

#### timestamp

> **timestamp**: `number`

---

### context:injected

> **context:injected**: `object`

Defined in: [types/conversation.ts:431](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/conversation.ts#L431)

Emitted when context is injected

#### sessionId

> **sessionId**: `string`

#### turnsIncluded

> **turnsIncluded**: `number`

#### timestamp

> **timestamp**: `number`
