[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / BaseScorer

# Abstract Class: BaseScorer

Defined in: [evaluation/scorers/baseScorer.ts:42](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/evaluation/scorers/baseScorer.ts#L42)

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

Defined in: [evaluation/scorers/baseScorer.ts:46](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/evaluation/scorers/baseScorer.ts#L46)

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

Defined in: [evaluation/scorers/baseScorer.ts:43](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/evaluation/scorers/baseScorer.ts#L43)

---

### \_metadata

> `protected` **\_metadata**: [`ScorerMetadata`](../type-aliases/ScorerMetadata.md)

Defined in: [evaluation/scorers/baseScorer.ts:44](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/evaluation/scorers/baseScorer.ts#L44)

## Accessors

### metadata

#### Get Signature

> **get** **metadata**(): [`ScorerMetadata`](../type-aliases/ScorerMetadata.md)

Defined in: [evaluation/scorers/baseScorer.ts:58](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/evaluation/scorers/baseScorer.ts#L58)

Get scorer metadata

##### Returns

[`ScorerMetadata`](../type-aliases/ScorerMetadata.md)

#### Implementation of

`Scorer.metadata`

---

### config

#### Get Signature

> **get** **config**(): [`ScorerConfig`](../type-aliases/ScorerConfig.md)

Defined in: [evaluation/scorers/baseScorer.ts:65](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/evaluation/scorers/baseScorer.ts#L65)

Get current configuration

##### Returns

[`ScorerConfig`](../type-aliases/ScorerConfig.md)

#### Implementation of

`Scorer.config`

## Methods

### score()

> `abstract` **score**(`input`): `Promise`\<[`ScoreResult`](../type-aliases/ScoreResult.md)\>

Defined in: [evaluation/scorers/baseScorer.ts:72](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/evaluation/scorers/baseScorer.ts#L72)

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

Defined in: [evaluation/scorers/baseScorer.ts:77](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/evaluation/scorers/baseScorer.ts#L77)

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

Defined in: [evaluation/scorers/baseScorer.ts:122](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/evaluation/scorers/baseScorer.ts#L122)

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

Defined in: [evaluation/scorers/baseScorer.ts:135](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/evaluation/scorers/baseScorer.ts#L135)

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

Defined in: [evaluation/scorers/baseScorer.ts:161](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/evaluation/scorers/baseScorer.ts#L161)

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

Defined in: [evaluation/scorers/baseScorer.ts:172](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/evaluation/scorers/baseScorer.ts#L172)

Check if score passes threshold

#### Parameters

##### normalizedScore

`number`

#### Returns

`boolean`

---

### createScoreResult()

> `protected` **createScoreResult**(`score`, `reasoning`, `options?`): [`ScoreResult`](../type-aliases/ScoreResult.md)

Defined in: [evaluation/scorers/baseScorer.ts:180](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/evaluation/scorers/baseScorer.ts#L180)

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

Defined in: [evaluation/scorers/baseScorer.ts:225](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/evaluation/scorers/baseScorer.ts#L225)

Create an error score result

#### Parameters

##### error

`string` \| `Error`

#### Returns

[`ScoreResult`](../type-aliases/ScoreResult.md)

---

### executeWithTiming()

> `protected` **executeWithTiming**(`scoringFn`): `Promise`\<[`ScoreResult`](../type-aliases/ScoreResult.md)\>

Defined in: [evaluation/scorers/baseScorer.ts:244](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/evaluation/scorers/baseScorer.ts#L244)

Execute scoring with timing and error handling

#### Parameters

##### scoringFn

() => `Promise`\<`Omit`\<[`ScoreResult`](../type-aliases/ScoreResult.md), `"computeTime"`\>\>

#### Returns

`Promise`\<[`ScoreResult`](../type-aliases/ScoreResult.md)\>

---

### executeWithTimeout()

> `protected` **executeWithTimeout**\<`T`\>(`fn`, `timeoutMs`, `operationName`): `Promise`\<`T`\>

Defined in: [evaluation/scorers/baseScorer.ts:272](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/evaluation/scorers/baseScorer.ts#L272)

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

Defined in: [evaluation/scorers/baseScorer.ts:287](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/evaluation/scorers/baseScorer.ts#L287)

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
