[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / EvaluationStrategyConfig

# Type Alias: EvaluationStrategyConfig

> **EvaluationStrategyConfig** = `object`

Defined in: [types/evaluation.ts:560](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/evaluation.ts#L560)

Configuration for evaluation strategies.

## Properties

### evaluationModel?

> `optional` **evaluationModel?**: `string`

Defined in: [types/evaluation.ts:561](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/evaluation.ts#L561)

---

### provider?

> `optional` **provider?**: `string`

Defined in: [types/evaluation.ts:562](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/evaluation.ts#L562)

---

### threshold?

> `optional` **threshold?**: `number`

Defined in: [types/evaluation.ts:563](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/evaluation.ts#L563)

---

### promptGenerator?

> `optional` **promptGenerator?**: (`context`) => `string`

Defined in: [types/evaluation.ts:564](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/evaluation.ts#L564)

#### Parameters

##### context

###### userQuery

`string`

###### history

`string`

###### tools

`string`

###### retryInfo

`string`

###### aiResponse

`string`

#### Returns

`string`

---

### options?

> `optional` **options?**: `Record`\<`string`, `unknown`\>

Defined in: [types/evaluation.ts:571](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/evaluation.ts#L571)
