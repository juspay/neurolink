[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / getEvaluatorFactory

# Function: getEvaluatorFactory()

> **getEvaluatorFactory**(): [`EvaluatorFactory`](../classes/EvaluatorFactory.md)

Defined in: [evaluation/EvaluatorFactory.ts:373](https://github.com/juspay/neurolink/blob/release/src/lib/evaluation/EvaluatorFactory.ts#L373)

Evaluation System Exports

A comprehensive evaluation framework for assessing AI response quality,
with support for RAGAS-style metrics, custom scorers, and pipeline-based evaluation.

## Returns

[`EvaluatorFactory`](../classes/EvaluatorFactory.md)

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
