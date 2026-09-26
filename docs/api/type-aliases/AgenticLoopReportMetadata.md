[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / AgenticLoopReportMetadata

# Type Alias: AgenticLoopReportMetadata

> **AgenticLoopReportMetadata** = `object`

Metadata for an individual agentic loop report
A conversation session can have multiple reports tracked via this type

## Properties

### reportId

> **reportId**: `string`

Unique identifier for this report

---

### reportType

> **reportType**: [`AgenticLoopReportType`](AgenticLoopReportType.md)

Platform/category of the report

---

### reportStatus

> **reportStatus**: [`AgenticLoopReportStatus`](AgenticLoopReportStatus.md)

Current status of the report

---

### auditPeriod?

> `optional` **auditPeriod?**: `object`

Optional audit period date range for the report

#### startDate

> **startDate**: `string`

#### endDate

> **endDate**: `string`
