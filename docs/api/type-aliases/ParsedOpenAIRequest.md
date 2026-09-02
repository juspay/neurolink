[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ParsedOpenAIRequest

# Type Alias: ParsedOpenAIRequest

> **ParsedOpenAIRequest** = `object`

Defined in: [types/proxy.ts:3359](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3359)

## Properties

### model

> **model**: `string`

Defined in: [types/proxy.ts:3360](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3360)

---

### maxTokens?

> `optional` **maxTokens?**: `number`

Defined in: [types/proxy.ts:3361](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3361)

---

### temperature?

> `optional` **temperature?**: `number`

Defined in: [types/proxy.ts:3362](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3362)

---

### topP?

> `optional` **topP?**: `number`

Defined in: [types/proxy.ts:3363](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3363)

---

### systemPrompt?

> `optional` **systemPrompt?**: `string`

Defined in: [types/proxy.ts:3364](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3364)

---

### stream

> **stream**: `boolean`

Defined in: [types/proxy.ts:3365](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3365)

---

### prompt

> **prompt**: `string`

Defined in: [types/proxy.ts:3366](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3366)

---

### images

> **images**: `string`[]

Defined in: [types/proxy.ts:3367](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3367)

---

### conversationMessages

> **conversationMessages**: `object`[]

Defined in: [types/proxy.ts:3368](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3368)

#### role

> **role**: `string`

#### content

> **content**: `string`

---

### tools

> **tools**: `Record`\<`string`, \{ `description?`: `string`; `inputSchema`: `unknown`; `execute?`: (...`args`) => `unknown`; \}\>

Defined in: [types/proxy.ts:3369](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3369)

---

### toolChoice?

> `optional` **toolChoice?**: `"auto"` \| `"required"` \| `"none"`

Defined in: [types/proxy.ts:3377](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3377)

---

### toolChoiceName?

> `optional` **toolChoiceName?**: `string`

Defined in: [types/proxy.ts:3378](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3378)

---

### stopSequences?

> `optional` **stopSequences?**: `string`[]

Defined in: [types/proxy.ts:3379](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3379)

---

### responseFormat?

> `optional` **responseFormat?**: `object`

Defined in: [types/proxy.ts:3380](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3380)

#### type

> **type**: `string`

#### jsonSchema?

> `optional` **jsonSchema?**: `unknown`
