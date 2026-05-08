[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / createFunctionScorer

# Function: createFunctionScorer()

> **createFunctionScorer**(`id`, `name`, `scorerFn`, `options?`): [`BaseScorer`](../classes/BaseScorer.md)

Defined in: [evaluation/scorers/customScorerUtils.ts:107](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/evaluation/scorers/customScorerUtils.ts#L107)

Create a simple function-based scorer

## Parameters

### id

`string`

### name

`string`

### scorerFn

[`ScorerFunction`](../type-aliases/ScorerFunction.md)

### options?

#### description?

`string`

#### category?

[`ScorerCategory`](../type-aliases/ScorerCategory.md)

#### type?

[`ScorerType`](../type-aliases/ScorerType.md)

#### version?

`string`

#### requiredInputs?

keyof [`ScorerInput`](../type-aliases/ScorerInput.md)[]

#### optionalInputs?

keyof [`ScorerInput`](../type-aliases/ScorerInput.md)[]

#### config?

[`ScorerConfig`](../type-aliases/ScorerConfig.md)

## Returns

[`BaseScorer`](../classes/BaseScorer.md)
