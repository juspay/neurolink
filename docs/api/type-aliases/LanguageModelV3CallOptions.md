[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / LanguageModelV3CallOptions

# Type Alias: LanguageModelV3CallOptions

> **LanguageModelV3CallOptions** = `object`

Defined in: [types/aiCompat.ts:336](https://github.com/juspay/neurolink/blob/release/src/lib/types/aiCompat.ts#L336)

## Properties

### prompt

> **prompt**: [`LanguageModelV3Prompt`](LanguageModelV3Prompt.md)

Defined in: [types/aiCompat.ts:339](https://github.com/juspay/neurolink/blob/release/src/lib/types/aiCompat.ts#L339)

---

### maxOutputTokens?

> `optional` **maxOutputTokens?**: `number`

Defined in: [types/aiCompat.ts:340](https://github.com/juspay/neurolink/blob/release/src/lib/types/aiCompat.ts#L340)

---

### temperature?

> `optional` **temperature?**: `number`

Defined in: [types/aiCompat.ts:341](https://github.com/juspay/neurolink/blob/release/src/lib/types/aiCompat.ts#L341)

---

### topP?

> `optional` **topP?**: `number`

Defined in: [types/aiCompat.ts:342](https://github.com/juspay/neurolink/blob/release/src/lib/types/aiCompat.ts#L342)

---

### topK?

> `optional` **topK?**: `number`

Defined in: [types/aiCompat.ts:343](https://github.com/juspay/neurolink/blob/release/src/lib/types/aiCompat.ts#L343)

---

### presencePenalty?

> `optional` **presencePenalty?**: `number`

Defined in: [types/aiCompat.ts:344](https://github.com/juspay/neurolink/blob/release/src/lib/types/aiCompat.ts#L344)

---

### frequencyPenalty?

> `optional` **frequencyPenalty?**: `number`

Defined in: [types/aiCompat.ts:345](https://github.com/juspay/neurolink/blob/release/src/lib/types/aiCompat.ts#L345)

---

### stopSequences?

> `optional` **stopSequences?**: `string`[]

Defined in: [types/aiCompat.ts:346](https://github.com/juspay/neurolink/blob/release/src/lib/types/aiCompat.ts#L346)

---

### seed?

> `optional` **seed?**: `number`

Defined in: [types/aiCompat.ts:347](https://github.com/juspay/neurolink/blob/release/src/lib/types/aiCompat.ts#L347)

---

### tools?

> `optional` **tools?**: (\{ `type`: `"function"`; `name`: `string`; `description?`: `string`; `inputSchema?`: `unknown`; `strict?`: `boolean`; `providerOptions?`: `Record`\<`string`, `Record`\<`string`, `unknown`\>\>; \} \| \{ `type`: `"provider-defined"`; `id`: `string`; `name`: `string`; `args`: `Record`\<`string`, `unknown`\>; \})[]

Defined in: [types/aiCompat.ts:350](https://github.com/juspay/neurolink/blob/release/src/lib/types/aiCompat.ts#L350)

---

### toolChoice?

> `optional` **toolChoice?**: [`LanguageModelV3ToolChoice`](LanguageModelV3ToolChoice.md)

Defined in: [types/aiCompat.ts:366](https://github.com/juspay/neurolink/blob/release/src/lib/types/aiCompat.ts#L366)

---

### responseFormat?

> `optional` **responseFormat?**: `object`

Defined in: [types/aiCompat.ts:367](https://github.com/juspay/neurolink/blob/release/src/lib/types/aiCompat.ts#L367)

#### type

> **type**: `"text"` \| `"json"`

#### schema?

> `optional` **schema?**: `Record`\<`string`, `unknown`\>

#### name?

> `optional` **name?**: `string`

#### description?

> `optional` **description?**: `string`

---

### abortSignal?

> `optional` **abortSignal?**: `AbortSignal`

Defined in: [types/aiCompat.ts:373](https://github.com/juspay/neurolink/blob/release/src/lib/types/aiCompat.ts#L373)

---

### headers?

> `optional` **headers?**: `Record`\<`string`, `string` \| `undefined`\>

Defined in: [types/aiCompat.ts:374](https://github.com/juspay/neurolink/blob/release/src/lib/types/aiCompat.ts#L374)

---

### includeRawChunks?

> `optional` **includeRawChunks?**: `boolean`

Defined in: [types/aiCompat.ts:375](https://github.com/juspay/neurolink/blob/release/src/lib/types/aiCompat.ts#L375)

---

### providerOptions?

> `optional` **providerOptions?**: `Record`\<`string`, `Record`\<`string`, `unknown`\>\>

Defined in: [types/aiCompat.ts:376](https://github.com/juspay/neurolink/blob/release/src/lib/types/aiCompat.ts#L376)
