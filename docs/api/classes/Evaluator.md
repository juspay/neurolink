[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / Evaluator

# Class: Evaluator

Defined in: [evaluation/index.ts:49](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/evaluation/index.ts#L49)

A centralized class for performing response evaluations. It supports different
evaluation strategies, with RAGAS-style model-based evaluation as the default.
This class orchestrates the context building and evaluation process.

## Constructors

### Constructor

> **new Evaluator**(`config?`): `Evaluator`

Defined in: [evaluation/index.ts:54](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/evaluation/index.ts#L54)

#### Parameters

##### config?

[`EvaluationConfig`](../type-aliases/EvaluationConfig.md) = `{}`

#### Returns

`Evaluator`

## Methods

### evaluate()

> **evaluate**(`options`, `result`, `threshold`, `config`): `Promise`\<[`EvaluationData`](../type-aliases/EvaluationData.md)\>

Defined in: [evaluation/index.ts:73](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/evaluation/index.ts#L73)

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
