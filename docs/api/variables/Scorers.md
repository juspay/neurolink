[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / Scorers

# Variable: Scorers

> `const` **Scorers**: `object`

Defined in: [evaluation/scorers/scorerBuilder.ts:482](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/evaluation/scorers/scorerBuilder.ts#L482)

Quick builder factory functions

## Type Declaration

### create

> **create**: (`id`, `name`) => [`ScorerBuilder`](../classes/ScorerBuilder.md)

Create a new scorer builder

#### Parameters

##### id

`string`

##### name

`string`

#### Returns

[`ScorerBuilder`](../classes/ScorerBuilder.md)

### passIf

> **passIf**: (`id`, `name`, `condition`) => [`ScorerBuilder`](../classes/ScorerBuilder.md)

Create a simple pass/fail scorer based on a condition

#### Parameters

##### id

`string`

##### name

`string`

##### condition

(`input`) => `boolean`

#### Returns

[`ScorerBuilder`](../classes/ScorerBuilder.md)

### requiresContent

> **requiresContent**: (`id`, `name`, `keywords`) => [`ScorerBuilder`](../classes/ScorerBuilder.md)

Create a scorer that checks for required content

#### Parameters

##### id

`string`

##### name

`string`

##### keywords

`string`[]

#### Returns

[`ScorerBuilder`](../classes/ScorerBuilder.md)

### withLength

> **withLength**: (`id`, `name`, `options`) => [`ScorerBuilder`](../classes/ScorerBuilder.md)

Create a scorer with length constraints

#### Parameters

##### id

`string`

##### name

`string`

##### options

###### minWords?

`number`

###### maxWords?

`number`

###### minChars?

`number`

###### maxChars?

`number`

#### Returns

[`ScorerBuilder`](../classes/ScorerBuilder.md)

### combine

> **combine**: (`id`, `name`, `scorers`) => [`ScorerBuilder`](../classes/ScorerBuilder.md)

Create a scorer that combines multiple scorers

#### Parameters

##### id

`string`

##### name

`string`

##### scorers

[`BaseScorer`](../classes/BaseScorer.md)[]

#### Returns

[`ScorerBuilder`](../classes/ScorerBuilder.md)
