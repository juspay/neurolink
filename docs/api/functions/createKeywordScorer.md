[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / createKeywordScorer

# Function: createKeywordScorer()

> **createKeywordScorer**(`id`, `name`, `options`): [`BaseScorer`](../classes/BaseScorer.md)

Defined in: [evaluation/scorers/customScorerUtils.ts:238](https://github.com/juspay/neurolink/blob/release/src/lib/evaluation/scorers/customScorerUtils.ts#L238)

Create a keyword presence scorer

## Parameters

### id

`string`

### name

`string`

### options

#### requiredKeywords?

`string`[]

#### forbiddenKeywords?

`string`[]

#### caseInsensitive?

`boolean`

#### description?

`string`

#### config?

[`ScorerConfig`](../type-aliases/ScorerConfig.md)

## Returns

[`BaseScorer`](../classes/BaseScorer.md)
