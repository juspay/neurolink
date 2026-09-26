[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ClientLanguageModelStreamResponse

# Type Alias: ClientLanguageModelStreamResponse

> **ClientLanguageModelStreamResponse** = `object`

Language model stream response

## Properties

### stream

> **stream**: `AsyncIterable`\<\{ `type`: `"text-delta"` \| `"finish"`; `textDelta?`: `string`; `finishReason?`: `string`; `usage?`: \{ `promptTokens`: `number`; `completionTokens`: `number`; \}; \}\>

Stream of text deltas

---

### rawResponse?

> `optional` **rawResponse?**: `unknown`

Raw response
