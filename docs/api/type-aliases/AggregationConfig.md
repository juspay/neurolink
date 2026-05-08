[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / AggregationConfig

# Type Alias: AggregationConfig

> **AggregationConfig** = `object`

Defined in: [types/scorer.ts:363](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/scorer.ts#L363)

Aggregation configuration

## Properties

### method

> **method**: [`AggregationMethod`](AggregationMethod.md)

Defined in: [types/scorer.ts:365](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/scorer.ts#L365)

Aggregation method

---

### weights?

> `optional` **weights?**: `Record`\<`string`, `number`\>

Defined in: [types/scorer.ts:367](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/scorer.ts#L367)

Weights for weighted aggregation

---

### customFn?

> `optional` **customFn?**: (`scores`) => `number`

Defined in: [types/scorer.ts:369](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/scorer.ts#L369)

Custom aggregation function

#### Parameters

##### scores

[`ScoreResult`](ScoreResult.md)[]

#### Returns

`number`
