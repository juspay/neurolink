[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / LanguageModelV3StreamPart

# Type Alias: LanguageModelV3StreamPart

> **LanguageModelV3StreamPart** = \{ `type`: `"text-start"`; `id?`: `string`; \} \| \{ `type`: `"text-delta"`; `id?`: `string`; `delta`: `string`; \} \| \{ `type`: `"text-end"`; `id?`: `string`; \} \| \{ `type`: `"reasoning-start"`; `id?`: `string`; \} \| \{ `type`: `"reasoning-delta"`; `id?`: `string`; `delta`: `string`; \} \| \{ `type`: `"reasoning-end"`; `id?`: `string`; \} \| \{ `type`: `"tool-call"`; `toolCallId`: `string`; `toolName`: `string`; `input`: `string`; `providerExecuted?`: `boolean`; \} \| `object` & `Record`\<`string`, `unknown`\> \| `object` & `Record`\<`string`, `unknown`\> \| `object` & `Record`\<`string`, `unknown`\> \| `object` & `Record`\<`string`, `unknown`\> \| \{ `type`: `"source"`; `sourceType`: `string`; `id`: `string`; `url?`: `string`; `title?`: `string`; \} \| `object` & `Record`\<`string`, `unknown`\> \| `object` & `Record`\<`string`, `unknown`\> \| `object` & `Record`\<`string`, `unknown`\> \| `object` & `Record`\<`string`, `unknown`\> \| \{ `type`: `"error"`; `error`: `unknown`; \} \| \{ `type`: `"finish"`; `finishReason`: `LanguageModelV3FinishReason`; `usage`: `LanguageModelV3Usage`; `providerMetadata?`: `Record`\<`string`, `Record`\<`string`, `unknown`\>\>; \}

Defined in: [types/aiCompat.ts:444](https://github.com/juspay/neurolink/blob/release/src/lib/types/aiCompat.ts#L444)

Discriminated rather than a loose record: consumers switch on `type` and
read variant-specific fields (a finish part's usage, a tool-call's input).
