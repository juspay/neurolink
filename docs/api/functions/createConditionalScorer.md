[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / createConditionalScorer

# Function: createConditionalScorer()

> **createConditionalScorer**(`id`, `name`, `condition`, `scorer`, `options?`): [`BaseScorer`](../classes/BaseScorer.md)

Defined in: [evaluation/scorers/customScorerUtils.ts:501](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/evaluation/scorers/customScorerUtils.ts#L501)

Create a conditional scorer that only runs if a condition is met

## Parameters

### id

`string`

### name

`string`

### condition

(`input`) => `boolean`

### scorer

[`BaseScorer`](../classes/BaseScorer.md)

### options?

#### defaultScore?

`number`

#### defaultReasoning?

`string`

#### description?

`string`

#### config?

[`ScorerConfig`](../type-aliases/ScorerConfig.md)

## Returns

[`BaseScorer`](../classes/BaseScorer.md)
