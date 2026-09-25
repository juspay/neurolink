[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ParsedOpenAIRequest

# Type Alias: ParsedOpenAIRequest

> **ParsedOpenAIRequest** = `object`

Defined in: [types/proxy.ts:4057](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4057)

## Properties

### model

> **model**: `string`

Defined in: [types/proxy.ts:4058](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4058)

---

### maxTokens?

> `optional` **maxTokens?**: `number`

Defined in: [types/proxy.ts:4059](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4059)

---

### temperature?

> `optional` **temperature?**: `number`

Defined in: [types/proxy.ts:4060](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4060)

---

### topP?

> `optional` **topP?**: `number`

Defined in: [types/proxy.ts:4061](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4061)

---

### systemPrompt?

> `optional` **systemPrompt?**: `string`

Defined in: [types/proxy.ts:4062](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4062)

---

### stream

> **stream**: `boolean`

Defined in: [types/proxy.ts:4063](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4063)

---

### prompt

> **prompt**: `string`

Defined in: [types/proxy.ts:4064](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4064)

---

### images

> **images**: `string`[]

Defined in: [types/proxy.ts:4065](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4065)

---

### conversationMessages

> **conversationMessages**: `object`[]

Defined in: [types/proxy.ts:4066](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4066)

#### role

> **role**: `string`

#### content

> **content**: `string`

---

### tools

> **tools**: `Record`\<`string`, \{ `description?`: `string`; `inputSchema`: `unknown`; `execute?`: (...`args`) => `unknown`; \}\>

Defined in: [types/proxy.ts:4067](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4067)

---

### toolChoice?

> `optional` **toolChoice?**: `"auto"` \| `"required"` \| `"none"`

Defined in: [types/proxy.ts:4075](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4075)

---

### toolChoiceName?

> `optional` **toolChoiceName?**: `string`

Defined in: [types/proxy.ts:4076](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4076)

---

### stopSequences?

> `optional` **stopSequences?**: `string`[]

Defined in: [types/proxy.ts:4077](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4077)

---

### responseFormat?

> `optional` **responseFormat?**: `object`

Defined in: [types/proxy.ts:4078](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4078)

#### type

> **type**: `string`

#### jsonSchema?

> `optional` **jsonSchema?**: `unknown`
