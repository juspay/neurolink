[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / AggregationConfig

# Type Alias: AggregationConfig

> **AggregationConfig** = `object`

Aggregation configuration

## Properties

### method

> **method**: [`AggregationMethod`](AggregationMethod.md)

Aggregation method

---

### weights?

> `optional` **weights?**: `Record`\<`string`, `number`\>

Weights for weighted aggregation

---

### customFn?

> `optional` **customFn?**: (`scores`) => `number`

Custom aggregation function

#### Parameters

##### scores

[`ScoreResult`](ScoreResult.md)[]

#### Returns

`number`
