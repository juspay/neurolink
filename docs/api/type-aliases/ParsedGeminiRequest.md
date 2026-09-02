[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ParsedGeminiRequest

# Type Alias: ParsedGeminiRequest

> **ParsedGeminiRequest** = `object`

Defined in: [types/proxy.ts:3347](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3347)

A Gemini `generateContent` request, reduced to what translation needs.

Google's shape differs from both others in three ways that matter here:
roles are `user`/`model` rather than `user`/`assistant`, the system prompt
lives in a sibling `systemInstruction` rather than in the turn list, and
generation settings are nested under `generationConfig` instead of sitting
at the top level.

## Properties

### model

> **model**: `string`

Defined in: [types/proxy.ts:3348](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3348)

---

### maxTokens?

> `optional` **maxTokens?**: `number`

Defined in: [types/proxy.ts:3349](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3349)

---

### temperature?

> `optional` **temperature?**: `number`

Defined in: [types/proxy.ts:3350](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3350)

---

### topP?

> `optional` **topP?**: `number`

Defined in: [types/proxy.ts:3351](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3351)

---

### systemPrompt?

> `optional` **systemPrompt?**: `string`

Defined in: [types/proxy.ts:3352](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3352)

---

### stream

> **stream**: `boolean`

Defined in: [types/proxy.ts:3353](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3353)

---

### prompt

> **prompt**: `string`

Defined in: [types/proxy.ts:3354](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3354)

---

### images

> **images**: `string`[]

Defined in: [types/proxy.ts:3355](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3355)

---

### conversationMessages

> **conversationMessages**: `object`[]

Defined in: [types/proxy.ts:3356](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3356)

#### role

> **role**: `string`

#### content

> **content**: `string`

---

### tools

> **tools**: `Record`\<`string`, \{ `description?`: `string`; `inputSchema`: `unknown`; `execute?`: (...`args`) => `unknown`; \}\>

Defined in: [types/proxy.ts:3357](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3357)

---

### stopSequences?

> `optional` **stopSequences?**: `string`[]

Defined in: [types/proxy.ts:3365](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3365)
