[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / createRegexScorer

# Function: createRegexScorer()

> **createRegexScorer**(`id`, `name`, `options`): [`BaseScorer`](../classes/BaseScorer.md)

Defined in: [evaluation/scorers/customScorerUtils.ts:136](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/evaluation/scorers/customScorerUtils.ts#L136)

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
