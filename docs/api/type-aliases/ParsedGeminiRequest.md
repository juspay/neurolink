[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ParsedGeminiRequest

# Type Alias: ParsedGeminiRequest

> **ParsedGeminiRequest** = `object`

Defined in: [types/proxy.ts:3236](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3236)

## Properties

### model

> **model**: `string`

Defined in: [types/proxy.ts:3237](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3237)

---

### maxTokens?

> `optional` **maxTokens?**: `number`

Defined in: [types/proxy.ts:3238](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3238)

---

### temperature?

> `optional` **temperature?**: `number`

Defined in: [types/proxy.ts:3239](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3239)

---

### topP?

> `optional` **topP?**: `number`

Defined in: [types/proxy.ts:3240](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3240)

---

### systemPrompt?

> `optional` **systemPrompt?**: `string`

Defined in: [types/proxy.ts:3241](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3241)

---

### stream

> **stream**: `boolean`

Defined in: [types/proxy.ts:3242](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3242)

---

### prompt

> **prompt**: `string`

Defined in: [types/proxy.ts:3243](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3243)

---

### images

> **images**: `string`[]

Defined in: [types/proxy.ts:3244](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3244)

---

### conversationMessages

> **conversationMessages**: `object`[]

Defined in: [types/proxy.ts:3245](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3245)

#### role

> **role**: `string`

#### content

> **content**: `string`

---

### tools

> **tools**: `Record`\<`string`, \{ `description?`: `string`; `inputSchema`: `unknown`; `execute?`: (...`args`) => `unknown`; \}\>

Defined in: [types/proxy.ts:3246](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3246)

---

### stopSequences?

> `optional` **stopSequences?**: `string`[]

Defined in: [types/proxy.ts:3254](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3254)
