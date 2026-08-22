[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / createInvertedScorer

# Function: createInvertedScorer()

> **createInvertedScorer**(`id`, `name`, `scorer`, `options?`): [`BaseScorer`](../classes/BaseScorer.md)

Defined in: [evaluation/scorers/customScorerUtils.ts:557](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/evaluation/scorers/customScorerUtils.ts#L557)

Create a scorer that inverts the score (10 - score)

## Parameters

### id

`string`

### name

`string`

### scorer

[`BaseScorer`](../classes/BaseScorer.md)

### options?

#### description?

`string`

#### config?

[`ScorerConfig`](../type-aliases/ScorerConfig.md)

## Returns

[`BaseScorer`](../classes/BaseScorer.md)
