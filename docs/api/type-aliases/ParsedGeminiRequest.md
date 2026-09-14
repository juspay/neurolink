[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ParsedGeminiRequest

# Type Alias: ParsedGeminiRequest

> **ParsedGeminiRequest** = `object`

Defined in: [types/proxy.ts:3677](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3677)

A Gemini `generateContent` request, reduced to what translation needs.

Google's shape differs from both others in three ways that matter here:
roles are `user`/`model` rather than `user`/`assistant`, the system prompt
lives in a sibling `systemInstruction` rather than in the turn list, and
generation settings are nested under `generationConfig` instead of sitting
at the top level.

## Properties

### model

> **model**: `string`

Defined in: [types/proxy.ts:3678](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3678)

---

### maxTokens?

> `optional` **maxTokens?**: `number`

Defined in: [types/proxy.ts:3679](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3679)

---

### temperature?

> `optional` **temperature?**: `number`

Defined in: [types/proxy.ts:3680](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3680)

---

### topP?

> `optional` **topP?**: `number`

Defined in: [types/proxy.ts:3681](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3681)

---

### systemPrompt?

> `optional` **systemPrompt?**: `string`

Defined in: [types/proxy.ts:3682](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3682)

---

### stream

> **stream**: `boolean`

Defined in: [types/proxy.ts:3683](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3683)

---

### prompt

> **prompt**: `string`

Defined in: [types/proxy.ts:3684](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3684)

---

### images

> **images**: `string`[]

Defined in: [types/proxy.ts:3685](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3685)

---

### conversationMessages

> **conversationMessages**: `object`[]

Defined in: [types/proxy.ts:3686](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3686)

#### role

> **role**: `string`

#### content

> **content**: `string`

---

### tools

> **tools**: `Record`\<`string`, \{ `description?`: `string`; `inputSchema`: `unknown`; `execute?`: (...`args`) => `unknown`; \}\>

Defined in: [types/proxy.ts:3687](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3687)

---

### stopSequences?

> `optional` **stopSequences?**: `string`[]

Defined in: [types/proxy.ts:3695](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3695)
