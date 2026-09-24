[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ParsedGeminiRequest

# Type Alias: ParsedGeminiRequest

> **ParsedGeminiRequest** = `object`

Defined in: [types/proxy.ts:4088](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4088)

A Gemini `generateContent` request, reduced to what translation needs.

Google's shape differs from both others in three ways that matter here:
roles are `user`/`model` rather than `user`/`assistant`, the system prompt
lives in a sibling `systemInstruction` rather than in the turn list, and
generation settings are nested under `generationConfig` instead of sitting
at the top level.

## Properties

### model

> **model**: `string`

Defined in: [types/proxy.ts:4089](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4089)

---

### maxTokens?

> `optional` **maxTokens?**: `number`

Defined in: [types/proxy.ts:4090](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4090)

---

### temperature?

> `optional` **temperature?**: `number`

Defined in: [types/proxy.ts:4091](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4091)

---

### topP?

> `optional` **topP?**: `number`

Defined in: [types/proxy.ts:4092](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4092)

---

### systemPrompt?

> `optional` **systemPrompt?**: `string`

Defined in: [types/proxy.ts:4093](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4093)

---

### stream

> **stream**: `boolean`

Defined in: [types/proxy.ts:4094](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4094)

---

### prompt

> **prompt**: `string`

Defined in: [types/proxy.ts:4095](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4095)

---

### images

> **images**: `string`[]

Defined in: [types/proxy.ts:4096](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4096)

---

### conversationMessages

> **conversationMessages**: `object`[]

Defined in: [types/proxy.ts:4097](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4097)

#### role

> **role**: `string`

#### content

> **content**: `string`

---

### tools

> **tools**: `Record`\<`string`, \{ `description?`: `string`; `inputSchema`: `unknown`; `execute?`: (...`args`) => `unknown`; \}\>

Defined in: [types/proxy.ts:4098](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4098)

---

### stopSequences?

> `optional` **stopSequences?**: `string`[]

Defined in: [types/proxy.ts:4106](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4106)
