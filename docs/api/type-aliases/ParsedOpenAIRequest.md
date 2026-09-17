[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ParsedOpenAIRequest

# Type Alias: ParsedOpenAIRequest

> **ParsedOpenAIRequest** = `object`

Defined in: [types/proxy.ts:3716](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3716)

## Properties

### model

> **model**: `string`

Defined in: [types/proxy.ts:3717](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3717)

---

### maxTokens?

> `optional` **maxTokens?**: `number`

Defined in: [types/proxy.ts:3718](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3718)

---

### temperature?

> `optional` **temperature?**: `number`

Defined in: [types/proxy.ts:3719](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3719)

---

### topP?

> `optional` **topP?**: `number`

Defined in: [types/proxy.ts:3720](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3720)

---

### systemPrompt?

> `optional` **systemPrompt?**: `string`

Defined in: [types/proxy.ts:3721](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3721)

---

### stream

> **stream**: `boolean`

Defined in: [types/proxy.ts:3722](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3722)

---

### prompt

> **prompt**: `string`

Defined in: [types/proxy.ts:3723](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3723)

---

### images

> **images**: `string`[]

Defined in: [types/proxy.ts:3724](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3724)

---

### conversationMessages

> **conversationMessages**: `object`[]

Defined in: [types/proxy.ts:3725](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3725)

#### role

> **role**: `string`

#### content

> **content**: `string`

---

### tools

> **tools**: `Record`\<`string`, \{ `description?`: `string`; `inputSchema`: `unknown`; `execute?`: (...`args`) => `unknown`; \}\>

Defined in: [types/proxy.ts:3726](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3726)

---

### toolChoice?

> `optional` **toolChoice?**: `"auto"` \| `"required"` \| `"none"`

Defined in: [types/proxy.ts:3734](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3734)

---

### toolChoiceName?

> `optional` **toolChoiceName?**: `string`

Defined in: [types/proxy.ts:3735](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3735)

---

### stopSequences?

> `optional` **stopSequences?**: `string`[]

Defined in: [types/proxy.ts:3736](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3736)

---

### responseFormat?

> `optional` **responseFormat?**: `object`

Defined in: [types/proxy.ts:3737](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3737)

#### type

> **type**: `string`

#### jsonSchema?

> `optional` **jsonSchema?**: `unknown`
