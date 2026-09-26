[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / Scorer

# Type Alias: Scorer

> **Scorer** = `object`

Core Scorer interface - all scorers must implement this

## Properties

### metadata

> `readonly` **metadata**: [`ScorerMetadata`](ScorerMetadata.md)

Scorer metadata

---

### config

> `readonly` **config**: [`ScorerConfig`](ScorerConfig.md)

Current configuration

## Methods

### score()

> **score**(`input`): `Promise`\<[`ScoreResult`](ScoreResult.md)\>

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

Update scorer configuration

#### Parameters

##### config

`Partial`\<[`ScorerConfig`](ScorerConfig.md)\>

New configuration

#### Returns

`void`
