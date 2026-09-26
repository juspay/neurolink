[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / SageMakerGenerationOptions

# Type Alias: SageMakerGenerationOptions

> **SageMakerGenerationOptions** = `object`

Enhanced generation request options

## Properties

### prompt

> **prompt**: `string`

Input prompt text

---

### systemPrompt?

> `optional` **systemPrompt?**: `string`

System prompt for context

---

### maxTokens?

> `optional` **maxTokens?**: `number`

Maximum tokens to generate

---

### temperature?

> `optional` **temperature?**: `number`

Temperature for randomness (0-1)

---

### topP?

> `optional` **topP?**: `number`

Top-p nucleus sampling (0-1)

---

### topK?

> `optional` **topK?**: `number`

Top-k sampling

---

### stopSequences?

> `optional` **stopSequences?**: `string`[]

Stop sequences to end generation

---

### stream?

> `optional` **stream?**: `boolean`

Enable streaming response

---

### tools?

> `optional` **tools?**: `object`[]

Tools available for function calling

#### name

> **name**: `string`

#### description

> **description**: `string`

#### parameters

> **parameters**: `Record`\<`string`, `unknown`\>

---

### toolChoice?

> `optional` **toolChoice?**: `"auto"` \| `"none"` \| \{ `type`: `"tool"`; `name`: `string`; \}

Tool choice mode
