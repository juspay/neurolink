[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / composeScorers

# Function: composeScorers()

> **composeScorers**(`id`, `name`, `scorers`, `options?`): [`BaseScorer`](../classes/BaseScorer.md)

Defined in: [evaluation/scorers/customScorerUtils.ts:405](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/evaluation/scorers/customScorerUtils.ts#L405)

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
