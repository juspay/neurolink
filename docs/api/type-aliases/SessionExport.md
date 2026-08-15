[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / SessionExport

# Type Alias: SessionExport

> **SessionExport** = `object`

Defined in: [types/conversation.ts:589](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/conversation.ts#L589)

Complete session export format for backup/analytics
Contains full session data including all messages

## Properties

### sessionId

> **sessionId**: `string`

Defined in: [types/conversation.ts:591](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/conversation.ts#L591)

Session identifier

---

### title?

> `optional` **title?**: `string`

Defined in: [types/conversation.ts:593](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/conversation.ts#L593)

Session title/description

---

### userId?

> `optional` **userId?**: `string`

Defined in: [types/conversation.ts:595](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/conversation.ts#L595)

User identifier

---

### createdAt

> **createdAt**: `string`

Defined in: [types/conversation.ts:597](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/conversation.ts#L597)

When session was created (ISO 8601)

---

### updatedAt

> **updatedAt**: `string`

Defined in: [types/conversation.ts:599](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/conversation.ts#L599)

When session was last updated (ISO 8601)

---

### messages

> **messages**: [`ChatMessage`](ChatMessage.md)[]

Defined in: [types/conversation.ts:601](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/conversation.ts#L601)

Complete message history

---

### exportMetadata?

> `optional` **exportMetadata?**: `object`

Defined in: [types/conversation.ts:603](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/conversation.ts#L603)

Export metadata

#### exportedAt

> **exportedAt**: `string`

#### exportFormat

> **exportFormat**: `"json"` \| `"csv"`

#### neuroLinkVersion?

> `optional` **neuroLinkVersion?**: `string`
