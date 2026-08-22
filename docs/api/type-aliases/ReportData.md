[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ReportData

# Type Alias: ReportData

> **ReportData** = `object`

Defined in: [types/evaluation.ts:357](https://github.com/juspay/neurolink/blob/release/src/lib/types/evaluation.ts#L357)

Report data structure

## Properties

### title

> **title**: `string`

Defined in: [types/evaluation.ts:359](https://github.com/juspay/neurolink/blob/release/src/lib/types/evaluation.ts#L359)

Report title

---

### timestamp

> **timestamp**: `number`

Defined in: [types/evaluation.ts:361](https://github.com/juspay/neurolink/blob/release/src/lib/types/evaluation.ts#L361)

Timestamp

---

### result

> **result**: [`PipelineResult`](PipelineResult.md) \| [`AggregatedScores`](AggregatedScores.md)

Defined in: [types/evaluation.ts:363](https://github.com/juspay/neurolink/blob/release/src/lib/types/evaluation.ts#L363)

Evaluation result

---

### customSections?

> `optional` **customSections?**: `object`[]

Defined in: [types/evaluation.ts:365](https://github.com/juspay/neurolink/blob/release/src/lib/types/evaluation.ts#L365)

Optional custom sections

#### title

> **title**: `string`

#### content

> **content**: `string` \| [`JsonObject`](JsonObject.md)
