[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / ClientLanguageModelResponse

# Type Alias: ClientLanguageModelResponse

> **ClientLanguageModelResponse** = `object`

Defined in: [types/client.ts:877](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/client.ts#L877)

Language model response

## Properties

### text

> **text**: `string`

Defined in: [types/client.ts:879](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/client.ts#L879)

Generated text

---

### finishReason

> **finishReason**: `"stop"` \| `"length"` \| `"tool-calls"` \| `"content-filter"` \| `"error"` \| `"other"`

Defined in: [types/client.ts:881](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/client.ts#L881)

Finish reason

---

### usage

> **usage**: `object`

Defined in: [types/client.ts:889](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/client.ts#L889)

Usage information

#### promptTokens

> **promptTokens**: `number`

#### completionTokens

> **completionTokens**: `number`

---

### rawResponse?

> `optional` **rawResponse?**: `unknown`

Defined in: [types/client.ts:894](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/client.ts#L894)

Raw response
