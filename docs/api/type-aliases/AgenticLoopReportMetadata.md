[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / AgenticLoopReportMetadata

# Type Alias: AgenticLoopReportMetadata

> **AgenticLoopReportMetadata** = `object`

Defined in: [types/conversation.ts:487](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/conversation.ts#L487)

Metadata for an individual agentic loop report
A conversation session can have multiple reports tracked via this type

## Properties

### reportId

> **reportId**: `string`

Defined in: [types/conversation.ts:489](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/conversation.ts#L489)

Unique identifier for this report

---

### reportType

> **reportType**: [`AgenticLoopReportType`](AgenticLoopReportType.md)

Defined in: [types/conversation.ts:491](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/conversation.ts#L491)

Platform/category of the report

---

### reportStatus

> **reportStatus**: [`AgenticLoopReportStatus`](AgenticLoopReportStatus.md)

Defined in: [types/conversation.ts:493](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/conversation.ts#L493)

Current status of the report

---

### auditPeriod?

> `optional` **auditPeriod?**: `object`

Defined in: [types/conversation.ts:495](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/conversation.ts#L495)

Optional audit period date range for the report

#### startDate

> **startDate**: `string`

#### endDate

> **endDate**: `string`
