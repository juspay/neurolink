[**NeuroLink API Reference v8.32.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / EvaluationData

# Type Alias: EvaluationData

> **EvaluationData** = `object`

Defined in: [types/evaluation.ts:29](https://github.com/juspay/neurolink/blob/e2ee0ff27847312a233f21617e325b3d2c69c76c/src/lib/types/evaluation.ts#L29)

Response quality evaluation scores - Comprehensive evaluation type

## Properties

### relevance

> **relevance**: `number`

Defined in: [types/evaluation.ts:31](https://github.com/juspay/neurolink/blob/e2ee0ff27847312a233f21617e325b3d2c69c76c/src/lib/types/evaluation.ts#L31)

---

### accuracy

> **accuracy**: `number`

Defined in: [types/evaluation.ts:32](https://github.com/juspay/neurolink/blob/e2ee0ff27847312a233f21617e325b3d2c69c76c/src/lib/types/evaluation.ts#L32)

---

### completeness

> **completeness**: `number`

Defined in: [types/evaluation.ts:33](https://github.com/juspay/neurolink/blob/e2ee0ff27847312a233f21617e325b3d2c69c76c/src/lib/types/evaluation.ts#L33)

---

### overall

> **overall**: `number`

Defined in: [types/evaluation.ts:34](https://github.com/juspay/neurolink/blob/e2ee0ff27847312a233f21617e325b3d2c69c76c/src/lib/types/evaluation.ts#L34)

---

### domainAlignment?

> `optional` **domainAlignment**: `number`

Defined in: [types/evaluation.ts:35](https://github.com/juspay/neurolink/blob/e2ee0ff27847312a233f21617e325b3d2c69c76c/src/lib/types/evaluation.ts#L35)

---

### terminologyAccuracy?

> `optional` **terminologyAccuracy**: `number`

Defined in: [types/evaluation.ts:36](https://github.com/juspay/neurolink/blob/e2ee0ff27847312a233f21617e325b3d2c69c76c/src/lib/types/evaluation.ts#L36)

---

### toolEffectiveness?

> `optional` **toolEffectiveness**: `number`

Defined in: [types/evaluation.ts:37](https://github.com/juspay/neurolink/blob/e2ee0ff27847312a233f21617e325b3d2c69c76c/src/lib/types/evaluation.ts#L37)

---

### responseContent?

> `optional` **responseContent**: `string`

Defined in: [types/evaluation.ts:40](https://github.com/juspay/neurolink/blob/e2ee0ff27847312a233f21617e325b3d2c69c76c/src/lib/types/evaluation.ts#L40)

---

### queryContent?

> `optional` **queryContent**: `string`

Defined in: [types/evaluation.ts:41](https://github.com/juspay/neurolink/blob/e2ee0ff27847312a233f21617e325b3d2c69c76c/src/lib/types/evaluation.ts#L41)

---

### isOffTopic

> **isOffTopic**: `boolean`

Defined in: [types/evaluation.ts:44](https://github.com/juspay/neurolink/blob/e2ee0ff27847312a233f21617e325b3d2c69c76c/src/lib/types/evaluation.ts#L44)

---

### alertSeverity

> **alertSeverity**: `AlertSeverity`

Defined in: [types/evaluation.ts:45](https://github.com/juspay/neurolink/blob/e2ee0ff27847312a233f21617e325b3d2c69c76c/src/lib/types/evaluation.ts#L45)

---

### reasoning

> **reasoning**: `string`

Defined in: [types/evaluation.ts:46](https://github.com/juspay/neurolink/blob/e2ee0ff27847312a233f21617e325b3d2c69c76c/src/lib/types/evaluation.ts#L46)

---

### suggestedImprovements?

> `optional` **suggestedImprovements**: `string`

Defined in: [types/evaluation.ts:47](https://github.com/juspay/neurolink/blob/e2ee0ff27847312a233f21617e325b3d2c69c76c/src/lib/types/evaluation.ts#L47)

---

### evaluationModel

> **evaluationModel**: `string`

Defined in: [types/evaluation.ts:50](https://github.com/juspay/neurolink/blob/e2ee0ff27847312a233f21617e325b3d2c69c76c/src/lib/types/evaluation.ts#L50)

---

### evaluationTime

> **evaluationTime**: `number`

Defined in: [types/evaluation.ts:51](https://github.com/juspay/neurolink/blob/e2ee0ff27847312a233f21617e325b3d2c69c76c/src/lib/types/evaluation.ts#L51)

---

### evaluationDomain?

> `optional` **evaluationDomain**: `string`

Defined in: [types/evaluation.ts:52](https://github.com/juspay/neurolink/blob/e2ee0ff27847312a233f21617e325b3d2c69c76c/src/lib/types/evaluation.ts#L52)

---

### evaluationProvider?

> `optional` **evaluationProvider**: `string`

Defined in: [types/evaluation.ts:55](https://github.com/juspay/neurolink/blob/e2ee0ff27847312a233f21617e325b3d2c69c76c/src/lib/types/evaluation.ts#L55)

---

### evaluationAttempt?

> `optional` **evaluationAttempt**: `number`

Defined in: [types/evaluation.ts:56](https://github.com/juspay/neurolink/blob/e2ee0ff27847312a233f21617e325b3d2c69c76c/src/lib/types/evaluation.ts#L56)

---

### evaluationConfig?

> `optional` **evaluationConfig**: `object`

Defined in: [types/evaluation.ts:57](https://github.com/juspay/neurolink/blob/e2ee0ff27847312a233f21617e325b3d2c69c76c/src/lib/types/evaluation.ts#L57)

#### mode

> **mode**: `string`

#### fallbackUsed

> **fallbackUsed**: `boolean`

#### costEstimate

> **costEstimate**: `number`

---

### domainConfig?

> `optional` **domainConfig**: `object`

Defined in: [types/evaluation.ts:64](https://github.com/juspay/neurolink/blob/e2ee0ff27847312a233f21617e325b3d2c69c76c/src/lib/types/evaluation.ts#L64)

#### domainName

> **domainName**: `string`

#### domainDescription

> **domainDescription**: `string`

#### keyTerms

> **keyTerms**: `string`[]

#### failurePatterns

> **failurePatterns**: `string`[]

#### successPatterns

> **successPatterns**: `string`[]

#### evaluationCriteria?

> `optional` **evaluationCriteria**: `Record`\<`string`, `unknown`\>

---

### domainEvaluation?

> `optional` **domainEvaluation**: `object`

Defined in: [types/evaluation.ts:74](https://github.com/juspay/neurolink/blob/e2ee0ff27847312a233f21617e325b3d2c69c76c/src/lib/types/evaluation.ts#L74)

#### domainRelevance

> **domainRelevance**: `number`

#### terminologyAccuracy

> **terminologyAccuracy**: `number`

#### domainExpertise

> **domainExpertise**: `number`

#### domainSpecificInsights

> **domainSpecificInsights**: `string`[]
