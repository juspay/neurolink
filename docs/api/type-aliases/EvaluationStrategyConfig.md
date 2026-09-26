[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / EvaluationStrategyConfig

# Type Alias: EvaluationStrategyConfig

> **EvaluationStrategyConfig** = `object`

Configuration for evaluation strategies.

## Properties

### evaluationModel?

> `optional` **evaluationModel?**: `string`

---

### provider?

> `optional` **provider?**: `string`

---

### threshold?

> `optional` **threshold?**: `number`

---

### promptGenerator?

> `optional` **promptGenerator?**: (`context`) => `string`

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
