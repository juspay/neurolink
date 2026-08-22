[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / createContextRelevancyScorer

# Function: createContextRelevancyScorer()

> **createContextRelevancyScorer**(`config?`): `Promise`\<[`ContextRelevancyScorer`](../classes/ContextRelevancyScorer.md)\>

Defined in: [evaluation/scorers/llm/contextRelevancyScorer.ts:130](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/evaluation/scorers/llm/contextRelevancyScorer.ts#L130)

Evaluation System Exports

A comprehensive evaluation framework for assessing AI response quality,
with support for RAGAS-style metrics, custom scorers, and pipeline-based evaluation.

## Parameters

### config?

`Partial`\<[`LLMScorerConfig`](../type-aliases/LLMScorerConfig.md)\>

## Returns

`Promise`\<[`ContextRelevancyScorer`](../classes/ContextRelevancyScorer.md)\>

## Example

```typescript
import {
  Evaluator,
  ScorerRegistry,
  EvaluationPipeline,
  createFaithfulnessScorer,
  createAnswerRelevancyScorer,
} from "@juspay/neurolink";

// Create a pipeline with multiple scorers
const pipeline = new EvaluationPipeline({
  scorers: [
    createFaithfulnessScorer({ model: "gpt-4" }),
    createAnswerRelevancyScorer({ model: "gpt-4" }),
  ],
});

// Run evaluation
const result = await pipeline.evaluate({
  question: "What is quantum computing?",
  answer: "Quantum computing uses quantum mechanics...",
  context: ["Quantum computing is a type of computation..."],
});
```
