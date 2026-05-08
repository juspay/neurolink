[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / ReportData

# Type Alias: ReportData

> **ReportData** = `object`

Defined in: [types/evaluation.ts:362](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/evaluation.ts#L362)

Report data structure

## Properties

### title

> **title**: `string`

Defined in: [types/evaluation.ts:364](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/evaluation.ts#L364)

Report title

---

### timestamp

> **timestamp**: `number`

Defined in: [types/evaluation.ts:366](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/evaluation.ts#L366)

Timestamp

---

### result

> **result**: [`PipelineResult`](PipelineResult.md) \| [`AggregatedScores`](AggregatedScores.md)

Defined in: [types/evaluation.ts:368](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/evaluation.ts#L368)

Evaluation result

---

### customSections?

> `optional` **customSections?**: `object`[]

Defined in: [types/evaluation.ts:370](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/evaluation.ts#L370)

Optional custom sections

#### title

> **title**: `string`

#### content

> **content**: `string` \| [`JsonObject`](JsonObject.md)
