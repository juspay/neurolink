[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ParsedGeminiRequest

# Type Alias: ParsedGeminiRequest

> **ParsedGeminiRequest** = `object`

Defined in: [types/proxy.ts:3338](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3338)

A Gemini `generateContent` request, reduced to what translation needs.

Google's shape differs from both others in three ways that matter here:
roles are `user`/`model` rather than `user`/`assistant`, the system prompt
lives in a sibling `systemInstruction` rather than in the turn list, and
generation settings are nested under `generationConfig` instead of sitting
at the top level.

## Properties

### model

> **model**: `string`

Defined in: [types/proxy.ts:3339](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3339)

---

### maxTokens?

> `optional` **maxTokens?**: `number`

Defined in: [types/proxy.ts:3340](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3340)

---

### temperature?

> `optional` **temperature?**: `number`

Defined in: [types/proxy.ts:3341](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3341)

---

### topP?

> `optional` **topP?**: `number`

Defined in: [types/proxy.ts:3342](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3342)

---

### systemPrompt?

> `optional` **systemPrompt?**: `string`

Defined in: [types/proxy.ts:3343](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3343)

---

### stream

> **stream**: `boolean`

Defined in: [types/proxy.ts:3344](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3344)

---

### prompt

> **prompt**: `string`

Defined in: [types/proxy.ts:3345](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3345)

---

### images

> **images**: `string`[]

Defined in: [types/proxy.ts:3346](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3346)

---

### conversationMessages

> **conversationMessages**: `object`[]

Defined in: [types/proxy.ts:3347](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3347)

#### role

> **role**: `string`

#### content

> **content**: `string`

---

### tools

> **tools**: `Record`\<`string`, \{ `description?`: `string`; `inputSchema`: `unknown`; `execute?`: (...`args`) => `unknown`; \}\>

Defined in: [types/proxy.ts:3348](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3348)

---

### stopSequences?

> `optional` **stopSequences?**: `string`[]

Defined in: [types/proxy.ts:3356](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3356)
