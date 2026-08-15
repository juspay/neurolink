[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / AgenticLoopReportMetadata

# Type Alias: AgenticLoopReportMetadata

> **AgenticLoopReportMetadata** = `object`

Defined in: [types/conversation.ts:558](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/conversation.ts#L558)

Metadata for an individual agentic loop report
A conversation session can have multiple reports tracked via this type

## Properties

### reportId

> **reportId**: `string`

Defined in: [types/conversation.ts:560](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/conversation.ts#L560)

Unique identifier for this report

---

### reportType

> **reportType**: [`AgenticLoopReportType`](AgenticLoopReportType.md)

Defined in: [types/conversation.ts:562](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/conversation.ts#L562)

Platform/category of the report

---

### reportStatus

> **reportStatus**: [`AgenticLoopReportStatus`](AgenticLoopReportStatus.md)

Defined in: [types/conversation.ts:564](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/conversation.ts#L564)

Current status of the report

---

### auditPeriod?

> `optional` **auditPeriod?**: `object`

Defined in: [types/conversation.ts:566](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/conversation.ts#L566)

Optional audit period date range for the report

#### startDate

> **startDate**: `string`

#### endDate

> **endDate**: `string`
