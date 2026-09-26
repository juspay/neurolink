[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / BatchEvaluationResult

# Type Alias: BatchEvaluationResult

> **BatchEvaluationResult** = `object`

Superset batch-result. `results` is a union of both item-result flavors;
summary field names chosen from BatchEvaluator (`succeeded`, `passingRate`).

## Properties

### results

> **results**: [`BatchEvaluationItemResult`](BatchEvaluationItemResult.md)[] \| [`BatchItemResult`](BatchItemResult.md)[]

---

### summary

> **summary**: `object`

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
