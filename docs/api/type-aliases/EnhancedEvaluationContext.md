[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / EnhancedEvaluationContext

# Type Alias: EnhancedEvaluationContext

> **EnhancedEvaluationContext** = `object`

Defined in: [types/evaluation.ts:198](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/evaluation.ts#L198)

Contains all the rich context needed for a thorough, RAGAS-style evaluation.
This object is constructed by the `ContextBuilder` and used by the `RAGASEvaluator`.

## Properties

### userQuery

> **userQuery**: `string`

Defined in: [types/evaluation.ts:200](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/evaluation.ts#L200)

The original user query.

---

### queryAnalysis

> **queryAnalysis**: [`QueryIntentAnalysis`](QueryIntentAnalysis.md)

Defined in: [types/evaluation.ts:202](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/evaluation.ts#L202)

An analysis of the user's query intent.

---

### aiResponse

> **aiResponse**: `string`

Defined in: [types/evaluation.ts:205](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/evaluation.ts#L205)

The AI's response that is being evaluated.

---

### provider

> **provider**: `string`

Defined in: [types/evaluation.ts:207](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/evaluation.ts#L207)

The AI provider that generated the response.

---

### model

> **model**: `string`

Defined in: [types/evaluation.ts:209](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/evaluation.ts#L209)

The specific model that generated the response.

---

### generationParams

> **generationParams**: `object`

Defined in: [types/evaluation.ts:212](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/evaluation.ts#L212)

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

Defined in: [types/evaluation.ts:219](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/evaluation.ts#L219)

A list of tools that were executed.

---

### conversationHistory

> **conversationHistory**: [`EnhancedConversationTurn`](EnhancedConversationTurn.md)[]

Defined in: [types/evaluation.ts:222](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/evaluation.ts#L222)

The history of the conversation leading up to this turn.

---

### responseTime

> **responseTime**: `number`

Defined in: [types/evaluation.ts:225](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/evaluation.ts#L225)

The response time of the AI in milliseconds.

---

### tokenUsage

> **tokenUsage**: [`TokenUsage`](TokenUsage.md)

Defined in: [types/evaluation.ts:227](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/evaluation.ts#L227)

The token usage for the generation.

---

### previousEvaluations?

> `optional` **previousEvaluations?**: [`EvaluationResult`](EvaluationResult.md)[]

Defined in: [types/evaluation.ts:230](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/evaluation.ts#L230)

The results of any previous evaluation attempts for this response.

---

### attemptNumber

> **attemptNumber**: `number`

Defined in: [types/evaluation.ts:232](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/evaluation.ts#L232)

The current attempt number for this evaluation (1-based).
