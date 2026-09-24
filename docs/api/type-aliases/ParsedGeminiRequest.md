[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ParsedGeminiRequest

# Type Alias: ParsedGeminiRequest

> **ParsedGeminiRequest** = `object`

Defined in: [types/proxy.ts:3966](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3966)

A Gemini `generateContent` request, reduced to what translation needs.

Google's shape differs from both others in three ways that matter here:
roles are `user`/`model` rather than `user`/`assistant`, the system prompt
lives in a sibling `systemInstruction` rather than in the turn list, and
generation settings are nested under `generationConfig` instead of sitting
at the top level.

## Properties

### model

> **model**: `string`

Defined in: [types/proxy.ts:3967](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3967)

---

### maxTokens?

> `optional` **maxTokens?**: `number`

Defined in: [types/proxy.ts:3968](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3968)

---

### temperature?

> `optional` **temperature?**: `number`

Defined in: [types/proxy.ts:3969](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3969)

---

### topP?

> `optional` **topP?**: `number`

Defined in: [types/proxy.ts:3970](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3970)

---

### systemPrompt?

> `optional` **systemPrompt?**: `string`

Defined in: [types/proxy.ts:3971](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3971)

---

### stream

> **stream**: `boolean`

Defined in: [types/proxy.ts:3972](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3972)

---

### prompt

> **prompt**: `string`

Defined in: [types/proxy.ts:3973](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3973)

---

### images

> **images**: `string`[]

Defined in: [types/proxy.ts:3974](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3974)

---

### conversationMessages

> **conversationMessages**: `object`[]

Defined in: [types/proxy.ts:3975](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3975)

#### role

> **role**: `string`

#### content

> **content**: `string`

---

### tools

> **tools**: `Record`\<`string`, \{ `description?`: `string`; `inputSchema`: `unknown`; `execute?`: (...`args`) => `unknown`; \}\>

Defined in: [types/proxy.ts:3976](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3976)

---

### stopSequences?

> `optional` **stopSequences?**: `string`[]

Defined in: [types/proxy.ts:3984](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3984)
