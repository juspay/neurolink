[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / createScorerMetadata

# Function: createScorerMetadata()

> **createScorerMetadata**(`id`, `name`, `options?`): [`ScorerMetadata`](../type-aliases/ScorerMetadata.md)

Defined in: [evaluation/scorers/customScorerUtils.ts:22](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/evaluation/scorers/customScorerUtils.ts#L22)

Create scorer metadata with defaults

## Parameters

### id

`string`

### name

`string`

### options?

#### description?

`string`

#### type?

[`ScorerType`](../type-aliases/ScorerType.md)

#### category?

[`ScorerCategory`](../type-aliases/ScorerCategory.md)

#### version?

`string`

#### requiredInputs?

keyof [`ScorerInput`](../type-aliases/ScorerInput.md)[]

#### optionalInputs?

keyof [`ScorerInput`](../type-aliases/ScorerInput.md)[]

#### defaultConfig?

[`ScorerConfig`](../type-aliases/ScorerConfig.md)

## Returns

[`ScorerMetadata`](../type-aliases/ScorerMetadata.md)
