[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ParsedGeminiRequest

# Type Alias: ParsedGeminiRequest

> **ParsedGeminiRequest** = `object`

Defined in: [types/proxy.ts:4036](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4036)

A Gemini `generateContent` request, reduced to what translation needs.

Google's shape differs from both others in three ways that matter here:
roles are `user`/`model` rather than `user`/`assistant`, the system prompt
lives in a sibling `systemInstruction` rather than in the turn list, and
generation settings are nested under `generationConfig` instead of sitting
at the top level.

## Properties

### model

> **model**: `string`

Defined in: [types/proxy.ts:4037](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4037)

---

### maxTokens?

> `optional` **maxTokens?**: `number`

Defined in: [types/proxy.ts:4038](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4038)

---

### temperature?

> `optional` **temperature?**: `number`

Defined in: [types/proxy.ts:4039](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4039)

---

### topP?

> `optional` **topP?**: `number`

Defined in: [types/proxy.ts:4040](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4040)

---

### systemPrompt?

> `optional` **systemPrompt?**: `string`

Defined in: [types/proxy.ts:4041](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4041)

---

### stream

> **stream**: `boolean`

Defined in: [types/proxy.ts:4042](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4042)

---

### prompt

> **prompt**: `string`

Defined in: [types/proxy.ts:4043](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4043)

---

### images

> **images**: `string`[]

Defined in: [types/proxy.ts:4044](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4044)

---

### conversationMessages

> **conversationMessages**: `object`[]

Defined in: [types/proxy.ts:4045](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4045)

#### role

> **role**: `string`

#### content

> **content**: `string`

---

### tools

> **tools**: `Record`\<`string`, \{ `description?`: `string`; `inputSchema`: `unknown`; `execute?`: (...`args`) => `unknown`; \}\>

Defined in: [types/proxy.ts:4046](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4046)

---

### stopSequences?

> `optional` **stopSequences?**: `string`[]

Defined in: [types/proxy.ts:4054](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4054)
