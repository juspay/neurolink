[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / createRegexScorer

# Function: createRegexScorer()

> **createRegexScorer**(`id`, `name`, `options`): [`BaseScorer`](../classes/BaseScorer.md)

Defined in: [evaluation/scorers/customScorerUtils.ts:136](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/evaluation/scorers/customScorerUtils.ts#L136)

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
