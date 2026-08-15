[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / composeScorers

# Function: composeScorers()

> **composeScorers**(`id`, `name`, `scorers`, `options?`): [`BaseScorer`](../classes/BaseScorer.md)

Defined in: [evaluation/scorers/customScorerUtils.ts:405](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/evaluation/scorers/customScorerUtils.ts#L405)

Compose multiple scorers into a single scorer with aggregation

## Parameters

### id

`string`

### name

`string`

### scorers

[`BaseScorer`](../classes/BaseScorer.md)[]

### options?

#### aggregation?

`"max"` \| `"weighted"` \| `"average"` \| `"min"`

#### weights?

`number`[]

#### description?

`string`

#### config?

[`ScorerConfig`](../type-aliases/ScorerConfig.md)

## Returns

[`BaseScorer`](../classes/BaseScorer.md)
