[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / SageMakerGenerateResult

# Type Alias: SageMakerGenerateResult

> **SageMakerGenerateResult** = `object`

Defined in: [types/providers.ts:1860](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1860)

SageMaker generation result type for better type safety

## Properties

### text?

> `optional` **text?**: `string`

Defined in: [types/providers.ts:1861](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1861)

---

### reasoning?

> `optional` **reasoning?**: `string` \| (\{ `type`: `"text"`; `text`: `string`; `signature?`: `string`; \} \| \{ `type`: `"redacted"`; `data`: `string`; \})[]

Defined in: [types/providers.ts:1862](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1862)

---

### files?

> `optional` **files?**: `object`[]

Defined in: [types/providers.ts:1868](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1868)

#### data

> **data**: `string` \| `Uint8Array`

#### mimeType

> **mimeType**: `string`

---

### logprobs?

> `optional` **logprobs?**: `object`[]

Defined in: [types/providers.ts:1869](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1869)

#### token

> **token**: `string`

#### logprob

> **logprob**: `number`

#### topLogprobs

> **topLogprobs**: `object`[]

---

### usage

> **usage**: `object`

Defined in: [types/providers.ts:1874](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1874)

#### promptTokens

> **promptTokens**: `number`

#### completionTokens

> **completionTokens**: `number`

#### totalTokens?

> `optional` **totalTokens?**: `number`

---

### finishReason

> **finishReason**: `"stop"` \| `"length"` \| `"content-filter"` \| `"tool-calls"` \| `"error"` \| `"unknown"`

Defined in: [types/providers.ts:1879](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1879)

---

### warnings?

> `optional` **warnings?**: `object`[]

Defined in: [types/providers.ts:1886](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1886)

#### type

> **type**: `"other"`

#### message

> **message**: `string`

---

### rawCall

> **rawCall**: `object`

Defined in: [types/providers.ts:1887](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1887)

#### rawPrompt

> **rawPrompt**: `unknown`

#### rawSettings

> **rawSettings**: `Record`\<`string`, `unknown`\>

---

### rawResponse?

> `optional` **rawResponse?**: `object`

Defined in: [types/providers.ts:1888](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1888)

#### headers?

> `optional` **headers?**: `Record`\<`string`, `string`\>

---

### request?

> `optional` **request?**: `object`

Defined in: [types/providers.ts:1889](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1889)

#### body?

> `optional` **body?**: `string`

---

### toolCalls?

> `optional` **toolCalls?**: [`SageMakerToolCall`](SageMakerToolCall.md)[]

Defined in: [types/providers.ts:1890](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1890)

---

### object?

> `optional` **object?**: `unknown`

Defined in: [types/providers.ts:1891](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1891)
