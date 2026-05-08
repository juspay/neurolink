[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / SessionMetadata

# Type Alias: SessionMetadata

> **SessionMetadata** = `object`

Defined in: [types/conversation.ts:453](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/conversation.ts#L453)

Lightweight session metadata for efficient session listing
Contains only essential information without heavy message arrays

## Properties

### id

> **id**: `string`

Defined in: [types/conversation.ts:454](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/conversation.ts#L454)

---

### title

> **title**: `string`

Defined in: [types/conversation.ts:455](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/conversation.ts#L455)

---

### createdAt

> **createdAt**: `string`

Defined in: [types/conversation.ts:456](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/conversation.ts#L456)

---

### updatedAt

> **updatedAt**: `string`

Defined in: [types/conversation.ts:457](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/conversation.ts#L457)

---

### metadata?

> `optional` **metadata?**: `object`

Defined in: [types/conversation.ts:459](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/conversation.ts#L459)

Additional metadata including agentic loop reports

#### agenticLoopReports?

> `optional` **agenticLoopReports?**: [`AgenticLoopReportMetadata`](AgenticLoopReportMetadata.md)[]
