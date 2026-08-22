[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / ClientLanguageModelResponse

# Type Alias: ClientLanguageModelResponse

> **ClientLanguageModelResponse** = `object`

Defined in: [types/client.ts:877](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/client.ts#L877)

Language model response

## Properties

### text

> **text**: `string`

Defined in: [types/client.ts:879](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/client.ts#L879)

Generated text

---

### finishReason

> **finishReason**: `"stop"` \| `"length"` \| `"tool-calls"` \| `"content-filter"` \| `"error"` \| `"other"`

Defined in: [types/client.ts:881](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/client.ts#L881)

Finish reason

---

### usage

> **usage**: `object`

Defined in: [types/client.ts:889](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/client.ts#L889)

Usage information

#### promptTokens

> **promptTokens**: `number`

#### completionTokens

> **completionTokens**: `number`

---

### rawResponse?

> `optional` **rawResponse?**: `unknown`

Defined in: [types/client.ts:894](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/client.ts#L894)

Raw response
