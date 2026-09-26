[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ReportData

# Type Alias: ReportData

> **ReportData** = `object`

Report data structure

## Properties

### title

> **title**: `string`

Report title

---

### timestamp

> **timestamp**: `number`

Timestamp

---

### result

> **result**: [`PipelineResult`](PipelineResult.md) \| [`AggregatedScores`](AggregatedScores.md)

Evaluation result

---

### customSections?

> `optional` **customSections?**: `object`[]

Optional custom sections

#### title

> **title**: `string`

#### content

> **content**: `string` \| [`JsonObject`](JsonObject.md)
