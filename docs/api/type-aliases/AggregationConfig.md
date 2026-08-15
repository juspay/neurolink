[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / AggregationConfig

# Type Alias: AggregationConfig

> **AggregationConfig** = `object`

Defined in: [types/scorer.ts:363](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/scorer.ts#L363)

Aggregation configuration

## Properties

### method

> **method**: [`AggregationMethod`](AggregationMethod.md)

Defined in: [types/scorer.ts:365](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/scorer.ts#L365)

Aggregation method

---

### weights?

> `optional` **weights?**: `Record`\<`string`, `number`\>

Defined in: [types/scorer.ts:367](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/scorer.ts#L367)

Weights for weighted aggregation

---

### customFn?

> `optional` **customFn?**: (`scores`) => `number`

Defined in: [types/scorer.ts:369](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/scorer.ts#L369)

Custom aggregation function

#### Parameters

##### scores

[`ScoreResult`](ScoreResult.md)[]

#### Returns

`number`
