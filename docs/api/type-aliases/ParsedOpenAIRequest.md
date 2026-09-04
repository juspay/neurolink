[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ParsedOpenAIRequest

# Type Alias: ParsedOpenAIRequest

> **ParsedOpenAIRequest** = `object`

Defined in: [types/proxy.ts:3374](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3374)

## Properties

### model

> **model**: `string`

Defined in: [types/proxy.ts:3375](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3375)

---

### maxTokens?

> `optional` **maxTokens?**: `number`

Defined in: [types/proxy.ts:3376](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3376)

---

### temperature?

> `optional` **temperature?**: `number`

Defined in: [types/proxy.ts:3377](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3377)

---

### topP?

> `optional` **topP?**: `number`

Defined in: [types/proxy.ts:3378](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3378)

---

### systemPrompt?

> `optional` **systemPrompt?**: `string`

Defined in: [types/proxy.ts:3379](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3379)

---

### stream

> **stream**: `boolean`

Defined in: [types/proxy.ts:3380](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3380)

---

### prompt

> **prompt**: `string`

Defined in: [types/proxy.ts:3381](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3381)

---

### images

> **images**: `string`[]

Defined in: [types/proxy.ts:3382](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3382)

---

### conversationMessages

> **conversationMessages**: `object`[]

Defined in: [types/proxy.ts:3383](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3383)

#### role

> **role**: `string`

#### content

> **content**: `string`

---

### tools

> **tools**: `Record`\<`string`, \{ `description?`: `string`; `inputSchema`: `unknown`; `execute?`: (...`args`) => `unknown`; \}\>

Defined in: [types/proxy.ts:3384](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3384)

---

### toolChoice?

> `optional` **toolChoice?**: `"auto"` \| `"required"` \| `"none"`

Defined in: [types/proxy.ts:3392](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3392)

---

### toolChoiceName?

> `optional` **toolChoiceName?**: `string`

Defined in: [types/proxy.ts:3393](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3393)

---

### stopSequences?

> `optional` **stopSequences?**: `string`[]

Defined in: [types/proxy.ts:3394](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3394)

---

### responseFormat?

> `optional` **responseFormat?**: `object`

Defined in: [types/proxy.ts:3395](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3395)

#### type

> **type**: `string`

#### jsonSchema?

> `optional` **jsonSchema?**: `unknown`
