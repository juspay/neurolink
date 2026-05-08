[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / ClientLanguageModelStreamResponse

# Type Alias: ClientLanguageModelStreamResponse

> **ClientLanguageModelStreamResponse** = `object`

Defined in: [types/client.ts:900](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/client.ts#L900)

Language model stream response

## Properties

### stream

> **stream**: `AsyncIterable`\<\{ `type`: `"text-delta"` \| `"finish"`; `textDelta?`: `string`; `finishReason?`: `string`; `usage?`: \{ `promptTokens`: `number`; `completionTokens`: `number`; \}; \}\>

Defined in: [types/client.ts:902](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/client.ts#L902)

Stream of text deltas

---

### rawResponse?

> `optional` **rawResponse?**: `unknown`

Defined in: [types/client.ts:912](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/client.ts#L912)

Raw response
