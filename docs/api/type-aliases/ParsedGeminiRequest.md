[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ParsedGeminiRequest

# Type Alias: ParsedGeminiRequest

> **ParsedGeminiRequest** = `object`

A Gemini `generateContent` request, reduced to what translation needs.

Google's shape differs from both others in three ways that matter here:
roles are `user`/`model` rather than `user`/`assistant`, the system prompt
lives in a sibling `systemInstruction` rather than in the turn list, and
generation settings are nested under `generationConfig` instead of sitting
at the top level.

## Properties

### model

> **model**: `string`

---

### maxTokens?

> `optional` **maxTokens?**: `number`

---

### temperature?

> `optional` **temperature?**: `number`

---

### topP?

> `optional` **topP?**: `number`

---

### systemPrompt?

> `optional` **systemPrompt?**: `string`

---

### stream

> **stream**: `boolean`

---

### prompt

> **prompt**: `string`

---

### images

> **images**: `string`[]

---

### conversationMessages

> **conversationMessages**: `object`[]

#### role

> **role**: `string`

#### content

> **content**: `string`

---

### tools

> **tools**: `Record`\<`string`, \{ `description?`: `string`; `inputSchema`: `unknown`; `execute?`: (...`args`) => `unknown`; \}\>

---

### stopSequences?

> `optional` **stopSequences?**: `string`[]
