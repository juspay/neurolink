[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / MinimalChatMessage

# Type Alias: MinimalChatMessage

> **MinimalChatMessage** = `object`

Reduced ChatMessage shape used by callers (typically tests and history
reconstructors) that pass synthetic entries into the Gemini history
reconstructor without filling every `ChatMessage` field. Mirrors the
fields actually read by `prependConversationMessages`.

## Properties

### role

> **role**: [`ChatMessage`](ChatMessage.md)\[`"role"`\]

---

### content

> **content**: `string`

---

### tool?

> `optional` **tool?**: `string`

---

### args?

> `optional` **args?**: `Record`\<`string`, `unknown`\>

---

### metadata?

> `optional` **metadata?**: `object`

#### stepIndex?

> `optional` **stepIndex?**: `number`

#### thoughtSignature?

> `optional` **thoughtSignature?**: `string`
