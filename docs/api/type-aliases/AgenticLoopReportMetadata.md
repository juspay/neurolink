[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / AgenticLoopReportMetadata

# Type Alias: AgenticLoopReportMetadata

> **AgenticLoopReportMetadata** = `object`

Defined in: [types/conversation.ts:566](https://github.com/juspay/neurolink/blob/release/src/lib/types/conversation.ts#L566)

Metadata for an individual agentic loop report
A conversation session can have multiple reports tracked via this type

## Properties

### reportId

> **reportId**: `string`

Defined in: [types/conversation.ts:568](https://github.com/juspay/neurolink/blob/release/src/lib/types/conversation.ts#L568)

Unique identifier for this report

---

### reportType

> **reportType**: [`AgenticLoopReportType`](AgenticLoopReportType.md)

Defined in: [types/conversation.ts:570](https://github.com/juspay/neurolink/blob/release/src/lib/types/conversation.ts#L570)

Platform/category of the report

---

### reportStatus

> **reportStatus**: [`AgenticLoopReportStatus`](AgenticLoopReportStatus.md)

Defined in: [types/conversation.ts:572](https://github.com/juspay/neurolink/blob/release/src/lib/types/conversation.ts#L572)

Current status of the report

---

### auditPeriod?

> `optional` **auditPeriod?**: `object`

Defined in: [types/conversation.ts:574](https://github.com/juspay/neurolink/blob/release/src/lib/types/conversation.ts#L574)

Optional audit period date range for the report

#### startDate

> **startDate**: `string`

#### endDate

> **endDate**: `string`
