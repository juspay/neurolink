[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / createConditionalScorer

# Function: createConditionalScorer()

> **createConditionalScorer**(`id`, `name`, `condition`, `scorer`, `options?`): [`BaseScorer`](../classes/BaseScorer.md)

Defined in: [evaluation/scorers/customScorerUtils.ts:501](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/evaluation/scorers/customScorerUtils.ts#L501)

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
