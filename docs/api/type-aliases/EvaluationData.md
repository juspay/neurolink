[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / EvaluationData

# Type Alias: EvaluationData

> **EvaluationData** = `object`

Defined in: [types/evaluation.ts:39](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/evaluation.ts#L39)

Response quality evaluation scores - Comprehensive evaluation type

## Properties

### relevance

> **relevance**: `number`

Defined in: [types/evaluation.ts:41](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/evaluation.ts#L41)

---

### accuracy

> **accuracy**: `number`

Defined in: [types/evaluation.ts:42](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/evaluation.ts#L42)

---

### completeness

> **completeness**: `number`

Defined in: [types/evaluation.ts:43](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/evaluation.ts#L43)

---

### overall

> **overall**: `number`

Defined in: [types/evaluation.ts:44](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/evaluation.ts#L44)

---

### domainAlignment?

> `optional` **domainAlignment?**: `number`

Defined in: [types/evaluation.ts:45](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/evaluation.ts#L45)

---

### terminologyAccuracy?

> `optional` **terminologyAccuracy?**: `number`

Defined in: [types/evaluation.ts:46](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/evaluation.ts#L46)

---

### toolEffectiveness?

> `optional` **toolEffectiveness?**: `number`

Defined in: [types/evaluation.ts:47](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/evaluation.ts#L47)

---

### responseContent?

> `optional` **responseContent?**: `string`

Defined in: [types/evaluation.ts:50](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/evaluation.ts#L50)

---

### queryContent?

> `optional` **queryContent?**: `string`

Defined in: [types/evaluation.ts:51](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/evaluation.ts#L51)

---

### isOffTopic

> **isOffTopic**: `boolean`

Defined in: [types/evaluation.ts:54](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/evaluation.ts#L54)

---

### alertSeverity

> **alertSeverity**: [`AlertSeverity`](AlertSeverity.md)

Defined in: [types/evaluation.ts:55](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/evaluation.ts#L55)

---

### reasoning

> **reasoning**: `string`

Defined in: [types/evaluation.ts:56](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/evaluation.ts#L56)

---

### suggestedImprovements?

> `optional` **suggestedImprovements?**: `string`

Defined in: [types/evaluation.ts:57](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/evaluation.ts#L57)

---

### evaluationModel

> **evaluationModel**: `string`

Defined in: [types/evaluation.ts:60](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/evaluation.ts#L60)

---

### evaluationTime

> **evaluationTime**: `number`

Defined in: [types/evaluation.ts:61](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/evaluation.ts#L61)

---

### evaluationDomain?

> `optional` **evaluationDomain?**: `string`

Defined in: [types/evaluation.ts:62](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/evaluation.ts#L62)

---

### evaluationProvider?

> `optional` **evaluationProvider?**: `string`

Defined in: [types/evaluation.ts:65](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/evaluation.ts#L65)

---

### evaluationAttempt?

> `optional` **evaluationAttempt?**: `number`

Defined in: [types/evaluation.ts:66](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/evaluation.ts#L66)

---

### evaluationConfig?

> `optional` **evaluationConfig?**: `object`

Defined in: [types/evaluation.ts:67](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/evaluation.ts#L67)

#### mode

> **mode**: `string`

#### fallbackUsed

> **fallbackUsed**: `boolean`

#### costEstimate

> **costEstimate**: `number`

---

### domainConfig?

> `optional` **domainConfig?**: `object`

Defined in: [types/evaluation.ts:74](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/evaluation.ts#L74)

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

Defined in: [types/evaluation.ts:84](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/evaluation.ts#L84)

#### domainRelevance

> **domainRelevance**: `number`

#### terminologyAccuracy

> **terminologyAccuracy**: `number`

#### domainExpertise

> **domainExpertise**: `number`

#### domainSpecificInsights

> **domainSpecificInsights**: `string`[]
