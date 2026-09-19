[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ParsedOpenAIRequest

# Type Alias: ParsedOpenAIRequest

> **ParsedOpenAIRequest** = `object`

Defined in: [types/proxy.ts:3867](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3867)

## Properties

### model

> **model**: `string`

Defined in: [types/proxy.ts:3868](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3868)

---

### maxTokens?

> `optional` **maxTokens?**: `number`

Defined in: [types/proxy.ts:3869](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3869)

---

### temperature?

> `optional` **temperature?**: `number`

Defined in: [types/proxy.ts:3870](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3870)

---

### topP?

> `optional` **topP?**: `number`

Defined in: [types/proxy.ts:3871](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3871)

---

### systemPrompt?

> `optional` **systemPrompt?**: `string`

Defined in: [types/proxy.ts:3872](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3872)

---

### stream

> **stream**: `boolean`

Defined in: [types/proxy.ts:3873](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3873)

---

### prompt

> **prompt**: `string`

Defined in: [types/proxy.ts:3874](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3874)

---

### images

> **images**: `string`[]

Defined in: [types/proxy.ts:3875](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3875)

---

### conversationMessages

> **conversationMessages**: `object`[]

Defined in: [types/proxy.ts:3876](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3876)

#### role

> **role**: `string`

#### content

> **content**: `string`

---

### tools

> **tools**: `Record`\<`string`, \{ `description?`: `string`; `inputSchema`: `unknown`; `execute?`: (...`args`) => `unknown`; \}\>

Defined in: [types/proxy.ts:3877](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3877)

---

### toolChoice?

> `optional` **toolChoice?**: `"auto"` \| `"required"` \| `"none"`

Defined in: [types/proxy.ts:3885](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3885)

---

### toolChoiceName?

> `optional` **toolChoiceName?**: `string`

Defined in: [types/proxy.ts:3886](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3886)

---

### stopSequences?

> `optional` **stopSequences?**: `string`[]

Defined in: [types/proxy.ts:3887](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3887)

---

### responseFormat?

> `optional` **responseFormat?**: `object`

Defined in: [types/proxy.ts:3888](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3888)

#### type

> **type**: `string`

#### jsonSchema?

> `optional` **jsonSchema?**: `unknown`
