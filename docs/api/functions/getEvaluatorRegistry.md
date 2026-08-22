[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / getEvaluatorRegistry

# Function: getEvaluatorRegistry()

> **getEvaluatorRegistry**(): `EvaluatorRegistry`

Defined in: [evaluation/EvaluatorRegistry.ts:245](https://github.com/juspay/neurolink/blob/release/src/lib/evaluation/EvaluatorRegistry.ts#L245)

Evaluation System Exports

A comprehensive evaluation framework for assessing AI response quality,
with support for RAGAS-style metrics, custom scorers, and pipeline-based evaluation.

## Returns

`EvaluatorRegistry`

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
