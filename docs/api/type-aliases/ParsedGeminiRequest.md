[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ParsedGeminiRequest

# Type Alias: ParsedGeminiRequest

> **ParsedGeminiRequest** = `object`

Defined in: [types/proxy.ts:3716](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3716)

A Gemini `generateContent` request, reduced to what translation needs.

Google's shape differs from both others in three ways that matter here:
roles are `user`/`model` rather than `user`/`assistant`, the system prompt
lives in a sibling `systemInstruction` rather than in the turn list, and
generation settings are nested under `generationConfig` instead of sitting
at the top level.

## Properties

### model

> **model**: `string`

Defined in: [types/proxy.ts:3717](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3717)

---

### maxTokens?

> `optional` **maxTokens?**: `number`

Defined in: [types/proxy.ts:3718](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3718)

---

### temperature?

> `optional` **temperature?**: `number`

Defined in: [types/proxy.ts:3719](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3719)

---

### topP?

> `optional` **topP?**: `number`

Defined in: [types/proxy.ts:3720](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3720)

---

### systemPrompt?

> `optional` **systemPrompt?**: `string`

Defined in: [types/proxy.ts:3721](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3721)

---

### stream

> **stream**: `boolean`

Defined in: [types/proxy.ts:3722](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3722)

---

### prompt

> **prompt**: `string`

Defined in: [types/proxy.ts:3723](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3723)

---

### images

> **images**: `string`[]

Defined in: [types/proxy.ts:3724](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3724)

---

### conversationMessages

> **conversationMessages**: `object`[]

Defined in: [types/proxy.ts:3725](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3725)

#### role

> **role**: `string`

#### content

> **content**: `string`

---

### tools

> **tools**: `Record`\<`string`, \{ `description?`: `string`; `inputSchema`: `unknown`; `execute?`: (...`args`) => `unknown`; \}\>

Defined in: [types/proxy.ts:3726](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3726)

---

### stopSequences?

> `optional` **stopSequences?**: `string`[]

Defined in: [types/proxy.ts:3734](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3734)
