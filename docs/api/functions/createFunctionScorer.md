[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / createFunctionScorer

# Function: createFunctionScorer()

> **createFunctionScorer**(`id`, `name`, `scorerFn`, `options?`): [`BaseScorer`](../classes/BaseScorer.md)

Defined in: [evaluation/scorers/customScorerUtils.ts:107](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/evaluation/scorers/customScorerUtils.ts#L107)

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
