[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ParsedGeminiRequest

# Type Alias: ParsedGeminiRequest

> **ParsedGeminiRequest** = `object`

Defined in: [types/proxy.ts:3246](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3246)

A Gemini `generateContent` request, reduced to what translation needs.

Google's shape differs from both others in three ways that matter here:
roles are `user`/`model` rather than `user`/`assistant`, the system prompt
lives in a sibling `systemInstruction` rather than in the turn list, and
generation settings are nested under `generationConfig` instead of sitting
at the top level.

## Properties

### model

> **model**: `string`

Defined in: [types/proxy.ts:3247](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3247)

---

### maxTokens?

> `optional` **maxTokens?**: `number`

Defined in: [types/proxy.ts:3248](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3248)

---

### temperature?

> `optional` **temperature?**: `number`

Defined in: [types/proxy.ts:3249](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3249)

---

### topP?

> `optional` **topP?**: `number`

Defined in: [types/proxy.ts:3250](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3250)

---

### systemPrompt?

> `optional` **systemPrompt?**: `string`

Defined in: [types/proxy.ts:3251](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3251)

---

### stream

> **stream**: `boolean`

Defined in: [types/proxy.ts:3252](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3252)

---

### prompt

> **prompt**: `string`

Defined in: [types/proxy.ts:3253](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3253)

---

### images

> **images**: `string`[]

Defined in: [types/proxy.ts:3254](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3254)

---

### conversationMessages

> **conversationMessages**: `object`[]

Defined in: [types/proxy.ts:3255](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3255)

#### role

> **role**: `string`

#### content

> **content**: `string`

---

### tools

> **tools**: `Record`\<`string`, \{ `description?`: `string`; `inputSchema`: `unknown`; `execute?`: (...`args`) => `unknown`; \}\>

Defined in: [types/proxy.ts:3256](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3256)

---

### stopSequences?

> `optional` **stopSequences?**: `string`[]

Defined in: [types/proxy.ts:3264](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3264)
