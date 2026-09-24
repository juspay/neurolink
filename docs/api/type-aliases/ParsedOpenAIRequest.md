[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ParsedOpenAIRequest

# Type Alias: ParsedOpenAIRequest

> **ParsedOpenAIRequest** = `object`

Defined in: [types/proxy.ts:3987](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3987)

## Properties

### model

> **model**: `string`

Defined in: [types/proxy.ts:3988](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3988)

---

### maxTokens?

> `optional` **maxTokens?**: `number`

Defined in: [types/proxy.ts:3989](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3989)

---

### temperature?

> `optional` **temperature?**: `number`

Defined in: [types/proxy.ts:3990](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3990)

---

### topP?

> `optional` **topP?**: `number`

Defined in: [types/proxy.ts:3991](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3991)

---

### systemPrompt?

> `optional` **systemPrompt?**: `string`

Defined in: [types/proxy.ts:3992](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3992)

---

### stream

> **stream**: `boolean`

Defined in: [types/proxy.ts:3993](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3993)

---

### prompt

> **prompt**: `string`

Defined in: [types/proxy.ts:3994](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3994)

---

### images

> **images**: `string`[]

Defined in: [types/proxy.ts:3995](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3995)

---

### conversationMessages

> **conversationMessages**: `object`[]

Defined in: [types/proxy.ts:3996](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3996)

#### role

> **role**: `string`

#### content

> **content**: `string`

---

### tools

> **tools**: `Record`\<`string`, \{ `description?`: `string`; `inputSchema`: `unknown`; `execute?`: (...`args`) => `unknown`; \}\>

Defined in: [types/proxy.ts:3997](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3997)

---

### toolChoice?

> `optional` **toolChoice?**: `"auto"` \| `"required"` \| `"none"`

Defined in: [types/proxy.ts:4005](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4005)

---

### toolChoiceName?

> `optional` **toolChoiceName?**: `string`

Defined in: [types/proxy.ts:4006](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4006)

---

### stopSequences?

> `optional` **stopSequences?**: `string`[]

Defined in: [types/proxy.ts:4007](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4007)

---

### responseFormat?

> `optional` **responseFormat?**: `object`

Defined in: [types/proxy.ts:4008](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4008)

#### type

> **type**: `string`

#### jsonSchema?

> `optional` **jsonSchema?**: `unknown`
