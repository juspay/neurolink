[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / SageMakerGenerationOptions

# Type Alias: SageMakerGenerationOptions

> **SageMakerGenerationOptions** = `object`

Defined in: [types/providers.ts:1722](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1722)

Enhanced generation request options

## Properties

### prompt

> **prompt**: `string`

Defined in: [types/providers.ts:1724](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1724)

Input prompt text

---

### systemPrompt?

> `optional` **systemPrompt?**: `string`

Defined in: [types/providers.ts:1726](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1726)

System prompt for context

---

### maxTokens?

> `optional` **maxTokens?**: `number`

Defined in: [types/providers.ts:1728](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1728)

Maximum tokens to generate

---

### temperature?

> `optional` **temperature?**: `number`

Defined in: [types/providers.ts:1730](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1730)

Temperature for randomness (0-1)

---

### topP?

> `optional` **topP?**: `number`

Defined in: [types/providers.ts:1732](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1732)

Top-p nucleus sampling (0-1)

---

### topK?

> `optional` **topK?**: `number`

Defined in: [types/providers.ts:1734](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1734)

Top-k sampling

---

### stopSequences?

> `optional` **stopSequences?**: `string`[]

Defined in: [types/providers.ts:1736](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1736)

Stop sequences to end generation

---

### stream?

> `optional` **stream?**: `boolean`

Defined in: [types/providers.ts:1738](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1738)

Enable streaming response

---

### tools?

> `optional` **tools?**: `object`[]

Defined in: [types/providers.ts:1740](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1740)

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

Defined in: [types/providers.ts:1746](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1746)

Tool choice mode
