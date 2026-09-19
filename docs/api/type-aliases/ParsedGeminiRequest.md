[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ParsedGeminiRequest

# Type Alias: ParsedGeminiRequest

> **ParsedGeminiRequest** = `object`

Defined in: [types/proxy.ts:3846](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3846)

A Gemini `generateContent` request, reduced to what translation needs.

Google's shape differs from both others in three ways that matter here:
roles are `user`/`model` rather than `user`/`assistant`, the system prompt
lives in a sibling `systemInstruction` rather than in the turn list, and
generation settings are nested under `generationConfig` instead of sitting
at the top level.

## Properties

### model

> **model**: `string`

Defined in: [types/proxy.ts:3847](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3847)

---

### maxTokens?

> `optional` **maxTokens?**: `number`

Defined in: [types/proxy.ts:3848](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3848)

---

### temperature?

> `optional` **temperature?**: `number`

Defined in: [types/proxy.ts:3849](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3849)

---

### topP?

> `optional` **topP?**: `number`

Defined in: [types/proxy.ts:3850](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3850)

---

### systemPrompt?

> `optional` **systemPrompt?**: `string`

Defined in: [types/proxy.ts:3851](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3851)

---

### stream

> **stream**: `boolean`

Defined in: [types/proxy.ts:3852](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3852)

---

### prompt

> **prompt**: `string`

Defined in: [types/proxy.ts:3853](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3853)

---

### images

> **images**: `string`[]

Defined in: [types/proxy.ts:3854](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3854)

---

### conversationMessages

> **conversationMessages**: `object`[]

Defined in: [types/proxy.ts:3855](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3855)

#### role

> **role**: `string`

#### content

> **content**: `string`

---

### tools

> **tools**: `Record`\<`string`, \{ `description?`: `string`; `inputSchema`: `unknown`; `execute?`: (...`args`) => `unknown`; \}\>

Defined in: [types/proxy.ts:3856](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3856)

---

### stopSequences?

> `optional` **stopSequences?**: `string`[]

Defined in: [types/proxy.ts:3864](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3864)
