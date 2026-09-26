[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / EvaluationData

# Type Alias: EvaluationData

> **EvaluationData** = `object`

Response quality evaluation scores - Comprehensive evaluation type

## Properties

### relevance

> **relevance**: `number`

---

### accuracy

> **accuracy**: `number`

---

### completeness

> **completeness**: `number`

---

### overall

> **overall**: `number`

---

### domainAlignment?

> `optional` **domainAlignment?**: `number`

---

### terminologyAccuracy?

> `optional` **terminologyAccuracy?**: `number`

---

### toolEffectiveness?

> `optional` **toolEffectiveness?**: `number`

---

### responseContent?

> `optional` **responseContent?**: `string`

---

### queryContent?

> `optional` **queryContent?**: `string`

---

### isOffTopic

> **isOffTopic**: `boolean`

---

### alertSeverity

> **alertSeverity**: [`AlertSeverity`](AlertSeverity.md)

---

### reasoning

> **reasoning**: `string`

---

### suggestedImprovements?

> `optional` **suggestedImprovements?**: `string`

---

### evaluationModel

> **evaluationModel**: `string`

---

### evaluationTime

> **evaluationTime**: `number`

---

### evaluationDomain?

> `optional` **evaluationDomain?**: `string`

---

### evaluationProvider?

> `optional` **evaluationProvider?**: `string`

---

### evaluationAttempt?

> `optional` **evaluationAttempt?**: `number`

---

### evaluationConfig?

> `optional` **evaluationConfig?**: `object`

#### mode

> **mode**: `string`

#### fallbackUsed

> **fallbackUsed**: `boolean`

#### costEstimate

> **costEstimate**: `number`

---

### domainConfig?

> `optional` **domainConfig?**: `object`

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

#### domainRelevance

> **domainRelevance**: `number`

#### terminologyAccuracy

> **terminologyAccuracy**: `number`

#### domainExpertise

> **domainExpertise**: `number`

#### domainSpecificInsights

> **domainSpecificInsights**: `string`[]
