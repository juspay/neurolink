[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / createRegexScorer

# Function: createRegexScorer()

> **createRegexScorer**(`id`, `name`, `options`): [`BaseScorer`](../classes/BaseScorer.md)

Defined in: [evaluation/scorers/customScorerUtils.ts:136](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/evaluation/scorers/customScorerUtils.ts#L136)

Create a regex-based scorer

## Parameters

### id

`string`

### name

`string`

### options

#### pattern

`string` \| `RegExp`

#### flags?

`string`

#### shouldMatch?

`boolean`

#### description?

`string`

#### config?

[`ScorerConfig`](../type-aliases/ScorerConfig.md)

## Returns

[`BaseScorer`](../classes/BaseScorer.md)
