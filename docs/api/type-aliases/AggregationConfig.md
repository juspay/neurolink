[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / AggregationConfig

# Type Alias: AggregationConfig

> **AggregationConfig** = `object`

Defined in: [types/scorer.ts:363](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/scorer.ts#L363)

Aggregation configuration

## Properties

### method

> **method**: [`AggregationMethod`](AggregationMethod.md)

Defined in: [types/scorer.ts:365](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/scorer.ts#L365)

Aggregation method

---

### weights?

> `optional` **weights?**: `Record`\<`string`, `number`\>

Defined in: [types/scorer.ts:367](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/scorer.ts#L367)

Weights for weighted aggregation

---

### customFn?

> `optional` **customFn?**: (`scores`) => `number`

Defined in: [types/scorer.ts:369](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/scorer.ts#L369)

Custom aggregation function

#### Parameters

##### scores

[`ScoreResult`](ScoreResult.md)[]

#### Returns

`number`
