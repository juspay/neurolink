[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / createInvertedScorer

# Function: createInvertedScorer()

> **createInvertedScorer**(`id`, `name`, `scorer`, `options?`): [`BaseScorer`](../classes/BaseScorer.md)

Defined in: [evaluation/scorers/customScorerUtils.ts:557](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/evaluation/scorers/customScorerUtils.ts#L557)

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
