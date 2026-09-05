[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ParsedOpenAIRequest

# Type Alias: ParsedOpenAIRequest

> **ParsedOpenAIRequest** = `object`

Defined in: [types/proxy.ts:3388](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3388)

## Properties

### model

> **model**: `string`

Defined in: [types/proxy.ts:3389](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3389)

---

### maxTokens?

> `optional` **maxTokens?**: `number`

Defined in: [types/proxy.ts:3390](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3390)

---

### temperature?

> `optional` **temperature?**: `number`

Defined in: [types/proxy.ts:3391](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3391)

---

### topP?

> `optional` **topP?**: `number`

Defined in: [types/proxy.ts:3392](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3392)

---

### systemPrompt?

> `optional` **systemPrompt?**: `string`

Defined in: [types/proxy.ts:3393](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3393)

---

### stream

> **stream**: `boolean`

Defined in: [types/proxy.ts:3394](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3394)

---

### prompt

> **prompt**: `string`

Defined in: [types/proxy.ts:3395](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3395)

---

### images

> **images**: `string`[]

Defined in: [types/proxy.ts:3396](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3396)

---

### conversationMessages

> **conversationMessages**: `object`[]

Defined in: [types/proxy.ts:3397](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3397)

#### role

> **role**: `string`

#### content

> **content**: `string`

---

### tools

> **tools**: `Record`\<`string`, \{ `description?`: `string`; `inputSchema`: `unknown`; `execute?`: (...`args`) => `unknown`; \}\>

Defined in: [types/proxy.ts:3398](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3398)

---

### toolChoice?

> `optional` **toolChoice?**: `"auto"` \| `"required"` \| `"none"`

Defined in: [types/proxy.ts:3406](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3406)

---

### toolChoiceName?

> `optional` **toolChoiceName?**: `string`

Defined in: [types/proxy.ts:3407](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3407)

---

### stopSequences?

> `optional` **stopSequences?**: `string`[]

Defined in: [types/proxy.ts:3408](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3408)

---

### responseFormat?

> `optional` **responseFormat?**: `object`

Defined in: [types/proxy.ts:3409](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3409)

#### type

> **type**: `string`

#### jsonSchema?

> `optional` **jsonSchema?**: `unknown`
