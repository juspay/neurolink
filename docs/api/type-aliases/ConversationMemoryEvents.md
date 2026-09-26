[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ConversationMemoryEvents

# Type Alias: ConversationMemoryEvents

> **ConversationMemoryEvents** = `object`

Events emitted by conversation memory system

## Properties

### session:created

> **session:created**: `object`

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

Emitted when context is injected

#### sessionId

> **sessionId**: `string`

#### turnsIncluded

> **turnsIncluded**: `number`

#### timestamp

> **timestamp**: `number`
