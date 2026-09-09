[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / LanguageModelV3Content

# Type Alias: LanguageModelV3Content

> **LanguageModelV3Content** = \{ `type`: `"text"`; `text`: `string`; \} \| \{ `type`: `"reasoning"`; `text`: `string`; `providerOptions?`: `Record`\<`string`, `Record`\<`string`, `unknown`\>\>; \} \| \{ `type`: `"file"`; `data`: `unknown`; `mediaType`: `string`; \} \| [`LanguageModelV3ToolCall`](LanguageModelV3ToolCall.md) \| [`LanguageModelV3Source`](LanguageModelV3Source.md) \| `object` & `Record`\<`string`, `unknown`\> \| `object` & `Record`\<`string`, `unknown`\>

Defined in: [types/aiCompat.ts:401](https://github.com/juspay/neurolink/blob/release/src/lib/types/aiCompat.ts#L401)
