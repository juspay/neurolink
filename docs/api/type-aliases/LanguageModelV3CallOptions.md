[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / LanguageModelV3CallOptions

# Type Alias: LanguageModelV3CallOptions

> **LanguageModelV3CallOptions** = `object`

## Properties

### prompt

> **prompt**: [`LanguageModelV3Prompt`](LanguageModelV3Prompt.md)

---

### maxOutputTokens?

> `optional` **maxOutputTokens?**: `number`

---

### temperature?

> `optional` **temperature?**: `number`

---

### topP?

> `optional` **topP?**: `number`

---

### topK?

> `optional` **topK?**: `number`

---

### presencePenalty?

> `optional` **presencePenalty?**: `number`

---

### frequencyPenalty?

> `optional` **frequencyPenalty?**: `number`

---

### stopSequences?

> `optional` **stopSequences?**: `string`[]

---

### seed?

> `optional` **seed?**: `number`

---

### tools?

> `optional` **tools?**: (\{ `type`: `"function"`; `name`: `string`; `description?`: `string`; `inputSchema?`: `unknown`; `strict?`: `boolean`; `providerOptions?`: `Record`\<`string`, `Record`\<`string`, `unknown`\>\>; \} \| \{ `type`: `"provider-defined"`; `id`: `string`; `name`: `string`; `args`: `Record`\<`string`, `unknown`\>; \})[]

---

### toolChoice?

> `optional` **toolChoice?**: [`LanguageModelV3ToolChoice`](LanguageModelV3ToolChoice.md)

---

### responseFormat?

> `optional` **responseFormat?**: `object`

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

---

### headers?

> `optional` **headers?**: `Record`\<`string`, `string` \| `undefined`\>

---

### includeRawChunks?

> `optional` **includeRawChunks?**: `boolean`

---

### providerOptions?

> `optional` **providerOptions?**: `Record`\<`string`, `Record`\<`string`, `unknown`\>\>
