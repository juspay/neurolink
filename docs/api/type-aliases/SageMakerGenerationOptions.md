[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / SageMakerGenerationOptions

# Type Alias: SageMakerGenerationOptions

> **SageMakerGenerationOptions** = `object`

Defined in: [types/providers.ts:1714](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1714)

Enhanced generation request options

## Properties

### prompt

> **prompt**: `string`

Defined in: [types/providers.ts:1716](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1716)

Input prompt text

---

### systemPrompt?

> `optional` **systemPrompt?**: `string`

Defined in: [types/providers.ts:1718](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1718)

System prompt for context

---

### maxTokens?

> `optional` **maxTokens?**: `number`

Defined in: [types/providers.ts:1720](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1720)

Maximum tokens to generate

---

### temperature?

> `optional` **temperature?**: `number`

Defined in: [types/providers.ts:1722](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1722)

Temperature for randomness (0-1)

---

### topP?

> `optional` **topP?**: `number`

Defined in: [types/providers.ts:1724](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1724)

Top-p nucleus sampling (0-1)

---

### topK?

> `optional` **topK?**: `number`

Defined in: [types/providers.ts:1726](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1726)

Top-k sampling

---

### stopSequences?

> `optional` **stopSequences?**: `string`[]

Defined in: [types/providers.ts:1728](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1728)

Stop sequences to end generation

---

### stream?

> `optional` **stream?**: `boolean`

Defined in: [types/providers.ts:1730](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1730)

Enable streaming response

---

### tools?

> `optional` **tools?**: `object`[]

Defined in: [types/providers.ts:1732](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1732)

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

Defined in: [types/providers.ts:1738](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1738)

Tool choice mode
