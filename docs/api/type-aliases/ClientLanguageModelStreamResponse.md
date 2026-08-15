[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / ClientLanguageModelStreamResponse

# Type Alias: ClientLanguageModelStreamResponse

> **ClientLanguageModelStreamResponse** = `object`

Defined in: [types/client.ts:900](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/client.ts#L900)

Language model stream response

## Properties

### stream

> **stream**: `AsyncIterable`\<\{ `type`: `"text-delta"` \| `"finish"`; `textDelta?`: `string`; `finishReason?`: `string`; `usage?`: \{ `promptTokens`: `number`; `completionTokens`: `number`; \}; \}\>

Defined in: [types/client.ts:902](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/client.ts#L902)

Stream of text deltas

---

### rawResponse?

> `optional` **rawResponse?**: `unknown`

Defined in: [types/client.ts:912](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/client.ts#L912)

Raw response
