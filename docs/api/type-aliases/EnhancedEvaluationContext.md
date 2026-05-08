[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / EnhancedEvaluationContext

# Type Alias: EnhancedEvaluationContext

> **EnhancedEvaluationContext** = `object`

Defined in: [types/evaluation.ts:203](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/evaluation.ts#L203)

Contains all the rich context needed for a thorough, RAGAS-style evaluation.
This object is constructed by the `ContextBuilder` and used by the `RAGASEvaluator`.

## Properties

### userQuery

> **userQuery**: `string`

Defined in: [types/evaluation.ts:205](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/evaluation.ts#L205)

The original user query.

---

### queryAnalysis

> **queryAnalysis**: [`QueryIntentAnalysis`](QueryIntentAnalysis.md)

Defined in: [types/evaluation.ts:207](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/evaluation.ts#L207)

An analysis of the user's query intent.

---

### aiResponse

> **aiResponse**: `string`

Defined in: [types/evaluation.ts:210](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/evaluation.ts#L210)

The AI's response that is being evaluated.

---

### provider

> **provider**: `string`

Defined in: [types/evaluation.ts:212](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/evaluation.ts#L212)

The AI provider that generated the response.

---

### model

> **model**: `string`

Defined in: [types/evaluation.ts:214](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/evaluation.ts#L214)

The specific model that generated the response.

---

### generationParams

> **generationParams**: `object`

Defined in: [types/evaluation.ts:217](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/evaluation.ts#L217)

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

Defined in: [types/evaluation.ts:224](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/evaluation.ts#L224)

A list of tools that were executed.

---

### conversationHistory

> **conversationHistory**: [`EnhancedConversationTurn`](EnhancedConversationTurn.md)[]

Defined in: [types/evaluation.ts:227](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/evaluation.ts#L227)

The history of the conversation leading up to this turn.

---

### responseTime

> **responseTime**: `number`

Defined in: [types/evaluation.ts:230](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/evaluation.ts#L230)

The response time of the AI in milliseconds.

---

### tokenUsage

> **tokenUsage**: [`TokenUsage`](TokenUsage.md)

Defined in: [types/evaluation.ts:232](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/evaluation.ts#L232)

The token usage for the generation.

---

### previousEvaluations?

> `optional` **previousEvaluations?**: [`EvaluationResult`](EvaluationResult.md)[]

Defined in: [types/evaluation.ts:235](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/evaluation.ts#L235)

The results of any previous evaluation attempts for this response.

---

### attemptNumber

> **attemptNumber**: `number`

Defined in: [types/evaluation.ts:237](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/evaluation.ts#L237)

The current attempt number for this evaluation (1-based).
