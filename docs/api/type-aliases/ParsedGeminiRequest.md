[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ParsedGeminiRequest

# Type Alias: ParsedGeminiRequest

> **ParsedGeminiRequest** = `object`

Defined in: [types/proxy.ts:3695](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3695)

A Gemini `generateContent` request, reduced to what translation needs.

Google's shape differs from both others in three ways that matter here:
roles are `user`/`model` rather than `user`/`assistant`, the system prompt
lives in a sibling `systemInstruction` rather than in the turn list, and
generation settings are nested under `generationConfig` instead of sitting
at the top level.

## Properties

### model

> **model**: `string`

Defined in: [types/proxy.ts:3696](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3696)

---

### maxTokens?

> `optional` **maxTokens?**: `number`

Defined in: [types/proxy.ts:3697](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3697)

---

### temperature?

> `optional` **temperature?**: `number`

Defined in: [types/proxy.ts:3698](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3698)

---

### topP?

> `optional` **topP?**: `number`

Defined in: [types/proxy.ts:3699](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3699)

---

### systemPrompt?

> `optional` **systemPrompt?**: `string`

Defined in: [types/proxy.ts:3700](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3700)

---

### stream

> **stream**: `boolean`

Defined in: [types/proxy.ts:3701](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3701)

---

### prompt

> **prompt**: `string`

Defined in: [types/proxy.ts:3702](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3702)

---

### images

> **images**: `string`[]

Defined in: [types/proxy.ts:3703](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3703)

---

### conversationMessages

> **conversationMessages**: `object`[]

Defined in: [types/proxy.ts:3704](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3704)

#### role

> **role**: `string`

#### content

> **content**: `string`

---

### tools

> **tools**: `Record`\<`string`, \{ `description?`: `string`; `inputSchema`: `unknown`; `execute?`: (...`args`) => `unknown`; \}\>

Defined in: [types/proxy.ts:3705](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3705)

---

### stopSequences?

> `optional` **stopSequences?**: `string`[]

Defined in: [types/proxy.ts:3713](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3713)
