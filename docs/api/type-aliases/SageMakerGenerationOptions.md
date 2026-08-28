[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / SageMakerGenerationOptions

# Type Alias: SageMakerGenerationOptions

> **SageMakerGenerationOptions** = `object`

Defined in: [types/providers.ts:1643](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1643)

Enhanced generation request options

## Properties

### prompt

> **prompt**: `string`

Defined in: [types/providers.ts:1645](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1645)

Input prompt text

---

### systemPrompt?

> `optional` **systemPrompt?**: `string`

Defined in: [types/providers.ts:1647](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1647)

System prompt for context

---

### maxTokens?

> `optional` **maxTokens?**: `number`

Defined in: [types/providers.ts:1649](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1649)

Maximum tokens to generate

---

### temperature?

> `optional` **temperature?**: `number`

Defined in: [types/providers.ts:1651](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1651)

Temperature for randomness (0-1)

---

### topP?

> `optional` **topP?**: `number`

Defined in: [types/providers.ts:1653](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1653)

Top-p nucleus sampling (0-1)

---

### topK?

> `optional` **topK?**: `number`

Defined in: [types/providers.ts:1655](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1655)

Top-k sampling

---

### stopSequences?

> `optional` **stopSequences?**: `string`[]

Defined in: [types/providers.ts:1657](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1657)

Stop sequences to end generation

---

### stream?

> `optional` **stream?**: `boolean`

Defined in: [types/providers.ts:1659](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1659)

Enable streaming response

---

### tools?

> `optional` **tools?**: `object`[]

Defined in: [types/providers.ts:1661](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1661)

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

Defined in: [types/providers.ts:1667](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1667)

Tool choice mode
