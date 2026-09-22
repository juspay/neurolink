[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / SageMakerGenerationOptions

# Type Alias: SageMakerGenerationOptions

> **SageMakerGenerationOptions** = `object`

Defined in: [types/providers.ts:1719](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1719)

Enhanced generation request options

## Properties

### prompt

> **prompt**: `string`

Defined in: [types/providers.ts:1721](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1721)

Input prompt text

---

### systemPrompt?

> `optional` **systemPrompt?**: `string`

Defined in: [types/providers.ts:1723](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1723)

System prompt for context

---

### maxTokens?

> `optional` **maxTokens?**: `number`

Defined in: [types/providers.ts:1725](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1725)

Maximum tokens to generate

---

### temperature?

> `optional` **temperature?**: `number`

Defined in: [types/providers.ts:1727](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1727)

Temperature for randomness (0-1)

---

### topP?

> `optional` **topP?**: `number`

Defined in: [types/providers.ts:1729](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1729)

Top-p nucleus sampling (0-1)

---

### topK?

> `optional` **topK?**: `number`

Defined in: [types/providers.ts:1731](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1731)

Top-k sampling

---

### stopSequences?

> `optional` **stopSequences?**: `string`[]

Defined in: [types/providers.ts:1733](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1733)

Stop sequences to end generation

---

### stream?

> `optional` **stream?**: `boolean`

Defined in: [types/providers.ts:1735](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1735)

Enable streaming response

---

### tools?

> `optional` **tools?**: `object`[]

Defined in: [types/providers.ts:1737](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1737)

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

Defined in: [types/providers.ts:1743](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1743)

Tool choice mode
