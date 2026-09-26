[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ClientLanguageModelCallOptions

# Type Alias: ClientLanguageModelCallOptions

> **ClientLanguageModelCallOptions** = `object`

Language model call options

## Properties

### prompt

> **prompt**: `string`

Input prompt

---

### system?

> `optional` **system?**: `string`

System prompt

---

### messages?

> `optional` **messages?**: `object`[]

Messages for conversation

#### role

> **role**: `"user"` \| `"assistant"` \| `"system"`

#### content

> **content**: `string`

---

### temperature?

> `optional` **temperature?**: `number`

Temperature

---

### maxTokens?

> `optional` **maxTokens?**: `number`

Maximum tokens

---

### stopSequences?

> `optional` **stopSequences?**: `string`[]

Stop sequences

---

### abortSignal?

> `optional` **abortSignal?**: `AbortSignal`

Abort signal
