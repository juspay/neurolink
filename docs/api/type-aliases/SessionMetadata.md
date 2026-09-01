[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / SessionMetadata

# Type Alias: SessionMetadata

> **SessionMetadata** = `object`

Defined in: [types/conversation.ts:530](https://github.com/juspay/neurolink/blob/release/src/lib/types/conversation.ts#L530)

Lightweight session metadata for efficient session listing
Contains only essential information without heavy message arrays

## Properties

### id

> **id**: `string`

Defined in: [types/conversation.ts:531](https://github.com/juspay/neurolink/blob/release/src/lib/types/conversation.ts#L531)

---

### title

> **title**: `string`

Defined in: [types/conversation.ts:532](https://github.com/juspay/neurolink/blob/release/src/lib/types/conversation.ts#L532)

---

### createdAt

> **createdAt**: `string`

Defined in: [types/conversation.ts:533](https://github.com/juspay/neurolink/blob/release/src/lib/types/conversation.ts#L533)

---

### updatedAt

> **updatedAt**: `string`

Defined in: [types/conversation.ts:534](https://github.com/juspay/neurolink/blob/release/src/lib/types/conversation.ts#L534)

---

### metadata?

> `optional` **metadata?**: `object`

Defined in: [types/conversation.ts:536](https://github.com/juspay/neurolink/blob/release/src/lib/types/conversation.ts#L536)

Additional metadata including agentic loop reports

#### agenticLoopReports?

> `optional` **agenticLoopReports?**: [`AgenticLoopReportMetadata`](AgenticLoopReportMetadata.md)[]
