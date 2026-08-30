[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ParsedGeminiRequest

# Type Alias: ParsedGeminiRequest

> **ParsedGeminiRequest** = `object`

Defined in: [types/proxy.ts:3316](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3316)

A Gemini `generateContent` request, reduced to what translation needs.

Google's shape differs from both others in three ways that matter here:
roles are `user`/`model` rather than `user`/`assistant`, the system prompt
lives in a sibling `systemInstruction` rather than in the turn list, and
generation settings are nested under `generationConfig` instead of sitting
at the top level.

## Properties

### model

> **model**: `string`

Defined in: [types/proxy.ts:3317](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3317)

---

### maxTokens?

> `optional` **maxTokens?**: `number`

Defined in: [types/proxy.ts:3318](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3318)

---

### temperature?

> `optional` **temperature?**: `number`

Defined in: [types/proxy.ts:3319](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3319)

---

### topP?

> `optional` **topP?**: `number`

Defined in: [types/proxy.ts:3320](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3320)

---

### systemPrompt?

> `optional` **systemPrompt?**: `string`

Defined in: [types/proxy.ts:3321](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3321)

---

### stream

> **stream**: `boolean`

Defined in: [types/proxy.ts:3322](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3322)

---

### prompt

> **prompt**: `string`

Defined in: [types/proxy.ts:3323](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3323)

---

### images

> **images**: `string`[]

Defined in: [types/proxy.ts:3324](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3324)

---

### conversationMessages

> **conversationMessages**: `object`[]

Defined in: [types/proxy.ts:3325](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3325)

#### role

> **role**: `string`

#### content

> **content**: `string`

---

### tools

> **tools**: `Record`\<`string`, \{ `description?`: `string`; `inputSchema`: `unknown`; `execute?`: (...`args`) => `unknown`; \}\>

Defined in: [types/proxy.ts:3326](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3326)

---

### stopSequences?

> `optional` **stopSequences?**: `string`[]

Defined in: [types/proxy.ts:3334](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3334)
