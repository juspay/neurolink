[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / SageMakerGenerateResult

# Type Alias: SageMakerGenerateResult

> **SageMakerGenerateResult** = `object`

Defined in: [types/providers.ts:1851](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1851)

SageMaker generation result type for better type safety

## Properties

### text?

> `optional` **text?**: `string`

Defined in: [types/providers.ts:1852](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1852)

---

### reasoning?

> `optional` **reasoning?**: `string` \| (\{ `type`: `"text"`; `text`: `string`; `signature?`: `string`; \} \| \{ `type`: `"redacted"`; `data`: `string`; \})[]

Defined in: [types/providers.ts:1853](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1853)

---

### files?

> `optional` **files?**: `object`[]

Defined in: [types/providers.ts:1859](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1859)

#### data

> **data**: `string` \| `Uint8Array`

#### mimeType

> **mimeType**: `string`

---

### logprobs?

> `optional` **logprobs?**: `object`[]

Defined in: [types/providers.ts:1860](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1860)

#### token

> **token**: `string`

#### logprob

> **logprob**: `number`

#### topLogprobs

> **topLogprobs**: `object`[]

---

### usage

> **usage**: `object`

Defined in: [types/providers.ts:1865](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1865)

#### promptTokens

> **promptTokens**: `number`

#### completionTokens

> **completionTokens**: `number`

#### totalTokens?

> `optional` **totalTokens?**: `number`

---

### finishReason

> **finishReason**: `"stop"` \| `"length"` \| `"content-filter"` \| `"tool-calls"` \| `"error"` \| `"unknown"`

Defined in: [types/providers.ts:1870](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1870)

---

### warnings?

> `optional` **warnings?**: `object`[]

Defined in: [types/providers.ts:1877](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1877)

#### type

> **type**: `"other"`

#### message

> **message**: `string`

---

### rawCall

> **rawCall**: `object`

Defined in: [types/providers.ts:1878](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1878)

#### rawPrompt

> **rawPrompt**: `unknown`

#### rawSettings

> **rawSettings**: `Record`\<`string`, `unknown`\>

---

### rawResponse?

> `optional` **rawResponse?**: `object`

Defined in: [types/providers.ts:1879](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1879)

#### headers?

> `optional` **headers?**: `Record`\<`string`, `string`\>

---

### request?

> `optional` **request?**: `object`

Defined in: [types/providers.ts:1880](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1880)

#### body?

> `optional` **body?**: `string`

---

### toolCalls?

> `optional` **toolCalls?**: [`SageMakerToolCall`](SageMakerToolCall.md)[]

Defined in: [types/providers.ts:1881](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1881)

---

### object?

> `optional` **object?**: `unknown`

Defined in: [types/providers.ts:1882](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1882)
