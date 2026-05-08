[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / EvaluationStrategyFunction

# Type Alias: EvaluationStrategyFunction

> **EvaluationStrategyFunction** = (`options`, `result`, `config?`) => `Promise`\<\{ `evaluationResult`: [`EvaluationResult`](EvaluationResult.md); `evalContext`: [`EnhancedEvaluationContext`](EnhancedEvaluationContext.md); \}\>

Defined in: [types/evaluation.ts:575](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/evaluation.ts#L575)

Function that performs evaluation and returns results.

## Parameters

### options

`LanguageModelV3CallOptions`

### result

[`GenerateResult`](GenerateResult.md)

### config?

[`EvaluationStrategyConfig`](EvaluationStrategyConfig.md)

## Returns

`Promise`\<\{ `evaluationResult`: [`EvaluationResult`](EvaluationResult.md); `evalContext`: [`EnhancedEvaluationContext`](EnhancedEvaluationContext.md); \}\>
