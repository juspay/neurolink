[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ParsedOpenAIRequest

# Type Alias: ParsedOpenAIRequest

> **ParsedOpenAIRequest** = `object`

Defined in: [types/proxy.ts:4119](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4119)

## Properties

### model

> **model**: `string`

Defined in: [types/proxy.ts:4120](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4120)

---

### maxTokens?

> `optional` **maxTokens?**: `number`

Defined in: [types/proxy.ts:4121](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4121)

---

### temperature?

> `optional` **temperature?**: `number`

Defined in: [types/proxy.ts:4122](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4122)

---

### topP?

> `optional` **topP?**: `number`

Defined in: [types/proxy.ts:4123](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4123)

---

### systemPrompt?

> `optional` **systemPrompt?**: `string`

Defined in: [types/proxy.ts:4124](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4124)

---

### stream

> **stream**: `boolean`

Defined in: [types/proxy.ts:4125](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4125)

---

### prompt

> **prompt**: `string`

Defined in: [types/proxy.ts:4126](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4126)

---

### images

> **images**: `string`[]

Defined in: [types/proxy.ts:4127](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4127)

---

### conversationMessages

> **conversationMessages**: `object`[]

Defined in: [types/proxy.ts:4128](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4128)

#### role

> **role**: `string`

#### content

> **content**: `string`

---

### tools

> **tools**: `Record`\<`string`, \{ `description?`: `string`; `inputSchema`: `unknown`; `execute?`: (...`args`) => `unknown`; \}\>

Defined in: [types/proxy.ts:4129](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4129)

---

### toolChoice?

> `optional` **toolChoice?**: `"auto"` \| `"required"` \| `"none"`

Defined in: [types/proxy.ts:4137](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4137)

---

### toolChoiceName?

> `optional` **toolChoiceName?**: `string`

Defined in: [types/proxy.ts:4138](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4138)

---

### stopSequences?

> `optional` **stopSequences?**: `string`[]

Defined in: [types/proxy.ts:4139](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4139)

---

### responseFormat?

> `optional` **responseFormat?**: `object`

Defined in: [types/proxy.ts:4140](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4140)

#### type

> **type**: `string`

#### jsonSchema?

> `optional` **jsonSchema?**: `unknown`
