[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / SageMakerGenerateResult

# Type Alias: SageMakerGenerateResult

> **SageMakerGenerateResult** = `object`

Defined in: [types/providers.ts:1833](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1833)

SageMaker generation result type for better type safety

## Properties

### text?

> `optional` **text?**: `string`

Defined in: [types/providers.ts:1834](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1834)

---

### reasoning?

> `optional` **reasoning?**: `string` \| (\{ `type`: `"text"`; `text`: `string`; `signature?`: `string`; \} \| \{ `type`: `"redacted"`; `data`: `string`; \})[]

Defined in: [types/providers.ts:1835](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1835)

---

### files?

> `optional` **files?**: `object`[]

Defined in: [types/providers.ts:1841](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1841)

#### data

> **data**: `string` \| `Uint8Array`

#### mimeType

> **mimeType**: `string`

---

### logprobs?

> `optional` **logprobs?**: `object`[]

Defined in: [types/providers.ts:1842](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1842)

#### token

> **token**: `string`

#### logprob

> **logprob**: `number`

#### topLogprobs

> **topLogprobs**: `object`[]

---

### usage

> **usage**: `object`

Defined in: [types/providers.ts:1847](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1847)

#### promptTokens

> **promptTokens**: `number`

#### completionTokens

> **completionTokens**: `number`

#### totalTokens?

> `optional` **totalTokens?**: `number`

---

### finishReason

> **finishReason**: `"stop"` \| `"length"` \| `"content-filter"` \| `"tool-calls"` \| `"error"` \| `"unknown"`

Defined in: [types/providers.ts:1852](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1852)

---

### warnings?

> `optional` **warnings?**: `object`[]

Defined in: [types/providers.ts:1859](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1859)

#### type

> **type**: `"other"`

#### message

> **message**: `string`

---

### rawCall

> **rawCall**: `object`

Defined in: [types/providers.ts:1860](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1860)

#### rawPrompt

> **rawPrompt**: `unknown`

#### rawSettings

> **rawSettings**: `Record`\<`string`, `unknown`\>

---

### rawResponse?

> `optional` **rawResponse?**: `object`

Defined in: [types/providers.ts:1861](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1861)

#### headers?

> `optional` **headers?**: `Record`\<`string`, `string`\>

---

### request?

> `optional` **request?**: `object`

Defined in: [types/providers.ts:1862](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1862)

#### body?

> `optional` **body?**: `string`

---

### toolCalls?

> `optional` **toolCalls?**: [`SageMakerToolCall`](SageMakerToolCall.md)[]

Defined in: [types/providers.ts:1863](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1863)

---

### object?

> `optional` **object?**: `unknown`

Defined in: [types/providers.ts:1864](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1864)
