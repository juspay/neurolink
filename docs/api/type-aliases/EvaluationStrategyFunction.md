[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / EvaluationStrategyFunction

# Type Alias: EvaluationStrategyFunction

> **EvaluationStrategyFunction** = (`options`, `result`, `config?`) => `Promise`\<\{ `evaluationResult`: [`EvaluationResult`](EvaluationResult.md); `evalContext`: [`EnhancedEvaluationContext`](EnhancedEvaluationContext.md); \}\>

Defined in: [types/evaluation.ts:570](https://github.com/juspay/neurolink/blob/release/src/lib/types/evaluation.ts#L570)

Function that performs evaluation and returns results.

## Parameters

### options

[`LanguageModelV3CallOptions`](LanguageModelV3CallOptions.md)

### result

[`GenerateResult`](GenerateResult.md)

### config?

[`EvaluationStrategyConfig`](EvaluationStrategyConfig.md)

## Returns

`Promise`\<\{ `evaluationResult`: [`EvaluationResult`](EvaluationResult.md); `evalContext`: [`EnhancedEvaluationContext`](EnhancedEvaluationContext.md); \}\>
