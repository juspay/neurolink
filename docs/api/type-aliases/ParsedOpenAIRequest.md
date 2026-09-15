[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ParsedOpenAIRequest

# Type Alias: ParsedOpenAIRequest

> **ParsedOpenAIRequest** = `object`

Defined in: [types/proxy.ts:3712](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3712)

## Properties

### model

> **model**: `string`

Defined in: [types/proxy.ts:3713](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3713)

---

### maxTokens?

> `optional` **maxTokens?**: `number`

Defined in: [types/proxy.ts:3714](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3714)

---

### temperature?

> `optional` **temperature?**: `number`

Defined in: [types/proxy.ts:3715](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3715)

---

### topP?

> `optional` **topP?**: `number`

Defined in: [types/proxy.ts:3716](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3716)

---

### systemPrompt?

> `optional` **systemPrompt?**: `string`

Defined in: [types/proxy.ts:3717](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3717)

---

### stream

> **stream**: `boolean`

Defined in: [types/proxy.ts:3718](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3718)

---

### prompt

> **prompt**: `string`

Defined in: [types/proxy.ts:3719](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3719)

---

### images

> **images**: `string`[]

Defined in: [types/proxy.ts:3720](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3720)

---

### conversationMessages

> **conversationMessages**: `object`[]

Defined in: [types/proxy.ts:3721](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3721)

#### role

> **role**: `string`

#### content

> **content**: `string`

---

### tools

> **tools**: `Record`\<`string`, \{ `description?`: `string`; `inputSchema`: `unknown`; `execute?`: (...`args`) => `unknown`; \}\>

Defined in: [types/proxy.ts:3722](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3722)

---

### toolChoice?

> `optional` **toolChoice?**: `"auto"` \| `"required"` \| `"none"`

Defined in: [types/proxy.ts:3730](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3730)

---

### toolChoiceName?

> `optional` **toolChoiceName?**: `string`

Defined in: [types/proxy.ts:3731](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3731)

---

### stopSequences?

> `optional` **stopSequences?**: `string`[]

Defined in: [types/proxy.ts:3732](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3732)

---

### responseFormat?

> `optional` **responseFormat?**: `object`

Defined in: [types/proxy.ts:3733](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3733)

#### type

> **type**: `string`

#### jsonSchema?

> `optional` **jsonSchema?**: `unknown`
