[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / SageMakerGenerateResult

# Type Alias: SageMakerGenerateResult

> **SageMakerGenerateResult** = `object`

Defined in: [types/providers.ts:1836](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1836)

SageMaker generation result type for better type safety

## Properties

### text?

> `optional` **text?**: `string`

Defined in: [types/providers.ts:1837](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1837)

---

### reasoning?

> `optional` **reasoning?**: `string` \| (\{ `type`: `"text"`; `text`: `string`; `signature?`: `string`; \} \| \{ `type`: `"redacted"`; `data`: `string`; \})[]

Defined in: [types/providers.ts:1838](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1838)

---

### files?

> `optional` **files?**: `object`[]

Defined in: [types/providers.ts:1844](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1844)

#### data

> **data**: `string` \| `Uint8Array`

#### mimeType

> **mimeType**: `string`

---

### logprobs?

> `optional` **logprobs?**: `object`[]

Defined in: [types/providers.ts:1845](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1845)

#### token

> **token**: `string`

#### logprob

> **logprob**: `number`

#### topLogprobs

> **topLogprobs**: `object`[]

---

### usage

> **usage**: `object`

Defined in: [types/providers.ts:1850](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1850)

#### promptTokens

> **promptTokens**: `number`

#### completionTokens

> **completionTokens**: `number`

#### totalTokens?

> `optional` **totalTokens?**: `number`

---

### finishReason

> **finishReason**: `"stop"` \| `"length"` \| `"content-filter"` \| `"tool-calls"` \| `"error"` \| `"unknown"`

Defined in: [types/providers.ts:1855](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1855)

---

### warnings?

> `optional` **warnings?**: `object`[]

Defined in: [types/providers.ts:1862](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1862)

#### type

> **type**: `"other"`

#### message

> **message**: `string`

---

### rawCall

> **rawCall**: `object`

Defined in: [types/providers.ts:1863](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1863)

#### rawPrompt

> **rawPrompt**: `unknown`

#### rawSettings

> **rawSettings**: `Record`\<`string`, `unknown`\>

---

### rawResponse?

> `optional` **rawResponse?**: `object`

Defined in: [types/providers.ts:1864](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1864)

#### headers?

> `optional` **headers?**: `Record`\<`string`, `string`\>

---

### request?

> `optional` **request?**: `object`

Defined in: [types/providers.ts:1865](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1865)

#### body?

> `optional` **body?**: `string`

---

### toolCalls?

> `optional` **toolCalls?**: [`SageMakerToolCall`](SageMakerToolCall.md)[]

Defined in: [types/providers.ts:1866](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1866)

---

### object?

> `optional` **object?**: `unknown`

Defined in: [types/providers.ts:1867](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1867)
