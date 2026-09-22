[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / SageMakerGenerateResult

# Type Alias: SageMakerGenerateResult

> **SageMakerGenerateResult** = `object`

Defined in: [types/providers.ts:1899](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1899)

SageMaker generation result type for better type safety

## Properties

### text?

> `optional` **text?**: `string`

Defined in: [types/providers.ts:1900](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1900)

---

### reasoning?

> `optional` **reasoning?**: `string` \| (\{ `type`: `"text"`; `text`: `string`; `signature?`: `string`; \} \| \{ `type`: `"redacted"`; `data`: `string`; \})[]

Defined in: [types/providers.ts:1901](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1901)

---

### files?

> `optional` **files?**: `object`[]

Defined in: [types/providers.ts:1907](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1907)

#### data

> **data**: `string` \| `Uint8Array`

#### mimeType

> **mimeType**: `string`

---

### logprobs?

> `optional` **logprobs?**: `object`[]

Defined in: [types/providers.ts:1908](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1908)

#### token

> **token**: `string`

#### logprob

> **logprob**: `number`

#### topLogprobs

> **topLogprobs**: `object`[]

---

### usage

> **usage**: `object`

Defined in: [types/providers.ts:1913](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1913)

#### promptTokens

> **promptTokens**: `number`

#### completionTokens

> **completionTokens**: `number`

#### totalTokens?

> `optional` **totalTokens?**: `number`

---

### finishReason

> **finishReason**: `"stop"` \| `"length"` \| `"content-filter"` \| `"tool-calls"` \| `"error"` \| `"unknown"`

Defined in: [types/providers.ts:1918](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1918)

---

### warnings?

> `optional` **warnings?**: `object`[]

Defined in: [types/providers.ts:1925](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1925)

#### type

> **type**: `"other"`

#### message

> **message**: `string`

---

### rawCall

> **rawCall**: `object`

Defined in: [types/providers.ts:1926](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1926)

#### rawPrompt

> **rawPrompt**: `unknown`

#### rawSettings

> **rawSettings**: `Record`\<`string`, `unknown`\>

---

### rawResponse?

> `optional` **rawResponse?**: `object`

Defined in: [types/providers.ts:1927](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1927)

#### headers?

> `optional` **headers?**: `Record`\<`string`, `string`\>

---

### request?

> `optional` **request?**: `object`

Defined in: [types/providers.ts:1928](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1928)

#### body?

> `optional` **body?**: `string`

---

### toolCalls?

> `optional` **toolCalls?**: [`SageMakerToolCall`](SageMakerToolCall.md)[]

Defined in: [types/providers.ts:1929](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1929)

---

### object?

> `optional` **object?**: `unknown`

Defined in: [types/providers.ts:1930](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1930)
