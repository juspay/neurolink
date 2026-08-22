[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / BatchEvaluationResult

# Type Alias: BatchEvaluationResult

> **BatchEvaluationResult** = `object`

Defined in: [types/evaluation.ts:449](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/evaluation.ts#L449)

Superset batch-result. `results` is a union of both item-result flavors;
summary field names chosen from BatchEvaluator (`succeeded`, `passingRate`).

## Properties

### results

> **results**: [`BatchEvaluationItemResult`](BatchEvaluationItemResult.md)[] \| [`BatchItemResult`](BatchItemResult.md)[]

Defined in: [types/evaluation.ts:450](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/evaluation.ts#L450)

---

### summary

> **summary**: `object`

Defined in: [types/evaluation.ts:451](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/evaluation.ts#L451)

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

Defined in: [types/evaluation.ts:460](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/evaluation.ts#L460)
