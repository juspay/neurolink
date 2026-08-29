[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / SageMakerGenerationOptions

# Type Alias: SageMakerGenerationOptions

> **SageMakerGenerationOptions** = `object`

Defined in: [types/providers.ts:1653](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1653)

Enhanced generation request options

## Properties

### prompt

> **prompt**: `string`

Defined in: [types/providers.ts:1655](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1655)

Input prompt text

---

### systemPrompt?

> `optional` **systemPrompt?**: `string`

Defined in: [types/providers.ts:1657](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1657)

System prompt for context

---

### maxTokens?

> `optional` **maxTokens?**: `number`

Defined in: [types/providers.ts:1659](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1659)

Maximum tokens to generate

---

### temperature?

> `optional` **temperature?**: `number`

Defined in: [types/providers.ts:1661](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1661)

Temperature for randomness (0-1)

---

### topP?

> `optional` **topP?**: `number`

Defined in: [types/providers.ts:1663](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1663)

Top-p nucleus sampling (0-1)

---

### topK?

> `optional` **topK?**: `number`

Defined in: [types/providers.ts:1665](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1665)

Top-k sampling

---

### stopSequences?

> `optional` **stopSequences?**: `string`[]

Defined in: [types/providers.ts:1667](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1667)

Stop sequences to end generation

---

### stream?

> `optional` **stream?**: `boolean`

Defined in: [types/providers.ts:1669](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1669)

Enable streaming response

---

### tools?

> `optional` **tools?**: `object`[]

Defined in: [types/providers.ts:1671](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1671)

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

Defined in: [types/providers.ts:1677](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1677)

Tool choice mode
