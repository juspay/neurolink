[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ParsedOpenAIRequest

# Type Alias: ParsedOpenAIRequest

> **ParsedOpenAIRequest** = `object`

Defined in: [types/proxy.ts:3368](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3368)

## Properties

### model

> **model**: `string`

Defined in: [types/proxy.ts:3369](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3369)

---

### maxTokens?

> `optional` **maxTokens?**: `number`

Defined in: [types/proxy.ts:3370](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3370)

---

### temperature?

> `optional` **temperature?**: `number`

Defined in: [types/proxy.ts:3371](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3371)

---

### topP?

> `optional` **topP?**: `number`

Defined in: [types/proxy.ts:3372](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3372)

---

### systemPrompt?

> `optional` **systemPrompt?**: `string`

Defined in: [types/proxy.ts:3373](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3373)

---

### stream

> **stream**: `boolean`

Defined in: [types/proxy.ts:3374](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3374)

---

### prompt

> **prompt**: `string`

Defined in: [types/proxy.ts:3375](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3375)

---

### images

> **images**: `string`[]

Defined in: [types/proxy.ts:3376](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3376)

---

### conversationMessages

> **conversationMessages**: `object`[]

Defined in: [types/proxy.ts:3377](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3377)

#### role

> **role**: `string`

#### content

> **content**: `string`

---

### tools

> **tools**: `Record`\<`string`, \{ `description?`: `string`; `inputSchema`: `unknown`; `execute?`: (...`args`) => `unknown`; \}\>

Defined in: [types/proxy.ts:3378](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3378)

---

### toolChoice?

> `optional` **toolChoice?**: `"auto"` \| `"required"` \| `"none"`

Defined in: [types/proxy.ts:3386](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3386)

---

### toolChoiceName?

> `optional` **toolChoiceName?**: `string`

Defined in: [types/proxy.ts:3387](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3387)

---

### stopSequences?

> `optional` **stopSequences?**: `string`[]

Defined in: [types/proxy.ts:3388](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3388)

---

### responseFormat?

> `optional` **responseFormat?**: `object`

Defined in: [types/proxy.ts:3389](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3389)

#### type

> **type**: `string`

#### jsonSchema?

> `optional` **jsonSchema?**: `unknown`
