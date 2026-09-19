[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / SageMakerGenerationOptions

# Type Alias: SageMakerGenerationOptions

> **SageMakerGenerationOptions** = `object`

Defined in: [types/providers.ts:1684](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1684)

Enhanced generation request options

## Properties

### prompt

> **prompt**: `string`

Defined in: [types/providers.ts:1686](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1686)

Input prompt text

---

### systemPrompt?

> `optional` **systemPrompt?**: `string`

Defined in: [types/providers.ts:1688](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1688)

System prompt for context

---

### maxTokens?

> `optional` **maxTokens?**: `number`

Defined in: [types/providers.ts:1690](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1690)

Maximum tokens to generate

---

### temperature?

> `optional` **temperature?**: `number`

Defined in: [types/providers.ts:1692](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1692)

Temperature for randomness (0-1)

---

### topP?

> `optional` **topP?**: `number`

Defined in: [types/providers.ts:1694](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1694)

Top-p nucleus sampling (0-1)

---

### topK?

> `optional` **topK?**: `number`

Defined in: [types/providers.ts:1696](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1696)

Top-k sampling

---

### stopSequences?

> `optional` **stopSequences?**: `string`[]

Defined in: [types/providers.ts:1698](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1698)

Stop sequences to end generation

---

### stream?

> `optional` **stream?**: `boolean`

Defined in: [types/providers.ts:1700](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1700)

Enable streaming response

---

### tools?

> `optional` **tools?**: `object`[]

Defined in: [types/providers.ts:1702](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1702)

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

Defined in: [types/providers.ts:1708](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1708)

Tool choice mode
