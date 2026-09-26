[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / EvaluationStrategyFunction

# Type Alias: EvaluationStrategyFunction

> **EvaluationStrategyFunction** = (`options`, `result`, `config?`) => `Promise`\<\{ `evaluationResult`: [`EvaluationResult`](EvaluationResult.md); `evalContext`: [`EnhancedEvaluationContext`](EnhancedEvaluationContext.md); \}\>

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
