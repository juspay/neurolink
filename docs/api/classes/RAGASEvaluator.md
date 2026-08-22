[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / RAGASEvaluator

# Class: RAGASEvaluator

Defined in: [evaluation/ragasEvaluator.ts:22](https://github.com/juspay/neurolink/blob/release/src/lib/evaluation/ragasEvaluator.ts#L22)

Implements a RAGAS-style evaluator that uses a "judge" LLM to score the
quality of an AI response based on rich, contextual information.

## Constructors

### Constructor

> **new RAGASEvaluator**(`evaluationModel?`, `providerName?`, `threshold?`, `promptGenerator?`): `RAGASEvaluator`

Defined in: [evaluation/ragasEvaluator.ts:29](https://github.com/juspay/neurolink/blob/release/src/lib/evaluation/ragasEvaluator.ts#L29)

#### Parameters

##### evaluationModel?

`string`

##### providerName?

`string`

##### threshold?

`number`

##### promptGenerator?

[`GetPromptFunction`](../type-aliases/GetPromptFunction.md)

#### Returns

`RAGASEvaluator`

## Methods

### evaluate()

> **evaluate**(`context`): `Promise`\<[`EvaluationResult`](../type-aliases/EvaluationResult.md)\>

Defined in: [evaluation/ragasEvaluator.ts:55](https://github.com/juspay/neurolink/blob/release/src/lib/evaluation/ragasEvaluator.ts#L55)

Evaluates an AI-generated response using a model-based approach.

#### Parameters

##### context

[`EnhancedEvaluationContext`](../type-aliases/EnhancedEvaluationContext.md)

The rich, contextual information for the evaluation.

#### Returns

`Promise`\<[`EvaluationResult`](../type-aliases/EvaluationResult.md)\>

A promise that resolves to a detailed `EvaluationResult`.
