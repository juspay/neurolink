[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / BaseLLMScorer

# Abstract Class: BaseLLMScorer

Abstract base class for LLM-based scorers

## Extends

- [`BaseScorer`](BaseScorer.md)

## Extended by

- [`AnswerRelevancyScorer`](AnswerRelevancyScorer.md)
- [`BiasDetectionScorer`](BiasDetectionScorer.md)
- [`ContextPrecisionScorer`](ContextPrecisionScorer.md)
- [`ContextRelevancyScorer`](ContextRelevancyScorer.md)
- [`FaithfulnessScorer`](FaithfulnessScorer.md)
- [`HallucinationScorer`](HallucinationScorer.md)
- [`PromptAlignmentScorer`](PromptAlignmentScorer.md)
- [`SummarizationScorer`](SummarizationScorer.md)
- [`ToneConsistencyScorer`](ToneConsistencyScorer.md)
- [`ToxicityScorer`](ToxicityScorer.md)

## Implements

- [`LLMScorer`](../type-aliases/LLMScorer.md)

## Constructors

### Constructor

> **new BaseLLMScorer**(`metadata`, `config?`): `BaseLLMScorer`

#### Parameters

##### metadata

[`ScorerMetadata`](../type-aliases/ScorerMetadata.md)

##### config?

[`LLMScorerConfig`](../type-aliases/LLMScorerConfig.md)

#### Returns

`BaseLLMScorer`

#### Overrides

[`BaseScorer`](BaseScorer.md).[`constructor`](BaseScorer.md#constructor)

## Properties

### \_config

> `protected` **\_config**: [`ScorerConfig`](../type-aliases/ScorerConfig.md)

#### Inherited from

[`BaseScorer`](BaseScorer.md).[`_config`](BaseScorer.md#_config)

---

### \_metadata

> `protected` **\_metadata**: [`ScorerMetadata`](../type-aliases/ScorerMetadata.md)

#### Inherited from

[`BaseScorer`](BaseScorer.md).[`_metadata`](BaseScorer.md#_metadata)

---

### \_llmConfig

> `protected` **\_llmConfig**: [`LLMScorerConfig`](../type-aliases/LLMScorerConfig.md)

---

### provider?

> `protected` `optional` **provider?**: [`AIProvider`](../type-aliases/AIProvider.md)

## Accessors

### metadata

#### Get Signature

> **get** **metadata**(): [`ScorerMetadata`](../type-aliases/ScorerMetadata.md)

Get scorer metadata

##### Returns

[`ScorerMetadata`](../type-aliases/ScorerMetadata.md)

#### Implementation of

`LLMScorer.metadata`

#### Inherited from

[`BaseScorer`](BaseScorer.md).[`metadata`](BaseScorer.md#metadata)

---

### config

#### Get Signature

> **get** **config**(): [`ScorerConfig`](../type-aliases/ScorerConfig.md)

Get current configuration

##### Returns

[`ScorerConfig`](../type-aliases/ScorerConfig.md)

#### Implementation of

`LLMScorer.config`

#### Inherited from

[`BaseScorer`](BaseScorer.md).[`config`](BaseScorer.md#config)

---

### llmConfig

#### Get Signature

> **get** **llmConfig**(): [`LLMScorerConfig`](../type-aliases/LLMScorerConfig.md)

Get LLM-specific configuration

##### Returns

[`LLMScorerConfig`](../type-aliases/LLMScorerConfig.md)

#### Implementation of

`LLMScorer.llmConfig`

## Methods

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

`LLMScorer.validateInput`

#### Inherited from

[`BaseScorer`](BaseScorer.md).[`validateInput`](BaseScorer.md#validateinput)

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

`LLMScorer.configure`

#### Inherited from

[`BaseScorer`](BaseScorer.md).[`configure`](BaseScorer.md#configure)

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

#### Inherited from

[`BaseScorer`](BaseScorer.md).[`normalizeScore`](BaseScorer.md#normalizescore)

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

#### Inherited from

[`BaseScorer`](BaseScorer.md).[`denormalizeScore`](BaseScorer.md#denormalizescore)

---

### checkThreshold()

> `protected` **checkThreshold**(`normalizedScore`): `boolean`

Check if score passes threshold

#### Parameters

##### normalizedScore

`number`

#### Returns

`boolean`

#### Inherited from

[`BaseScorer`](BaseScorer.md).[`checkThreshold`](BaseScorer.md#checkthreshold)

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

#### Inherited from

[`BaseScorer`](BaseScorer.md).[`createScoreResult`](BaseScorer.md#createscoreresult)

---

### createErrorResult()

> `protected` **createErrorResult**(`error`): [`ScoreResult`](../type-aliases/ScoreResult.md)

Create an error score result

#### Parameters

##### error

`string` \| `Error`

#### Returns

[`ScoreResult`](../type-aliases/ScoreResult.md)

#### Inherited from

[`BaseScorer`](BaseScorer.md).[`createErrorResult`](BaseScorer.md#createerrorresult)

---

### executeWithTiming()

> `protected` **executeWithTiming**(`scoringFn`): `Promise`\<[`ScoreResult`](../type-aliases/ScoreResult.md)\>

Execute scoring with timing and error handling

#### Parameters

##### scoringFn

() => `Promise`\<`Omit`\<[`ScoreResult`](../type-aliases/ScoreResult.md), `"computeTime"`\>\>

#### Returns

`Promise`\<[`ScoreResult`](../type-aliases/ScoreResult.md)\>

#### Inherited from

[`BaseScorer`](BaseScorer.md).[`executeWithTiming`](BaseScorer.md#executewithtiming)

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

#### Inherited from

[`BaseScorer`](BaseScorer.md).[`executeWithTimeout`](BaseScorer.md#executewithtimeout)

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

#### Inherited from

[`BaseScorer`](BaseScorer.md).[`executeWithRetry`](BaseScorer.md#executewithretry)

---

### generatePrompt()

> `abstract` **generatePrompt**(`input`): `string`

Generate the prompt for LLM scoring - must be implemented by subclasses

#### Parameters

##### input

[`ScorerInput`](../type-aliases/ScorerInput.md)

#### Returns

`string`

#### Implementation of

`LLMScorer.generatePrompt`

---

### parseResponse()

> `abstract` **parseResponse**(`response`, `input`): `Partial`\<[`ScoreResult`](../type-aliases/ScoreResult.md)\>

Parse LLM response into score result - must be implemented by subclasses

#### Parameters

##### response

`string`

##### input

[`ScorerInput`](../type-aliases/ScorerInput.md)

#### Returns

`Partial`\<[`ScoreResult`](../type-aliases/ScoreResult.md)\>

#### Implementation of

`LLMScorer.parseResponse`

---

### score()

> **score**(`input`): `Promise`\<[`ScoreResult`](../type-aliases/ScoreResult.md)\>

Main scoring method

#### Parameters

##### input

[`ScorerInput`](../type-aliases/ScorerInput.md)

#### Returns

`Promise`\<[`ScoreResult`](../type-aliases/ScoreResult.md)\>

#### Implementation of

`LLMScorer.score`

#### Overrides

[`BaseScorer`](BaseScorer.md).[`score`](BaseScorer.md#score)

---

### initializeProvider()

> `protected` **initializeProvider**(): `Promise`\<`void`\>

Initialize the AI provider

#### Returns

`Promise`\<`void`\>

---

### callLLM()

> `protected` **callLLM**(`prompt`): `Promise`\<`string`\>

Call the LLM with the given prompt

#### Parameters

##### prompt

`string`

#### Returns

`Promise`\<`string`\>

---

### extractJSON()

> `protected` **extractJSON**(`response`): [`JsonObject`](../type-aliases/JsonObject.md) \| `null`

Extract JSON from LLM response
Handles various formats including markdown code blocks

#### Parameters

##### response

`string`

#### Returns

[`JsonObject`](../type-aliases/JsonObject.md) \| `null`

---

### substituteTemplate()

> `protected` **substituteTemplate**(`template`, `variables`): `string`

Simple template substitution for prompts

#### Parameters

##### template

`string`

##### variables

`Record`\<`string`, `string` \| `string`[] \| `undefined`\>

#### Returns

`string`

---

### processConditionals()

> `protected` **processConditionals**(`template`, `conditions`): `string`

Handle conditional template blocks

#### Parameters

##### template

`string`

##### conditions

`Record`\<`string`, `boolean`\>

#### Returns

`string`

---

### extractNumericScore()

> `protected` **extractNumericScore**(`text`): `number` \| `null`

Extract a numeric score from text response
Safe numeric extraction without ReDoS-prone regex

#### Parameters

##### text

`string`

#### Returns

`number` \| `null`

---

### extractScoreFromText()

> `protected` **extractScoreFromText**(`text`, `min?`, `max?`): `number`

Extract a numeric score from text response with fallback

#### Parameters

##### text

`string`

##### min?

`number` = `0`

##### max?

`number` = `10`

#### Returns

`number`
