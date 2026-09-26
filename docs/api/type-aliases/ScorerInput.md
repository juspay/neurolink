[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ScorerInput

# Type Alias: ScorerInput

> **ScorerInput** = `object`

Input context for scorer execution

## Properties

### query

> **query**: `string`

The user's original query/prompt

---

### response

> **response**: `string`

The AI-generated response to evaluate

---

### context?

> `optional` **context?**: `string`[]

Retrieved context (for RAG evaluations)

---

### groundTruth?

> `optional` **groundTruth?**: `string`

Ground truth/expected answer (for accuracy checks)

---

### generationResult?

> `optional` **generationResult?**: [`GenerateResult`](GenerateResult.md)

Full generation result with metadata

---

### evaluationContext?

> `optional` **evaluationContext?**: [`EnhancedEvaluationContext`](EnhancedEvaluationContext.md)

Enhanced evaluation context

---

### conversationHistory?

> `optional` **conversationHistory?**: `object`[]

Conversation history for multi-turn evaluation

#### role

> **role**: `string`

#### content

> **content**: `string`

---

### custom?

> `optional` **custom?**: [`JsonObject`](JsonObject.md)

Custom input data for specific scorers
