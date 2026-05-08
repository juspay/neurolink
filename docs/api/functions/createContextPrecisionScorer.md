[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / createContextPrecisionScorer

# Function: createContextPrecisionScorer()

> **createContextPrecisionScorer**(`config?`): `Promise`\<[`ContextPrecisionScorer`](../classes/ContextPrecisionScorer.md)\>

Defined in: [evaluation/scorers/llm/contextPrecisionScorer.ts:115](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/evaluation/scorers/llm/contextPrecisionScorer.ts#L115)

Evaluation System Exports

A comprehensive evaluation framework for assessing AI response quality,
with support for RAGAS-style metrics, custom scorers, and pipeline-based evaluation.

## Parameters

### config?

`Partial`\<[`LLMScorerConfig`](../type-aliases/LLMScorerConfig.md)\>

## Returns

`Promise`\<[`ContextPrecisionScorer`](../classes/ContextPrecisionScorer.md)\>

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
