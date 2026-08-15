[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / EvaluationStrategyFunction

# Type Alias: EvaluationStrategyFunction

> **EvaluationStrategyFunction** = (`options`, `result`, `config?`) => `Promise`\<\{ `evaluationResult`: [`EvaluationResult`](EvaluationResult.md); `evalContext`: [`EnhancedEvaluationContext`](EnhancedEvaluationContext.md); \}\>

Defined in: [types/evaluation.ts:570](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/evaluation.ts#L570)

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
