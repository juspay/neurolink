[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ParsedGeminiRequest

# Type Alias: ParsedGeminiRequest

> **ParsedGeminiRequest** = `object`

Defined in: [types/proxy.ts:3367](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3367)

A Gemini `generateContent` request, reduced to what translation needs.

Google's shape differs from both others in three ways that matter here:
roles are `user`/`model` rather than `user`/`assistant`, the system prompt
lives in a sibling `systemInstruction` rather than in the turn list, and
generation settings are nested under `generationConfig` instead of sitting
at the top level.

## Properties

### model

> **model**: `string`

Defined in: [types/proxy.ts:3368](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3368)

---

### maxTokens?

> `optional` **maxTokens?**: `number`

Defined in: [types/proxy.ts:3369](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3369)

---

### temperature?

> `optional` **temperature?**: `number`

Defined in: [types/proxy.ts:3370](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3370)

---

### topP?

> `optional` **topP?**: `number`

Defined in: [types/proxy.ts:3371](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3371)

---

### systemPrompt?

> `optional` **systemPrompt?**: `string`

Defined in: [types/proxy.ts:3372](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3372)

---

### stream

> **stream**: `boolean`

Defined in: [types/proxy.ts:3373](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3373)

---

### prompt

> **prompt**: `string`

Defined in: [types/proxy.ts:3374](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3374)

---

### images

> **images**: `string`[]

Defined in: [types/proxy.ts:3375](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3375)

---

### conversationMessages

> **conversationMessages**: `object`[]

Defined in: [types/proxy.ts:3376](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3376)

#### role

> **role**: `string`

#### content

> **content**: `string`

---

### tools

> **tools**: `Record`\<`string`, \{ `description?`: `string`; `inputSchema`: `unknown`; `execute?`: (...`args`) => `unknown`; \}\>

Defined in: [types/proxy.ts:3377](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3377)

---

### stopSequences?

> `optional` **stopSequences?**: `string`[]

Defined in: [types/proxy.ts:3385](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3385)
