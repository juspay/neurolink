[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / EnhancedEvaluationContext

# Type Alias: EnhancedEvaluationContext

> **EnhancedEvaluationContext** = `object`

Contains all the rich context needed for a thorough, RAGAS-style evaluation.
This object is constructed by the `ContextBuilder` and used by the `RAGASEvaluator`.

## Properties

### userQuery

> **userQuery**: `string`

The original user query.

---

### queryAnalysis

> **queryAnalysis**: [`QueryIntentAnalysis`](QueryIntentAnalysis.md)

An analysis of the user's query intent.

---

### aiResponse

> **aiResponse**: `string`

The AI's response that is being evaluated.

---

### provider

> **provider**: `string`

The AI provider that generated the response.

---

### model

> **model**: `string`

The specific model that generated the response.

---

### generationParams

> **generationParams**: `object`

The parameters used for the generation call.

#### temperature?

> `optional` **temperature?**: `number`

#### maxTokens?

> `optional` **maxTokens?**: `number`

#### systemPrompt?

> `optional` **systemPrompt?**: `string`

---

### toolExecutions

> **toolExecutions**: [`ToolExecution`](ToolExecution.md)[]

A list of tools that were executed.

---

### conversationHistory

> **conversationHistory**: [`EnhancedConversationTurn`](EnhancedConversationTurn.md)[]

The history of the conversation leading up to this turn.

---

### responseTime

> **responseTime**: `number`

The response time of the AI in milliseconds.

---

### tokenUsage

> **tokenUsage**: [`TokenUsage`](TokenUsage.md)

The token usage for the generation.

---

### previousEvaluations?

> `optional` **previousEvaluations?**: [`EvaluationResult`](EvaluationResult.md)[]

The results of any previous evaluation attempts for this response.

---

### attemptNumber

> **attemptNumber**: `number`

The current attempt number for this evaluation (1-based).
