[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ParsedOpenAIRequest

# Type Alias: ParsedOpenAIRequest

> **ParsedOpenAIRequest** = `object`

Defined in: [types/proxy.ts:3267](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3267)

## Properties

### model

> **model**: `string`

Defined in: [types/proxy.ts:3268](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3268)

---

### maxTokens?

> `optional` **maxTokens?**: `number`

Defined in: [types/proxy.ts:3269](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3269)

---

### temperature?

> `optional` **temperature?**: `number`

Defined in: [types/proxy.ts:3270](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3270)

---

### topP?

> `optional` **topP?**: `number`

Defined in: [types/proxy.ts:3271](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3271)

---

### systemPrompt?

> `optional` **systemPrompt?**: `string`

Defined in: [types/proxy.ts:3272](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3272)

---

### stream

> **stream**: `boolean`

Defined in: [types/proxy.ts:3273](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3273)

---

### prompt

> **prompt**: `string`

Defined in: [types/proxy.ts:3274](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3274)

---

### images

> **images**: `string`[]

Defined in: [types/proxy.ts:3275](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3275)

---

### conversationMessages

> **conversationMessages**: `object`[]

Defined in: [types/proxy.ts:3276](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3276)

#### role

> **role**: `string`

#### content

> **content**: `string`

---

### tools

> **tools**: `Record`\<`string`, \{ `description?`: `string`; `inputSchema`: `unknown`; `execute?`: (...`args`) => `unknown`; \}\>

Defined in: [types/proxy.ts:3277](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3277)

---

### toolChoice?

> `optional` **toolChoice?**: `"auto"` \| `"required"` \| `"none"`

Defined in: [types/proxy.ts:3285](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3285)

---

### toolChoiceName?

> `optional` **toolChoiceName?**: `string`

Defined in: [types/proxy.ts:3286](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3286)

---

### stopSequences?

> `optional` **stopSequences?**: `string`[]

Defined in: [types/proxy.ts:3287](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3287)

---

### responseFormat?

> `optional` **responseFormat?**: `object`

Defined in: [types/proxy.ts:3288](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3288)

#### type

> **type**: `string`

#### jsonSchema?

> `optional` **jsonSchema?**: `unknown`
