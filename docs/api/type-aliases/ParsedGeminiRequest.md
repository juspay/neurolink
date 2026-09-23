[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ParsedGeminiRequest

# Type Alias: ParsedGeminiRequest

> **ParsedGeminiRequest** = `object`

Defined in: [types/proxy.ts:3943](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3943)

A Gemini `generateContent` request, reduced to what translation needs.

Google's shape differs from both others in three ways that matter here:
roles are `user`/`model` rather than `user`/`assistant`, the system prompt
lives in a sibling `systemInstruction` rather than in the turn list, and
generation settings are nested under `generationConfig` instead of sitting
at the top level.

## Properties

### model

> **model**: `string`

Defined in: [types/proxy.ts:3944](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3944)

---

### maxTokens?

> `optional` **maxTokens?**: `number`

Defined in: [types/proxy.ts:3945](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3945)

---

### temperature?

> `optional` **temperature?**: `number`

Defined in: [types/proxy.ts:3946](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3946)

---

### topP?

> `optional` **topP?**: `number`

Defined in: [types/proxy.ts:3947](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3947)

---

### systemPrompt?

> `optional` **systemPrompt?**: `string`

Defined in: [types/proxy.ts:3948](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3948)

---

### stream

> **stream**: `boolean`

Defined in: [types/proxy.ts:3949](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3949)

---

### prompt

> **prompt**: `string`

Defined in: [types/proxy.ts:3950](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3950)

---

### images

> **images**: `string`[]

Defined in: [types/proxy.ts:3951](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3951)

---

### conversationMessages

> **conversationMessages**: `object`[]

Defined in: [types/proxy.ts:3952](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3952)

#### role

> **role**: `string`

#### content

> **content**: `string`

---

### tools

> **tools**: `Record`\<`string`, \{ `description?`: `string`; `inputSchema`: `unknown`; `execute?`: (...`args`) => `unknown`; \}\>

Defined in: [types/proxy.ts:3953](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3953)

---

### stopSequences?

> `optional` **stopSequences?**: `string`[]

Defined in: [types/proxy.ts:3961](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3961)
