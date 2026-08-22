[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / composeScorers

# Function: composeScorers()

> **composeScorers**(`id`, `name`, `scorers`, `options?`): [`BaseScorer`](../classes/BaseScorer.md)

Defined in: [evaluation/scorers/customScorerUtils.ts:405](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/evaluation/scorers/customScorerUtils.ts#L405)

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
