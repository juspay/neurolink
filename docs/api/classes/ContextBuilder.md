[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / ContextBuilder

# Class: ContextBuilder

Defined in: [evaluation/contextBuilder.ts:27](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/evaluation/contextBuilder.ts#L27)

Builds the enhanced context required for a RAGAS-style evaluation.
This class gathers data from the generation options and results to create a
rich snapshot of the interaction, which is then used by the evaluator.

## Constructors

### Constructor

> **new ContextBuilder**(): `ContextBuilder`

#### Returns

`ContextBuilder`

## Methods

### buildContext()

> **buildContext**(`options`, `result`): [`EnhancedEvaluationContext`](../type-aliases/EnhancedEvaluationContext.md)

Defined in: [evaluation/contextBuilder.ts:54](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/evaluation/contextBuilder.ts#L54)

Builds the full evaluation context for a single evaluation attempt.

#### Parameters

##### options

`LanguageModelV3CallOptions`

The original `TextGenerationOptions` used for the request.

##### result

[`GenerateResult`](../type-aliases/GenerateResult.md)

The `GenerateResult` from the provider.

#### Returns

[`EnhancedEvaluationContext`](../type-aliases/EnhancedEvaluationContext.md)

An `EnhancedEvaluationContext` object ready for evaluation.

---

### recordEvaluation()

> **recordEvaluation**(`evaluation`): `void`

Defined in: [evaluation/contextBuilder.ts:112](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/evaluation/contextBuilder.ts#L112)

Records the result of an evaluation and increments the internal attempt counter.
This is used to build up the `previousEvaluations` array for subsequent retries.

#### Parameters

##### evaluation

[`EvaluationResult`](../type-aliases/EvaluationResult.md)

The `EvaluationResult` from the last attempt.

#### Returns

`void`

---

### reset()

> **reset**(): `void`

Defined in: [evaluation/contextBuilder.ts:121](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/evaluation/contextBuilder.ts#L121)

Resets the internal state of the context builder. This should be called
before starting a new, independent evaluation sequence.

#### Returns

`void`
