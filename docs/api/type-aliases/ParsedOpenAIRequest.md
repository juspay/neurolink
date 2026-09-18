[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ParsedOpenAIRequest

# Type Alias: ParsedOpenAIRequest

> **ParsedOpenAIRequest** = `object`

Defined in: [types/proxy.ts:3737](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3737)

## Properties

### model

> **model**: `string`

Defined in: [types/proxy.ts:3738](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3738)

---

### maxTokens?

> `optional` **maxTokens?**: `number`

Defined in: [types/proxy.ts:3739](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3739)

---

### temperature?

> `optional` **temperature?**: `number`

Defined in: [types/proxy.ts:3740](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3740)

---

### topP?

> `optional` **topP?**: `number`

Defined in: [types/proxy.ts:3741](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3741)

---

### systemPrompt?

> `optional` **systemPrompt?**: `string`

Defined in: [types/proxy.ts:3742](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3742)

---

### stream

> **stream**: `boolean`

Defined in: [types/proxy.ts:3743](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3743)

---

### prompt

> **prompt**: `string`

Defined in: [types/proxy.ts:3744](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3744)

---

### images

> **images**: `string`[]

Defined in: [types/proxy.ts:3745](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3745)

---

### conversationMessages

> **conversationMessages**: `object`[]

Defined in: [types/proxy.ts:3746](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3746)

#### role

> **role**: `string`

#### content

> **content**: `string`

---

### tools

> **tools**: `Record`\<`string`, \{ `description?`: `string`; `inputSchema`: `unknown`; `execute?`: (...`args`) => `unknown`; \}\>

Defined in: [types/proxy.ts:3747](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3747)

---

### toolChoice?

> `optional` **toolChoice?**: `"auto"` \| `"required"` \| `"none"`

Defined in: [types/proxy.ts:3755](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3755)

---

### toolChoiceName?

> `optional` **toolChoiceName?**: `string`

Defined in: [types/proxy.ts:3756](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3756)

---

### stopSequences?

> `optional` **stopSequences?**: `string`[]

Defined in: [types/proxy.ts:3757](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3757)

---

### responseFormat?

> `optional` **responseFormat?**: `object`

Defined in: [types/proxy.ts:3758](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3758)

#### type

> **type**: `string`

#### jsonSchema?

> `optional` **jsonSchema?**: `unknown`
