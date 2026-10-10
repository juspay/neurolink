[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / RecordConversationTurnResult

# Type Alias: RecordConversationTurnResult

> **RecordConversationTurnResult** = `object`

Outcome of `NeuroLink.recordConversationTurn`.

## Properties

### recorded

> **recorded**: `boolean`

False when the turn was deliberately not stored; see `reason`.

---

### reason?

> `optional` **reason?**: `"empty-user-message"` \| `"empty-response"`

Why nothing was stored. Only set when `recorded` is false.

---

### sessionId

> **sessionId**: `string`

---

### userId

> **userId**: `string`

---

### turnId?

> `optional` **turnId?**: `string`
