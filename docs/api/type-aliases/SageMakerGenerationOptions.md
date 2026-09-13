[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / SageMakerGenerationOptions

# Type Alias: SageMakerGenerationOptions

> **SageMakerGenerationOptions** = `object`

Defined in: [types/providers.ts:1658](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1658)

Enhanced generation request options

## Properties

### prompt

> **prompt**: `string`

Defined in: [types/providers.ts:1660](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1660)

Input prompt text

---

### systemPrompt?

> `optional` **systemPrompt?**: `string`

Defined in: [types/providers.ts:1662](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1662)

System prompt for context

---

### maxTokens?

> `optional` **maxTokens?**: `number`

Defined in: [types/providers.ts:1664](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1664)

Maximum tokens to generate

---

### temperature?

> `optional` **temperature?**: `number`

Defined in: [types/providers.ts:1666](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1666)

Temperature for randomness (0-1)

---

### topP?

> `optional` **topP?**: `number`

Defined in: [types/providers.ts:1668](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1668)

Top-p nucleus sampling (0-1)

---

### topK?

> `optional` **topK?**: `number`

Defined in: [types/providers.ts:1670](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1670)

Top-k sampling

---

### stopSequences?

> `optional` **stopSequences?**: `string`[]

Defined in: [types/providers.ts:1672](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1672)

Stop sequences to end generation

---

### stream?

> `optional` **stream?**: `boolean`

Defined in: [types/providers.ts:1674](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1674)

Enable streaming response

---

### tools?

> `optional` **tools?**: `object`[]

Defined in: [types/providers.ts:1676](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1676)

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

Defined in: [types/providers.ts:1682](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1682)

Tool choice mode
