[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / BaseRuleScorer

# Abstract Class: BaseRuleScorer

Defined in: [evaluation/scorers/rule/baseRuleScorer.ts:33](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/evaluation/scorers/rule/baseRuleScorer.ts#L33)

Abstract base class for rule-based scorers

## Extends

- [`BaseScorer`](BaseScorer.md)

## Implements

- [`RuleScorer`](../type-aliases/RuleScorer.md)

## Constructors

### Constructor

> **new BaseRuleScorer**(`metadata`, `config?`): `BaseRuleScorer`

Defined in: [evaluation/scorers/rule/baseRuleScorer.ts:36](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/evaluation/scorers/rule/baseRuleScorer.ts#L36)

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

Defined in: [evaluation/scorers/baseScorer.ts:43](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/evaluation/scorers/baseScorer.ts#L43)

#### Inherited from

[`BaseScorer`](BaseScorer.md).[`_config`](BaseScorer.md#_config)

---

### \_metadata

> `protected` **\_metadata**: [`ScorerMetadata`](../type-aliases/ScorerMetadata.md)

Defined in: [evaluation/scorers/baseScorer.ts:44](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/evaluation/scorers/baseScorer.ts#L44)

#### Inherited from

[`BaseScorer`](BaseScorer.md).[`_metadata`](BaseScorer.md#_metadata)

---

### \_ruleConfig

> `protected` **\_ruleConfig**: [`RuleScorerConfig`](../type-aliases/RuleScorerConfig.md)

Defined in: [evaluation/scorers/rule/baseRuleScorer.ts:34](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/evaluation/scorers/rule/baseRuleScorer.ts#L34)

## Accessors

### metadata

#### Get Signature

> **get** **metadata**(): [`ScorerMetadata`](../type-aliases/ScorerMetadata.md)

Defined in: [evaluation/scorers/baseScorer.ts:58](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/evaluation/scorers/baseScorer.ts#L58)

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

Defined in: [evaluation/scorers/baseScorer.ts:65](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/evaluation/scorers/baseScorer.ts#L65)

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

Defined in: [evaluation/scorers/rule/baseRuleScorer.ts:48](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/evaluation/scorers/rule/baseRuleScorer.ts#L48)

Get rule-specific configuration

##### Returns

[`RuleScorerConfig`](../type-aliases/RuleScorerConfig.md)

#### Implementation of

`RuleScorer.ruleConfig`

## Methods

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

`RuleScorer.validateInput`

#### Inherited from

[`BaseScorer`](BaseScorer.md).[`validateInput`](BaseScorer.md#validateinput)

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

`RuleScorer.configure`

#### Inherited from

[`BaseScorer`](BaseScorer.md).[`configure`](BaseScorer.md#configure)

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

#### Inherited from

[`BaseScorer`](BaseScorer.md).[`normalizeScore`](BaseScorer.md#normalizescore)

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

#### Inherited from

[`BaseScorer`](BaseScorer.md).[`denormalizeScore`](BaseScorer.md#denormalizescore)

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

#### Inherited from

[`BaseScorer`](BaseScorer.md).[`checkThreshold`](BaseScorer.md#checkthreshold)

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

#### Inherited from

[`BaseScorer`](BaseScorer.md).[`createScoreResult`](BaseScorer.md#createscoreresult)

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

#### Inherited from

[`BaseScorer`](BaseScorer.md).[`createErrorResult`](BaseScorer.md#createerrorresult)

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

#### Inherited from

[`BaseScorer`](BaseScorer.md).[`executeWithTiming`](BaseScorer.md#executewithtiming)

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

#### Inherited from

[`BaseScorer`](BaseScorer.md).[`executeWithTimeout`](BaseScorer.md#executewithtimeout)

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

#### Inherited from

[`BaseScorer`](BaseScorer.md).[`executeWithRetry`](BaseScorer.md#executewithretry)

---

### getRules()

> `abstract` **getRules**(): [`ScorerRule`](../type-aliases/ScorerRule.md)[]

Defined in: [evaluation/scorers/rule/baseRuleScorer.ts:55](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/evaluation/scorers/rule/baseRuleScorer.ts#L55)

Get all rules for this scorer - must be implemented by subclasses

#### Returns

[`ScorerRule`](../type-aliases/ScorerRule.md)[]

#### Implementation of

`RuleScorer.getRules`

---

### evaluateRule()

> `abstract` **evaluateRule**(`rule`, `input`): `object`

Defined in: [evaluation/scorers/rule/baseRuleScorer.ts:60](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/evaluation/scorers/rule/baseRuleScorer.ts#L60)

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

Defined in: [evaluation/scorers/rule/baseRuleScorer.ts:68](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/evaluation/scorers/rule/baseRuleScorer.ts#L68)

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

Defined in: [evaluation/scorers/rule/baseRuleScorer.ts:134](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/evaluation/scorers/rule/baseRuleScorer.ts#L134)

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

Defined in: [evaluation/scorers/rule/baseRuleScorer.ts:181](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/evaluation/scorers/rule/baseRuleScorer.ts#L181)

Generate reasoning from rule results

#### Parameters

##### results

`object`[]

#### Returns

`string`

---

### matchesRegex()

> `protected` **matchesRegex**(`text`, `pattern`, `flags?`): `boolean`

Defined in: [evaluation/scorers/rule/baseRuleScorer.ts:210](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/evaluation/scorers/rule/baseRuleScorer.ts#L210)

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

Defined in: [evaluation/scorers/rule/baseRuleScorer.ts:231](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/evaluation/scorers/rule/baseRuleScorer.ts#L231)

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

Defined in: [evaluation/scorers/rule/baseRuleScorer.ts:245](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/evaluation/scorers/rule/baseRuleScorer.ts#L245)

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

Defined in: [evaluation/scorers/rule/baseRuleScorer.ts:272](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/evaluation/scorers/rule/baseRuleScorer.ts#L272)

Helper: Get word count

#### Parameters

##### text

`string`

#### Returns

`number`

---

### getCharacterCount()

> `protected` **getCharacterCount**(`text`, `includeWhitespace?`): `number`

Defined in: [evaluation/scorers/rule/baseRuleScorer.ts:282](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/evaluation/scorers/rule/baseRuleScorer.ts#L282)

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

Defined in: [evaluation/scorers/rule/baseRuleScorer.ts:292](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/evaluation/scorers/rule/baseRuleScorer.ts#L292)

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
