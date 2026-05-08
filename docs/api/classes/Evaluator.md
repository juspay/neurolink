[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / Evaluator

# Class: Evaluator

Defined in: [evaluation/index.ts:48](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/evaluation/index.ts#L48)

A centralized class for performing response evaluations. It supports different
evaluation strategies, with RAGAS-style model-based evaluation as the default.
This class orchestrates the context building and evaluation process.

## Constructors

### Constructor

> **new Evaluator**(`config?`): `Evaluator`

Defined in: [evaluation/index.ts:53](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/evaluation/index.ts#L53)

#### Parameters

##### config?

[`EvaluationConfig`](../type-aliases/EvaluationConfig.md) = `{}`

#### Returns

`Evaluator`

## Methods

### evaluate()

> **evaluate**(`options`, `result`, `threshold`, `config`): `Promise`\<[`EvaluationData`](../type-aliases/EvaluationData.md)\>

Defined in: [evaluation/index.ts:72](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/evaluation/index.ts#L72)

The main entry point for performing an evaluation. It selects the evaluation
strategy based on the configuration and executes it.

#### Parameters

##### options

`LanguageModelV3CallOptions`

The original `TextGenerationOptions` from the user request.

##### result

[`GenerateResult`](../type-aliases/GenerateResult.md)

The `GenerateResult` from the provider.

##### threshold

`number`

##### config

[`AutoEvaluationConfig`](../type-aliases/AutoEvaluationConfig.md)

#### Returns

`Promise`\<[`EvaluationData`](../type-aliases/EvaluationData.md)\>

A promise that resolves to the `EvaluationResult`.
