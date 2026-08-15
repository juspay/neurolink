[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / createInvertedScorer

# Function: createInvertedScorer()

> **createInvertedScorer**(`id`, `name`, `scorer`, `options?`): [`BaseScorer`](../classes/BaseScorer.md)

Defined in: [evaluation/scorers/customScorerUtils.ts:557](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/evaluation/scorers/customScorerUtils.ts#L557)

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
