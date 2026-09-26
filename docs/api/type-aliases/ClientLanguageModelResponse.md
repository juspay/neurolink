[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ClientLanguageModelResponse

# Type Alias: ClientLanguageModelResponse

> **ClientLanguageModelResponse** = `object`

Language model response

## Properties

### text

> **text**: `string`

Generated text

---

### finishReason

> **finishReason**: `"stop"` \| `"length"` \| `"tool-calls"` \| `"content-filter"` \| `"error"` \| `"other"`

Finish reason

---

### usage

> **usage**: `object`

Usage information

#### promptTokens

> **promptTokens**: `number`

#### completionTokens

> **completionTokens**: `number`

---

### rawResponse?

> `optional` **rawResponse?**: `unknown`

Raw response
