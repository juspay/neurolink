[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / SageMakerGenerationOptions

# Type Alias: SageMakerGenerationOptions

> **SageMakerGenerationOptions** = `object`

Defined in: [types/providers.ts:1741](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1741)

Enhanced generation request options

## Properties

### prompt

> **prompt**: `string`

Defined in: [types/providers.ts:1743](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1743)

Input prompt text

---

### systemPrompt?

> `optional` **systemPrompt?**: `string`

Defined in: [types/providers.ts:1745](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1745)

System prompt for context

---

### maxTokens?

> `optional` **maxTokens?**: `number`

Defined in: [types/providers.ts:1747](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1747)

Maximum tokens to generate

---

### temperature?

> `optional` **temperature?**: `number`

Defined in: [types/providers.ts:1749](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1749)

Temperature for randomness (0-1)

---

### topP?

> `optional` **topP?**: `number`

Defined in: [types/providers.ts:1751](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1751)

Top-p nucleus sampling (0-1)

---

### topK?

> `optional` **topK?**: `number`

Defined in: [types/providers.ts:1753](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1753)

Top-k sampling

---

### stopSequences?

> `optional` **stopSequences?**: `string`[]

Defined in: [types/providers.ts:1755](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1755)

Stop sequences to end generation

---

### stream?

> `optional` **stream?**: `boolean`

Defined in: [types/providers.ts:1757](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1757)

Enable streaming response

---

### tools?

> `optional` **tools?**: `object`[]

Defined in: [types/providers.ts:1759](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1759)

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

Defined in: [types/providers.ts:1765](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1765)

Tool choice mode
