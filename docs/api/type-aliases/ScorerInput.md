[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / ScorerInput

# Type Alias: ScorerInput

> **ScorerInput** = `object`

Defined in: [types/scorer.ts:119](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/scorer.ts#L119)

Input context for scorer execution

## Properties

### query

> **query**: `string`

Defined in: [types/scorer.ts:121](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/scorer.ts#L121)

The user's original query/prompt

---

### response

> **response**: `string`

Defined in: [types/scorer.ts:123](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/scorer.ts#L123)

The AI-generated response to evaluate

---

### context?

> `optional` **context?**: `string`[]

Defined in: [types/scorer.ts:125](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/scorer.ts#L125)

Retrieved context (for RAG evaluations)

---

### groundTruth?

> `optional` **groundTruth?**: `string`

Defined in: [types/scorer.ts:127](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/scorer.ts#L127)

Ground truth/expected answer (for accuracy checks)

---

### generationResult?

> `optional` **generationResult?**: [`GenerateResult`](GenerateResult.md)

Defined in: [types/scorer.ts:129](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/scorer.ts#L129)

Full generation result with metadata

---

### evaluationContext?

> `optional` **evaluationContext?**: [`EnhancedEvaluationContext`](EnhancedEvaluationContext.md)

Defined in: [types/scorer.ts:131](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/scorer.ts#L131)

Enhanced evaluation context

---

### conversationHistory?

> `optional` **conversationHistory?**: `object`[]

Defined in: [types/scorer.ts:133](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/scorer.ts#L133)

Conversation history for multi-turn evaluation

#### role

> **role**: `string`

#### content

> **content**: `string`

---

### custom?

> `optional` **custom?**: [`JsonObject`](JsonObject.md)

Defined in: [types/scorer.ts:135](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/scorer.ts#L135)

Custom input data for specific scorers
