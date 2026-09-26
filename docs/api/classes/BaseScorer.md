[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / BaseScorer

# Abstract Class: BaseScorer

Abstract base class for all scorers
Provides common functionality and enforces interface compliance

## Extended by

- [`BaseLLMScorer`](BaseLLMScorer.md)
- [`BaseRuleScorer`](BaseRuleScorer.md)

## Implements

- [`Scorer`](../type-aliases/Scorer.md)

## Constructors

### Constructor

> **new BaseScorer**(`metadata`, `config?`): `BaseScorer`

#### Parameters

##### metadata

[`ScorerMetadata`](../type-aliases/ScorerMetadata.md)

##### config?

[`ScorerConfig`](../type-aliases/ScorerConfig.md)

#### Returns

`BaseScorer`

## Properties

### \_config

> `protected` **\_config**: [`ScorerConfig`](../type-aliases/ScorerConfig.md)

---

### \_metadata

> `protected` **\_metadata**: [`ScorerMetadata`](../type-aliases/ScorerMetadata.md)

## Accessors

### metadata

#### Get Signature

> **get** **metadata**(): [`ScorerMetadata`](../type-aliases/ScorerMetadata.md)

Get scorer metadata

##### Returns

[`ScorerMetadata`](../type-aliases/ScorerMetadata.md)

#### Implementation of

`Scorer.metadata`

---

### config

#### Get Signature

> **get** **config**(): [`ScorerConfig`](../type-aliases/ScorerConfig.md)

Get current configuration

##### Returns

[`ScorerConfig`](../type-aliases/ScorerConfig.md)

#### Implementation of

`Scorer.config`

## Methods

### score()

> `abstract` **score**(`input`): `Promise`\<[`ScoreResult`](../type-aliases/ScoreResult.md)\>

Main scoring method - must be implemented by subclasses

#### Parameters

##### input

[`ScorerInput`](../type-aliases/ScorerInput.md)

#### Returns

`Promise`\<[`ScoreResult`](../type-aliases/ScoreResult.md)\>

#### Implementation of

`Scorer.score`

---

### validateInput()

> **validateInput**(`input`): `object`

Validate input has required fields

#### Parameters

##### input

[`ScorerInput`](../type-aliases/ScorerInput.md)

#### Returns

`object`

##### valid

> **valid**: `boolean`

##### errors

> **errors**: `string`[]

#### Implementation of

`Scorer.validateInput`

---

### configure()

> **configure**(`config`): `void`

Update configuration

#### Parameters

##### config

`Partial`\<[`ScorerConfig`](../type-aliases/ScorerConfig.md)\>

#### Returns

`void`

#### Implementation of

`Scorer.configure`

---

### normalizeScore()

> `protected` **normalizeScore**(`score`, `scale?`): `number`

Normalize a score to 0-1 scale

#### Parameters

##### score

`number`

##### scale?

[`ScoreScale`](../type-aliases/ScoreScale.md) = `DEFAULT_SCORE_SCALE`

#### Returns

`number`

---

### denormalizeScore()

> `protected` **denormalizeScore**(`normalizedScore`, `scale?`): `number`

Convert normalized score back to scale

#### Parameters

##### normalizedScore

`number`

##### scale?

[`ScoreScale`](../type-aliases/ScoreScale.md) = `DEFAULT_SCORE_SCALE`

#### Returns

`number`

---

### checkThreshold()

> `protected` **checkThreshold**(`normalizedScore`): `boolean`

Check if score passes threshold

#### Parameters

##### normalizedScore

`number`

#### Returns

`boolean`

---

### createScoreResult()

> `protected` **createScoreResult**(`score`, `reasoning`, `options?`): [`ScoreResult`](../type-aliases/ScoreResult.md)

Create a standardized score result

#### Parameters

##### score

`number`

##### reasoning

`string`

##### options?

###### scale?

[`ScoreScale`](../type-aliases/ScoreScale.md)

###### confidence?

`number`

###### metadata?

[`JsonObject`](../type-aliases/JsonObject.md)

###### error?

`string`

#### Returns

[`ScoreResult`](../type-aliases/ScoreResult.md)

---

### createErrorResult()

> `protected` **createErrorResult**(`error`): [`ScoreResult`](../type-aliases/ScoreResult.md)

Create an error score result

#### Parameters

##### error

`string` \| `Error`

#### Returns

[`ScoreResult`](../type-aliases/ScoreResult.md)

---

### executeWithTiming()

> `protected` **executeWithTiming**(`scoringFn`): `Promise`\<[`ScoreResult`](../type-aliases/ScoreResult.md)\>

Execute scoring with timing and error handling

#### Parameters

##### scoringFn

() => `Promise`\<`Omit`\<[`ScoreResult`](../type-aliases/ScoreResult.md), `"computeTime"`\>\>

#### Returns

`Promise`\<[`ScoreResult`](../type-aliases/ScoreResult.md)\>

---

### executeWithTimeout()

> `protected` **executeWithTimeout**\<`T`\>(`fn`, `timeoutMs`, `operationName`): `Promise`\<`T`\>

Execute scoring with timeout

#### Type Parameters

##### T

`T`

#### Parameters

##### fn

() => `Promise`\<`T`\>

##### timeoutMs

`number`

##### operationName

`string`

#### Returns

`Promise`\<`T`\>

---

### executeWithRetry()

> `protected` **executeWithRetry**\<`T`\>(`operation`, `retries?`): `Promise`\<`T`\>

Execute with retry logic

#### Type Parameters

##### T

`T`

#### Parameters

##### operation

() => `Promise`\<`T`\>

##### retries?

`number`

#### Returns

`Promise`\<`T`\>
