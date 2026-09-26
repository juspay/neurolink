[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ParsedGeminiRequest

# Type Alias: ParsedGeminiRequest

> **ParsedGeminiRequest** = `object`

Defined in: [types/proxy.ts:4098](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4098)

A Gemini `generateContent` request, reduced to what translation needs.

Google's shape differs from both others in three ways that matter here:
roles are `user`/`model` rather than `user`/`assistant`, the system prompt
lives in a sibling `systemInstruction` rather than in the turn list, and
generation settings are nested under `generationConfig` instead of sitting
at the top level.

## Properties

### model

> **model**: `string`

Defined in: [types/proxy.ts:4099](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4099)

---

### maxTokens?

> `optional` **maxTokens?**: `number`

Defined in: [types/proxy.ts:4100](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4100)

---

### temperature?

> `optional` **temperature?**: `number`

Defined in: [types/proxy.ts:4101](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4101)

---

### topP?

> `optional` **topP?**: `number`

Defined in: [types/proxy.ts:4102](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4102)

---

### systemPrompt?

> `optional` **systemPrompt?**: `string`

Defined in: [types/proxy.ts:4103](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4103)

---

### stream

> **stream**: `boolean`

Defined in: [types/proxy.ts:4104](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4104)

---

### prompt

> **prompt**: `string`

Defined in: [types/proxy.ts:4105](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4105)

---

### images

> **images**: `string`[]

Defined in: [types/proxy.ts:4106](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4106)

---

### conversationMessages

> **conversationMessages**: `object`[]

Defined in: [types/proxy.ts:4107](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4107)

#### role

> **role**: `string`

#### content

> **content**: `string`

---

### tools

> **tools**: `Record`\<`string`, \{ `description?`: `string`; `inputSchema`: `unknown`; `execute?`: (...`args`) => `unknown`; \}\>

Defined in: [types/proxy.ts:4108](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4108)

---

### stopSequences?

> `optional` **stopSequences?**: `string`[]

Defined in: [types/proxy.ts:4116](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4116)
