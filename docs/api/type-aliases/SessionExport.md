[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / SessionExport

# Type Alias: SessionExport

> **SessionExport** = `object`

Complete session export format for backup/analytics
Contains full session data including all messages

## Properties

### sessionId

> **sessionId**: `string`

Session identifier

---

### title?

> `optional` **title?**: `string`

Session title/description

---

### userId?

> `optional` **userId?**: `string`

User identifier

---

### createdAt

> **createdAt**: `string`

When session was created (ISO 8601)

---

### updatedAt

> **updatedAt**: `string`

When session was last updated (ISO 8601)

---

### messages

> **messages**: [`ChatMessage`](ChatMessage.md)[]

Complete message history

---

### exportMetadata?

> `optional` **exportMetadata?**: `object`

Export metadata

#### exportedAt

> **exportedAt**: `string`

#### exportFormat

> **exportFormat**: `"json"` \| `"csv"`

#### neuroLinkVersion?

> `optional` **neuroLinkVersion?**: `string`
