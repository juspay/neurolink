[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ParsedOpenAIRequest

# Type Alias: ParsedOpenAIRequest

> **ParsedOpenAIRequest** = `object`

Defined in: [types/proxy.ts:3698](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3698)

## Properties

### model

> **model**: `string`

Defined in: [types/proxy.ts:3699](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3699)

---

### maxTokens?

> `optional` **maxTokens?**: `number`

Defined in: [types/proxy.ts:3700](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3700)

---

### temperature?

> `optional` **temperature?**: `number`

Defined in: [types/proxy.ts:3701](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3701)

---

### topP?

> `optional` **topP?**: `number`

Defined in: [types/proxy.ts:3702](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3702)

---

### systemPrompt?

> `optional` **systemPrompt?**: `string`

Defined in: [types/proxy.ts:3703](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3703)

---

### stream

> **stream**: `boolean`

Defined in: [types/proxy.ts:3704](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3704)

---

### prompt

> **prompt**: `string`

Defined in: [types/proxy.ts:3705](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3705)

---

### images

> **images**: `string`[]

Defined in: [types/proxy.ts:3706](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3706)

---

### conversationMessages

> **conversationMessages**: `object`[]

Defined in: [types/proxy.ts:3707](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3707)

#### role

> **role**: `string`

#### content

> **content**: `string`

---

### tools

> **tools**: `Record`\<`string`, \{ `description?`: `string`; `inputSchema`: `unknown`; `execute?`: (...`args`) => `unknown`; \}\>

Defined in: [types/proxy.ts:3708](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3708)

---

### toolChoice?

> `optional` **toolChoice?**: `"auto"` \| `"required"` \| `"none"`

Defined in: [types/proxy.ts:3716](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3716)

---

### toolChoiceName?

> `optional` **toolChoiceName?**: `string`

Defined in: [types/proxy.ts:3717](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3717)

---

### stopSequences?

> `optional` **stopSequences?**: `string`[]

Defined in: [types/proxy.ts:3718](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3718)

---

### responseFormat?

> `optional` **responseFormat?**: `object`

Defined in: [types/proxy.ts:3719](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3719)

#### type

> **type**: `string`

#### jsonSchema?

> `optional` **jsonSchema?**: `unknown`
