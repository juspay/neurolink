[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / EvaluationData

# Type Alias: EvaluationData

> **EvaluationData** = `object`

Defined in: [types/evaluation.ts:44](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/evaluation.ts#L44)

Response quality evaluation scores - Comprehensive evaluation type

## Properties

### relevance

> **relevance**: `number`

Defined in: [types/evaluation.ts:46](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/evaluation.ts#L46)

---

### accuracy

> **accuracy**: `number`

Defined in: [types/evaluation.ts:47](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/evaluation.ts#L47)

---

### completeness

> **completeness**: `number`

Defined in: [types/evaluation.ts:48](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/evaluation.ts#L48)

---

### overall

> **overall**: `number`

Defined in: [types/evaluation.ts:49](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/evaluation.ts#L49)

---

### domainAlignment?

> `optional` **domainAlignment?**: `number`

Defined in: [types/evaluation.ts:50](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/evaluation.ts#L50)

---

### terminologyAccuracy?

> `optional` **terminologyAccuracy?**: `number`

Defined in: [types/evaluation.ts:51](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/evaluation.ts#L51)

---

### toolEffectiveness?

> `optional` **toolEffectiveness?**: `number`

Defined in: [types/evaluation.ts:52](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/evaluation.ts#L52)

---

### responseContent?

> `optional` **responseContent?**: `string`

Defined in: [types/evaluation.ts:55](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/evaluation.ts#L55)

---

### queryContent?

> `optional` **queryContent?**: `string`

Defined in: [types/evaluation.ts:56](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/evaluation.ts#L56)

---

### isOffTopic

> **isOffTopic**: `boolean`

Defined in: [types/evaluation.ts:59](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/evaluation.ts#L59)

---

### alertSeverity

> **alertSeverity**: [`AlertSeverity`](AlertSeverity.md)

Defined in: [types/evaluation.ts:60](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/evaluation.ts#L60)

---

### reasoning

> **reasoning**: `string`

Defined in: [types/evaluation.ts:61](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/evaluation.ts#L61)

---

### suggestedImprovements?

> `optional` **suggestedImprovements?**: `string`

Defined in: [types/evaluation.ts:62](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/evaluation.ts#L62)

---

### evaluationModel

> **evaluationModel**: `string`

Defined in: [types/evaluation.ts:65](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/evaluation.ts#L65)

---

### evaluationTime

> **evaluationTime**: `number`

Defined in: [types/evaluation.ts:66](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/evaluation.ts#L66)

---

### evaluationDomain?

> `optional` **evaluationDomain?**: `string`

Defined in: [types/evaluation.ts:67](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/evaluation.ts#L67)

---

### evaluationProvider?

> `optional` **evaluationProvider?**: `string`

Defined in: [types/evaluation.ts:70](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/evaluation.ts#L70)

---

### evaluationAttempt?

> `optional` **evaluationAttempt?**: `number`

Defined in: [types/evaluation.ts:71](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/evaluation.ts#L71)

---

### evaluationConfig?

> `optional` **evaluationConfig?**: `object`

Defined in: [types/evaluation.ts:72](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/evaluation.ts#L72)

#### mode

> **mode**: `string`

#### fallbackUsed

> **fallbackUsed**: `boolean`

#### costEstimate

> **costEstimate**: `number`

---

### domainConfig?

> `optional` **domainConfig?**: `object`

Defined in: [types/evaluation.ts:79](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/evaluation.ts#L79)

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

> `optional` **evaluationCriteria?**: `Record`\<`string`, `unknown`\>

---

### domainEvaluation?

> `optional` **domainEvaluation?**: `object`

Defined in: [types/evaluation.ts:89](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/evaluation.ts#L89)

#### domainRelevance

> **domainRelevance**: `number`

#### terminologyAccuracy

> **terminologyAccuracy**: `number`

#### domainExpertise

> **domainExpertise**: `number`

#### domainSpecificInsights

> **domainSpecificInsights**: `string`[]
