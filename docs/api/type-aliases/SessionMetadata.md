[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / SessionMetadata

# Type Alias: SessionMetadata

> **SessionMetadata** = `object`

Defined in: [types/conversation.ts:522](https://github.com/juspay/neurolink/blob/release/src/lib/types/conversation.ts#L522)

Lightweight session metadata for efficient session listing
Contains only essential information without heavy message arrays

## Properties

### id

> **id**: `string`

Defined in: [types/conversation.ts:523](https://github.com/juspay/neurolink/blob/release/src/lib/types/conversation.ts#L523)

---

### title

> **title**: `string`

Defined in: [types/conversation.ts:524](https://github.com/juspay/neurolink/blob/release/src/lib/types/conversation.ts#L524)

---

### createdAt

> **createdAt**: `string`

Defined in: [types/conversation.ts:525](https://github.com/juspay/neurolink/blob/release/src/lib/types/conversation.ts#L525)

---

### updatedAt

> **updatedAt**: `string`

Defined in: [types/conversation.ts:526](https://github.com/juspay/neurolink/blob/release/src/lib/types/conversation.ts#L526)

---

### metadata?

> `optional` **metadata?**: `object`

Defined in: [types/conversation.ts:528](https://github.com/juspay/neurolink/blob/release/src/lib/types/conversation.ts#L528)

Additional metadata including agentic loop reports

#### agenticLoopReports?

> `optional` **agenticLoopReports?**: [`AgenticLoopReportMetadata`](AgenticLoopReportMetadata.md)[]
