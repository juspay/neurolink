[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ConversationTitleGeneratedEvent

# Type Alias: ConversationTitleGeneratedEvent

> **ConversationTitleGeneratedEvent** = `object`

Payload of the `conversation:titleGenerated` event, emitted once the title
of a new Redis-backed conversation has been stored.

## Properties

### sessionId

> **sessionId**: `string`

---

### userId

> **userId**: `string`

---

### title

> **title**: `string`

The title that was stored, which is what `listSessions()` reports.

---

### timestamp

> **timestamp**: `number`

Unix epoch milliseconds when the title was stored.
