[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / BaseRuleScorer

# Abstract Class: BaseRuleScorer

Abstract base class for rule-based scorers

## Extends

- [`BaseScorer`](BaseScorer.md)

## Implements

- [`RuleScorer`](../type-aliases/RuleScorer.md)

## Constructors

### Constructor

> **new BaseRuleScorer**(`metadata`, `config?`): `BaseRuleScorer`

#### Parameters

##### metadata

[`ScorerMetadata`](../type-aliases/ScorerMetadata.md)

##### config?

[`RuleScorerConfig`](../type-aliases/RuleScorerConfig.md)

#### Returns

`BaseRuleScorer`

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

### \_ruleConfig

> `protected` **\_ruleConfig**: [`RuleScorerConfig`](../type-aliases/RuleScorerConfig.md)

## Accessors

### metadata

#### Get Signature

> **get** **metadata**(): [`ScorerMetadata`](../type-aliases/ScorerMetadata.md)

Get scorer metadata

##### Returns

[`ScorerMetadata`](../type-aliases/ScorerMetadata.md)

#### Implementation of

`RuleScorer.metadata`

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

`RuleScorer.config`

#### Inherited from

[`BaseScorer`](BaseScorer.md).[`config`](BaseScorer.md#config)

---

### ruleConfig

#### Get Signature

> **get** **ruleConfig**(): [`RuleScorerConfig`](../type-aliases/RuleScorerConfig.md)

Get rule-specific configuration

##### Returns

[`RuleScorerConfig`](../type-aliases/RuleScorerConfig.md)

#### Implementation of

`RuleScorer.ruleConfig`

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

`RuleScorer.validateInput`

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

`RuleScorer.configure`

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

### getRules()

> `abstract` **getRules**(): [`ScorerRule`](../type-aliases/ScorerRule.md)[]

Get all rules for this scorer - must be implemented by subclasses

#### Returns

[`ScorerRule`](../type-aliases/ScorerRule.md)[]

#### Implementation of

`RuleScorer.getRules`

---

### evaluateRule()

> `abstract` **evaluateRule**(`rule`, `input`): `object`

Evaluate a single rule - must be implemented by subclasses

#### Parameters

##### rule

[`ScorerRule`](../type-aliases/ScorerRule.md)

##### input

[`ScorerInput`](../type-aliases/ScorerInput.md)

#### Returns

`object`

##### passed

> **passed**: `boolean`

##### score

> **score**: `number`

#### Implementation of

`RuleScorer.evaluateRule`

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

`RuleScorer.score`

#### Overrides

[`BaseScorer`](BaseScorer.md).[`score`](BaseScorer.md#score)

---

### combineRuleResults()

> `protected` **combineRuleResults**(`results`, `rules`): `number`

Combine rule results based on configuration

#### Parameters

##### results

[`RuleResult`](../type-aliases/RuleResult.md)[]

##### rules

[`ScorerRule`](../type-aliases/ScorerRule.md)[]

#### Returns

`number`

---

### generateReasoning()

> `protected` **generateReasoning**(`results`): `string`

Generate reasoning from rule results

#### Parameters

##### results

`object`[]

#### Returns

`string`

---

### matchesRegex()

> `protected` **matchesRegex**(`text`, `pattern`, `flags?`): `boolean`

Helper: Check if text matches a regex pattern

#### Parameters

##### text

`string`

##### pattern

`string`

##### flags?

`string` = `"gi"`

#### Returns

`boolean`

---

### containsKeyword()

> `protected` **containsKeyword**(`text`, `keyword`, `caseInsensitive?`): `boolean`

Helper: Check if text contains keyword with word boundaries

#### Parameters

##### text

`string`

##### keyword

`string`

##### caseInsensitive?

`boolean` = `true`

#### Returns

`boolean`

---

### countOccurrences()

> `protected` **countOccurrences**(`text`, `pattern`, `caseInsensitive?`): `number`

Helper: Count occurrences of a pattern

#### Parameters

##### text

`string`

##### pattern

`string`

##### caseInsensitive?

`boolean` = `true`

#### Returns

`number`

---

### getWordCount()

> `protected` **getWordCount**(`text`): `number`

Helper: Get word count

#### Parameters

##### text

`string`

#### Returns

`number`

---

### getCharacterCount()

> `protected` **getCharacterCount**(`text`, `includeWhitespace?`): `number`

Helper: Get character count (excluding whitespace)

#### Parameters

##### text

`string`

##### includeWhitespace?

`boolean` = `true`

#### Returns

`number`

---

### isWithinLengthBounds()

> `protected` **isWithinLengthBounds**(`text`, `minWords?`, `maxWords?`, `minChars?`, `maxChars?`): `object`

Helper: Check text length is within bounds

#### Parameters

##### text

`string`

##### minWords?

`number`

##### maxWords?

`number`

##### minChars?

`number`

##### maxChars?

`number`

#### Returns

`object`

##### passed

> **passed**: `boolean`

##### reason

> **reason**: `string`
