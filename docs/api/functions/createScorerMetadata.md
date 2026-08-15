[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / createScorerMetadata

# Function: createScorerMetadata()

> **createScorerMetadata**(`id`, `name`, `options?`): [`ScorerMetadata`](../type-aliases/ScorerMetadata.md)

Defined in: [evaluation/scorers/customScorerUtils.ts:22](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/evaluation/scorers/customScorerUtils.ts#L22)

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
