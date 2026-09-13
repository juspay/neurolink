[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ParsedGeminiRequest

# Type Alias: ParsedGeminiRequest

> **ParsedGeminiRequest** = `object`

Defined in: [types/proxy.ts:3566](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3566)

A Gemini `generateContent` request, reduced to what translation needs.

Google's shape differs from both others in three ways that matter here:
roles are `user`/`model` rather than `user`/`assistant`, the system prompt
lives in a sibling `systemInstruction` rather than in the turn list, and
generation settings are nested under `generationConfig` instead of sitting
at the top level.

## Properties

### model

> **model**: `string`

Defined in: [types/proxy.ts:3567](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3567)

---

### maxTokens?

> `optional` **maxTokens?**: `number`

Defined in: [types/proxy.ts:3568](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3568)

---

### temperature?

> `optional` **temperature?**: `number`

Defined in: [types/proxy.ts:3569](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3569)

---

### topP?

> `optional` **topP?**: `number`

Defined in: [types/proxy.ts:3570](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3570)

---

### systemPrompt?

> `optional` **systemPrompt?**: `string`

Defined in: [types/proxy.ts:3571](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3571)

---

### stream

> **stream**: `boolean`

Defined in: [types/proxy.ts:3572](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3572)

---

### prompt

> **prompt**: `string`

Defined in: [types/proxy.ts:3573](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3573)

---

### images

> **images**: `string`[]

Defined in: [types/proxy.ts:3574](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3574)

---

### conversationMessages

> **conversationMessages**: `object`[]

Defined in: [types/proxy.ts:3575](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3575)

#### role

> **role**: `string`

#### content

> **content**: `string`

---

### tools

> **tools**: `Record`\<`string`, \{ `description?`: `string`; `inputSchema`: `unknown`; `execute?`: (...`args`) => `unknown`; \}\>

Defined in: [types/proxy.ts:3576](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3576)

---

### stopSequences?

> `optional` **stopSequences?**: `string`[]

Defined in: [types/proxy.ts:3584](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3584)
