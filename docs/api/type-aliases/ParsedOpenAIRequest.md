[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ParsedOpenAIRequest

# Type Alias: ParsedOpenAIRequest

> **ParsedOpenAIRequest** = `object`

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

### toolChoice?

> `optional` **toolChoice?**: `"auto"` \| `"required"` \| `"none"`

---

### toolChoiceName?

> `optional` **toolChoiceName?**: `string`

---

### stopSequences?

> `optional` **stopSequences?**: `string`[]

---

### responseFormat?

> `optional` **responseFormat?**: `object`

#### type

> **type**: `string`

#### jsonSchema?

> `optional` **jsonSchema?**: `unknown`
