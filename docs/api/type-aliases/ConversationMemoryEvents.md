[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / ConversationMemoryEvents

# Type Alias: ConversationMemoryEvents

> **ConversationMemoryEvents** = `object`

Defined in: [types/conversation.ts:348](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/conversation.ts#L348)

Events emitted by conversation memory system

## Properties

### session:created

> **session:created**: `object`

Defined in: [types/conversation.ts:353](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/conversation.ts#L353)

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

Defined in: [types/conversation.ts:361](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/conversation.ts#L361)

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

Defined in: [types/conversation.ts:368](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/conversation.ts#L368)

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

Defined in: [types/conversation.ts:375](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/conversation.ts#L375)

Emitted when context is injected

#### sessionId

> **sessionId**: `string`

#### turnsIncluded

> **turnsIncluded**: `number`

#### timestamp

> **timestamp**: `number`
