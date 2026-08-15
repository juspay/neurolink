[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / EvaluationStrategyConfig

# Type Alias: EvaluationStrategyConfig

> **EvaluationStrategyConfig** = `object`

Defined in: [types/evaluation.ts:555](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/evaluation.ts#L555)

Configuration for evaluation strategies.

## Properties

### evaluationModel?

> `optional` **evaluationModel?**: `string`

Defined in: [types/evaluation.ts:556](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/evaluation.ts#L556)

---

### provider?

> `optional` **provider?**: `string`

Defined in: [types/evaluation.ts:557](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/evaluation.ts#L557)

---

### threshold?

> `optional` **threshold?**: `number`

Defined in: [types/evaluation.ts:558](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/evaluation.ts#L558)

---

### promptGenerator?

> `optional` **promptGenerator?**: (`context`) => `string`

Defined in: [types/evaluation.ts:559](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/evaluation.ts#L559)

#### Parameters

##### context

###### userQuery

`string`

###### history

`string`

###### tools

`string`

###### retryInfo

`string`

###### aiResponse

`string`

#### Returns

`string`

---

### options?

> `optional` **options?**: `Record`\<`string`, `unknown`\>

Defined in: [types/evaluation.ts:566](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/evaluation.ts#L566)
