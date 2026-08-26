[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / SageMakerGenerationOptions

# Type Alias: SageMakerGenerationOptions

> **SageMakerGenerationOptions** = `object`

Defined in: [types/providers.ts:1640](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1640)

Enhanced generation request options

## Properties

### prompt

> **prompt**: `string`

Defined in: [types/providers.ts:1642](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1642)

Input prompt text

---

### systemPrompt?

> `optional` **systemPrompt?**: `string`

Defined in: [types/providers.ts:1644](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1644)

System prompt for context

---

### maxTokens?

> `optional` **maxTokens?**: `number`

Defined in: [types/providers.ts:1646](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1646)

Maximum tokens to generate

---

### temperature?

> `optional` **temperature?**: `number`

Defined in: [types/providers.ts:1648](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1648)

Temperature for randomness (0-1)

---

### topP?

> `optional` **topP?**: `number`

Defined in: [types/providers.ts:1650](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1650)

Top-p nucleus sampling (0-1)

---

### topK?

> `optional` **topK?**: `number`

Defined in: [types/providers.ts:1652](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1652)

Top-k sampling

---

### stopSequences?

> `optional` **stopSequences?**: `string`[]

Defined in: [types/providers.ts:1654](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1654)

Stop sequences to end generation

---

### stream?

> `optional` **stream?**: `boolean`

Defined in: [types/providers.ts:1656](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1656)

Enable streaming response

---

### tools?

> `optional` **tools?**: `object`[]

Defined in: [types/providers.ts:1658](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1658)

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

Defined in: [types/providers.ts:1664](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1664)

Tool choice mode
