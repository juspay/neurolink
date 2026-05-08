[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / ScorerInput

# Type Alias: ScorerInput

> **ScorerInput** = `object`

Defined in: [types/scorer.ts:119](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/scorer.ts#L119)

Input context for scorer execution

## Properties

### query

> **query**: `string`

Defined in: [types/scorer.ts:121](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/scorer.ts#L121)

The user's original query/prompt

---

### response

> **response**: `string`

Defined in: [types/scorer.ts:123](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/scorer.ts#L123)

The AI-generated response to evaluate

---

### context?

> `optional` **context?**: `string`[]

Defined in: [types/scorer.ts:125](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/scorer.ts#L125)

Retrieved context (for RAG evaluations)

---

### groundTruth?

> `optional` **groundTruth?**: `string`

Defined in: [types/scorer.ts:127](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/scorer.ts#L127)

Ground truth/expected answer (for accuracy checks)

---

### generationResult?

> `optional` **generationResult?**: [`GenerateResult`](GenerateResult.md)

Defined in: [types/scorer.ts:129](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/scorer.ts#L129)

Full generation result with metadata

---

### evaluationContext?

> `optional` **evaluationContext?**: [`EnhancedEvaluationContext`](EnhancedEvaluationContext.md)

Defined in: [types/scorer.ts:131](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/scorer.ts#L131)

Enhanced evaluation context

---

### conversationHistory?

> `optional` **conversationHistory?**: `object`[]

Defined in: [types/scorer.ts:133](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/scorer.ts#L133)

Conversation history for multi-turn evaluation

#### role

> **role**: `string`

#### content

> **content**: `string`

---

### custom?

> `optional` **custom?**: [`JsonObject`](JsonObject.md)

Defined in: [types/scorer.ts:135](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/scorer.ts#L135)

Custom input data for specific scorers
