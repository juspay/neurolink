[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ParsedOpenAIRequest

# Type Alias: ParsedOpenAIRequest

> **ParsedOpenAIRequest** = `object`

Defined in: [types/proxy.ts:3337](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3337)

## Properties

### model

> **model**: `string`

Defined in: [types/proxy.ts:3338](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3338)

---

### maxTokens?

> `optional` **maxTokens?**: `number`

Defined in: [types/proxy.ts:3339](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3339)

---

### temperature?

> `optional` **temperature?**: `number`

Defined in: [types/proxy.ts:3340](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3340)

---

### topP?

> `optional` **topP?**: `number`

Defined in: [types/proxy.ts:3341](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3341)

---

### systemPrompt?

> `optional` **systemPrompt?**: `string`

Defined in: [types/proxy.ts:3342](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3342)

---

### stream

> **stream**: `boolean`

Defined in: [types/proxy.ts:3343](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3343)

---

### prompt

> **prompt**: `string`

Defined in: [types/proxy.ts:3344](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3344)

---

### images

> **images**: `string`[]

Defined in: [types/proxy.ts:3345](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3345)

---

### conversationMessages

> **conversationMessages**: `object`[]

Defined in: [types/proxy.ts:3346](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3346)

#### role

> **role**: `string`

#### content

> **content**: `string`

---

### tools

> **tools**: `Record`\<`string`, \{ `description?`: `string`; `inputSchema`: `unknown`; `execute?`: (...`args`) => `unknown`; \}\>

Defined in: [types/proxy.ts:3347](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3347)

---

### toolChoice?

> `optional` **toolChoice?**: `"auto"` \| `"required"` \| `"none"`

Defined in: [types/proxy.ts:3355](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3355)

---

### toolChoiceName?

> `optional` **toolChoiceName?**: `string`

Defined in: [types/proxy.ts:3356](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3356)

---

### stopSequences?

> `optional` **stopSequences?**: `string`[]

Defined in: [types/proxy.ts:3357](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3357)

---

### responseFormat?

> `optional` **responseFormat?**: `object`

Defined in: [types/proxy.ts:3358](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3358)

#### type

> **type**: `string`

#### jsonSchema?

> `optional` **jsonSchema?**: `unknown`
