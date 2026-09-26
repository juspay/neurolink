[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / PromptAlignmentScorer

# Class: PromptAlignmentScorer

Evaluation System Exports

A comprehensive evaluation framework for assessing AI response quality,
with support for RAGAS-style metrics, custom scorers, and pipeline-based evaluation.

## Example

```typescript
import {
  Evaluator,
  ScorerRegistry,
  EvaluationPipeline,
  createFaithfulnessScorer,
  createAnswerRelevancyScorer,
} from "@juspay/neurolink";

// Create a pipeline with multiple scorers
const pipeline = new EvaluationPipeline({
  scorers: [
    createFaithfulnessScorer({ model: "gpt-4" }),
    createAnswerRelevancyScorer({ model: "gpt-4" }),
  ],
});

// Run evaluation
const result = await pipeline.evaluate({
  question: "What is quantum computing?",
  answer: "Quantum computing uses quantum mechanics...",
  context: ["Quantum computing is a type of computation..."],
});
```

## Extends

- [`BaseLLMScorer`](BaseLLMScorer.md)

## Constructors

### Constructor

> **new PromptAlignmentScorer**(`config?`): `PromptAlignmentScorer`

#### Parameters

##### config?

`Partial`\<[`LLMScorerConfig`](../type-aliases/LLMScorerConfig.md)\>

#### Returns

`PromptAlignmentScorer`

#### Overrides

[`BaseLLMScorer`](BaseLLMScorer.md).[`constructor`](BaseLLMScorer.md#constructor)

## Properties

### \_config

> `protected` **\_config**: [`ScorerConfig`](../type-aliases/ScorerConfig.md)

#### Inherited from

[`BaseLLMScorer`](BaseLLMScorer.md).[`_config`](BaseLLMScorer.md#_config)

---

### \_metadata

> `protected` **\_metadata**: [`ScorerMetadata`](../type-aliases/ScorerMetadata.md)

#### Inherited from

[`BaseLLMScorer`](BaseLLMScorer.md).[`_metadata`](BaseLLMScorer.md#_metadata)

---

### \_llmConfig

> `protected` **\_llmConfig**: [`LLMScorerConfig`](../type-aliases/LLMScorerConfig.md)

#### Inherited from

[`BaseLLMScorer`](BaseLLMScorer.md).[`_llmConfig`](BaseLLMScorer.md#_llmconfig)

---

### provider?

> `protected` `optional` **provider?**: [`AIProvider`](../type-aliases/AIProvider.md)

#### Inherited from

[`BaseLLMScorer`](BaseLLMScorer.md).[`provider`](BaseLLMScorer.md#provider)

## Accessors

### metadata

#### Get Signature

> **get** **metadata**(): [`ScorerMetadata`](../type-aliases/ScorerMetadata.md)

Get scorer metadata

##### Returns

[`ScorerMetadata`](../type-aliases/ScorerMetadata.md)

#### Inherited from

[`BaseLLMScorer`](BaseLLMScorer.md).[`metadata`](BaseLLMScorer.md#metadata)

---

### config

#### Get Signature

> **get** **config**(): [`ScorerConfig`](../type-aliases/ScorerConfig.md)

Get current configuration

##### Returns

[`ScorerConfig`](../type-aliases/ScorerConfig.md)

#### Inherited from

[`BaseLLMScorer`](BaseLLMScorer.md).[`config`](BaseLLMScorer.md#config)

---

### llmConfig

#### Get Signature

> **get** **llmConfig**(): [`LLMScorerConfig`](../type-aliases/LLMScorerConfig.md)

Get LLM-specific configuration

##### Returns

[`LLMScorerConfig`](../type-aliases/LLMScorerConfig.md)

#### Inherited from

[`BaseLLMScorer`](BaseLLMScorer.md).[`llmConfig`](BaseLLMScorer.md#llmconfig)

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

#### Inherited from

[`BaseLLMScorer`](BaseLLMScorer.md).[`validateInput`](BaseLLMScorer.md#validateinput)

---

### configure()

> **configure**(`config`): `void`

Update configuration

#### Parameters

##### config

`Partial`\<[`ScorerConfig`](../type-aliases/ScorerConfig.md)\>

#### Returns

`void`

#### Inherited from

[`BaseLLMScorer`](BaseLLMScorer.md).[`configure`](BaseLLMScorer.md#configure)

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

[`BaseLLMScorer`](BaseLLMScorer.md).[`normalizeScore`](BaseLLMScorer.md#normalizescore)

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

[`BaseLLMScorer`](BaseLLMScorer.md).[`denormalizeScore`](BaseLLMScorer.md#denormalizescore)

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

[`BaseLLMScorer`](BaseLLMScorer.md).[`checkThreshold`](BaseLLMScorer.md#checkthreshold)

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

[`BaseLLMScorer`](BaseLLMScorer.md).[`createScoreResult`](BaseLLMScorer.md#createscoreresult)

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

[`BaseLLMScorer`](BaseLLMScorer.md).[`createErrorResult`](BaseLLMScorer.md#createerrorresult)

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

[`BaseLLMScorer`](BaseLLMScorer.md).[`executeWithTiming`](BaseLLMScorer.md#executewithtiming)

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

[`BaseLLMScorer`](BaseLLMScorer.md).[`executeWithTimeout`](BaseLLMScorer.md#executewithtimeout)

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

[`BaseLLMScorer`](BaseLLMScorer.md).[`executeWithRetry`](BaseLLMScorer.md#executewithretry)

---

### score()

> **score**(`input`): `Promise`\<[`ScoreResult`](../type-aliases/ScoreResult.md)\>

Main scoring method

#### Parameters

##### input

[`ScorerInput`](../type-aliases/ScorerInput.md)

#### Returns

`Promise`\<[`ScoreResult`](../type-aliases/ScoreResult.md)\>

#### Inherited from

[`BaseLLMScorer`](BaseLLMScorer.md).[`score`](BaseLLMScorer.md#score)

---

### initializeProvider()

> `protected` **initializeProvider**(): `Promise`\<`void`\>

Initialize the AI provider

#### Returns

`Promise`\<`void`\>

#### Inherited from

[`BaseLLMScorer`](BaseLLMScorer.md).[`initializeProvider`](BaseLLMScorer.md#initializeprovider)

---

### callLLM()

> `protected` **callLLM**(`prompt`): `Promise`\<`string`\>

Call the LLM with the given prompt

#### Parameters

##### prompt

`string`

#### Returns

`Promise`\<`string`\>

#### Inherited from

[`BaseLLMScorer`](BaseLLMScorer.md).[`callLLM`](BaseLLMScorer.md#callllm)

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

#### Inherited from

[`BaseLLMScorer`](BaseLLMScorer.md).[`extractJSON`](BaseLLMScorer.md#extractjson)

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

#### Inherited from

[`BaseLLMScorer`](BaseLLMScorer.md).[`substituteTemplate`](BaseLLMScorer.md#substitutetemplate)

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

#### Inherited from

[`BaseLLMScorer`](BaseLLMScorer.md).[`processConditionals`](BaseLLMScorer.md#processconditionals)

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

#### Inherited from

[`BaseLLMScorer`](BaseLLMScorer.md).[`extractNumericScore`](BaseLLMScorer.md#extractnumericscore)

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

#### Inherited from

[`BaseLLMScorer`](BaseLLMScorer.md).[`extractScoreFromText`](BaseLLMScorer.md#extractscorefromtext)

---

### generatePrompt()

> **generatePrompt**(`input`): `string`

Generate the prompt for LLM scoring - must be implemented by subclasses

#### Parameters

##### input

[`ScorerInput`](../type-aliases/ScorerInput.md)

#### Returns

`string`

#### Overrides

[`BaseLLMScorer`](BaseLLMScorer.md).[`generatePrompt`](BaseLLMScorer.md#generateprompt)

---

### parseResponse()

> **parseResponse**(`response`, `_input`): `Partial`\<[`ScoreResult`](../type-aliases/ScoreResult.md)\>

Parse LLM response into score result - must be implemented by subclasses

#### Parameters

##### response

`string`

##### \_input

[`ScorerInput`](../type-aliases/ScorerInput.md)

#### Returns

`Partial`\<[`ScoreResult`](../type-aliases/ScoreResult.md)\>

#### Overrides

[`BaseLLMScorer`](BaseLLMScorer.md).[`parseResponse`](BaseLLMScorer.md#parseresponse)
