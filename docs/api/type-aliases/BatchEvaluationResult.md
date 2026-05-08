[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / BatchEvaluationResult

# Type Alias: BatchEvaluationResult

> **BatchEvaluationResult** = `object`

Defined in: [types/evaluation.ts:454](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/evaluation.ts#L454)

Superset batch-result. `results` is a union of both item-result flavors;
summary field names chosen from BatchEvaluator (`succeeded`, `passingRate`).

## Properties

### results

> **results**: [`BatchEvaluationItemResult`](BatchEvaluationItemResult.md)[] \| [`BatchItemResult`](BatchItemResult.md)[]

Defined in: [types/evaluation.ts:455](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/evaluation.ts#L455)

---

### summary

> **summary**: `object`

Defined in: [types/evaluation.ts:456](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/evaluation.ts#L456)

#### total

> **total**: `number`

#### succeeded

> **succeeded**: `number`

#### failed

> **failed**: `number`

#### averageScore

> **averageScore**: `number`

#### averageDuration

> **averageDuration**: `number`

#### totalDuration

> **totalDuration**: `number`

#### passingRate

> **passingRate**: `number`

---

### allSucceeded?

> `optional` **allSucceeded?**: `boolean`

Defined in: [types/evaluation.ts:465](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/evaluation.ts#L465)
