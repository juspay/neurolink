[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ParsedGeminiRequest

# Type Alias: ParsedGeminiRequest

> **ParsedGeminiRequest** = `object`

Defined in: [types/proxy.ts:3353](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3353)

A Gemini `generateContent` request, reduced to what translation needs.

Google's shape differs from both others in three ways that matter here:
roles are `user`/`model` rather than `user`/`assistant`, the system prompt
lives in a sibling `systemInstruction` rather than in the turn list, and
generation settings are nested under `generationConfig` instead of sitting
at the top level.

## Properties

### model

> **model**: `string`

Defined in: [types/proxy.ts:3354](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3354)

---

### maxTokens?

> `optional` **maxTokens?**: `number`

Defined in: [types/proxy.ts:3355](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3355)

---

### temperature?

> `optional` **temperature?**: `number`

Defined in: [types/proxy.ts:3356](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3356)

---

### topP?

> `optional` **topP?**: `number`

Defined in: [types/proxy.ts:3357](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3357)

---

### systemPrompt?

> `optional` **systemPrompt?**: `string`

Defined in: [types/proxy.ts:3358](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3358)

---

### stream

> **stream**: `boolean`

Defined in: [types/proxy.ts:3359](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3359)

---

### prompt

> **prompt**: `string`

Defined in: [types/proxy.ts:3360](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3360)

---

### images

> **images**: `string`[]

Defined in: [types/proxy.ts:3361](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3361)

---

### conversationMessages

> **conversationMessages**: `object`[]

Defined in: [types/proxy.ts:3362](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3362)

#### role

> **role**: `string`

#### content

> **content**: `string`

---

### tools

> **tools**: `Record`\<`string`, \{ `description?`: `string`; `inputSchema`: `unknown`; `execute?`: (...`args`) => `unknown`; \}\>

Defined in: [types/proxy.ts:3363](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3363)

---

### stopSequences?

> `optional` **stopSequences?**: `string`[]

Defined in: [types/proxy.ts:3371](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3371)
