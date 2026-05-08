[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / Scorer

# Type Alias: Scorer

> **Scorer** = `object`

Defined in: [types/scorer.ts:260](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/scorer.ts#L260)

Core Scorer interface - all scorers must implement this

## Properties

### metadata

> `readonly` **metadata**: [`ScorerMetadata`](ScorerMetadata.md)

Defined in: [types/scorer.ts:262](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/scorer.ts#L262)

Scorer metadata

---

### config

> `readonly` **config**: [`ScorerConfig`](ScorerConfig.md)

Defined in: [types/scorer.ts:265](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/scorer.ts#L265)

Current configuration

## Methods

### score()

> **score**(`input`): `Promise`\<[`ScoreResult`](ScoreResult.md)\>

Defined in: [types/scorer.ts:272](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/scorer.ts#L272)

Execute the scorer and return a score result

#### Parameters

##### input

[`ScorerInput`](ScorerInput.md)

Input context for scoring

#### Returns

`Promise`\<[`ScoreResult`](ScoreResult.md)\>

Score result

---

### validateInput()

> **validateInput**(`input`): `object`

Defined in: [types/scorer.ts:279](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/scorer.ts#L279)

Validate that required inputs are present

#### Parameters

##### input

[`ScorerInput`](ScorerInput.md)

Input to validate

#### Returns

`object`

Validation result

##### valid

> **valid**: `boolean`

##### errors

> **errors**: `string`[]

---

### configure()

> **configure**(`config`): `void`

Defined in: [types/scorer.ts:285](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/scorer.ts#L285)

Update scorer configuration

#### Parameters

##### config

`Partial`\<[`ScorerConfig`](ScorerConfig.md)\>

New configuration

#### Returns

`void`
