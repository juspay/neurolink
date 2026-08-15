[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / BatchEvaluationResult

# Type Alias: BatchEvaluationResult

> **BatchEvaluationResult** = `object`

Defined in: [types/evaluation.ts:449](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/evaluation.ts#L449)

Superset batch-result. `results` is a union of both item-result flavors;
summary field names chosen from BatchEvaluator (`succeeded`, `passingRate`).

## Properties

### results

> **results**: [`BatchEvaluationItemResult`](BatchEvaluationItemResult.md)[] \| [`BatchItemResult`](BatchItemResult.md)[]

Defined in: [types/evaluation.ts:450](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/evaluation.ts#L450)

---

### summary

> **summary**: `object`

Defined in: [types/evaluation.ts:451](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/evaluation.ts#L451)

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

Defined in: [types/evaluation.ts:460](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/evaluation.ts#L460)
