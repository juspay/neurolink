[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ParsedOpenAIRequest

# Type Alias: ParsedOpenAIRequest

> **ParsedOpenAIRequest** = `object`

Defined in: [types/proxy.ts:3984](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3984)

## Properties

### model

> **model**: `string`

Defined in: [types/proxy.ts:3985](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3985)

---

### maxTokens?

> `optional` **maxTokens?**: `number`

Defined in: [types/proxy.ts:3986](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3986)

---

### temperature?

> `optional` **temperature?**: `number`

Defined in: [types/proxy.ts:3987](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3987)

---

### topP?

> `optional` **topP?**: `number`

Defined in: [types/proxy.ts:3988](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3988)

---

### systemPrompt?

> `optional` **systemPrompt?**: `string`

Defined in: [types/proxy.ts:3989](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3989)

---

### stream

> **stream**: `boolean`

Defined in: [types/proxy.ts:3990](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3990)

---

### prompt

> **prompt**: `string`

Defined in: [types/proxy.ts:3991](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3991)

---

### images

> **images**: `string`[]

Defined in: [types/proxy.ts:3992](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3992)

---

### conversationMessages

> **conversationMessages**: `object`[]

Defined in: [types/proxy.ts:3993](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3993)

#### role

> **role**: `string`

#### content

> **content**: `string`

---

### tools

> **tools**: `Record`\<`string`, \{ `description?`: `string`; `inputSchema`: `unknown`; `execute?`: (...`args`) => `unknown`; \}\>

Defined in: [types/proxy.ts:3994](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3994)

---

### toolChoice?

> `optional` **toolChoice?**: `"auto"` \| `"required"` \| `"none"`

Defined in: [types/proxy.ts:4002](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4002)

---

### toolChoiceName?

> `optional` **toolChoiceName?**: `string`

Defined in: [types/proxy.ts:4003](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4003)

---

### stopSequences?

> `optional` **stopSequences?**: `string`[]

Defined in: [types/proxy.ts:4004](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4004)

---

### responseFormat?

> `optional` **responseFormat?**: `object`

Defined in: [types/proxy.ts:4005](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4005)

#### type

> **type**: `string`

#### jsonSchema?

> `optional` **jsonSchema?**: `unknown`
