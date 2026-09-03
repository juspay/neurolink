[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / SageMakerGenerateResult

# Type Alias: SageMakerGenerateResult

> **SageMakerGenerateResult** = `object`

Defined in: [types/providers.ts:1841](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1841)

SageMaker generation result type for better type safety

## Properties

### text?

> `optional` **text?**: `string`

Defined in: [types/providers.ts:1842](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1842)

---

### reasoning?

> `optional` **reasoning?**: `string` \| (\{ `type`: `"text"`; `text`: `string`; `signature?`: `string`; \} \| \{ `type`: `"redacted"`; `data`: `string`; \})[]

Defined in: [types/providers.ts:1843](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1843)

---

### files?

> `optional` **files?**: `object`[]

Defined in: [types/providers.ts:1849](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1849)

#### data

> **data**: `string` \| `Uint8Array`

#### mimeType

> **mimeType**: `string`

---

### logprobs?

> `optional` **logprobs?**: `object`[]

Defined in: [types/providers.ts:1850](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1850)

#### token

> **token**: `string`

#### logprob

> **logprob**: `number`

#### topLogprobs

> **topLogprobs**: `object`[]

---

### usage

> **usage**: `object`

Defined in: [types/providers.ts:1855](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1855)

#### promptTokens

> **promptTokens**: `number`

#### completionTokens

> **completionTokens**: `number`

#### totalTokens?

> `optional` **totalTokens?**: `number`

---

### finishReason

> **finishReason**: `"stop"` \| `"length"` \| `"content-filter"` \| `"tool-calls"` \| `"error"` \| `"unknown"`

Defined in: [types/providers.ts:1860](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1860)

---

### warnings?

> `optional` **warnings?**: `object`[]

Defined in: [types/providers.ts:1867](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1867)

#### type

> **type**: `"other"`

#### message

> **message**: `string`

---

### rawCall

> **rawCall**: `object`

Defined in: [types/providers.ts:1868](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1868)

#### rawPrompt

> **rawPrompt**: `unknown`

#### rawSettings

> **rawSettings**: `Record`\<`string`, `unknown`\>

---

### rawResponse?

> `optional` **rawResponse?**: `object`

Defined in: [types/providers.ts:1869](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1869)

#### headers?

> `optional` **headers?**: `Record`\<`string`, `string`\>

---

### request?

> `optional` **request?**: `object`

Defined in: [types/providers.ts:1870](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1870)

#### body?

> `optional` **body?**: `string`

---

### toolCalls?

> `optional` **toolCalls?**: [`SageMakerToolCall`](SageMakerToolCall.md)[]

Defined in: [types/providers.ts:1871](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1871)

---

### object?

> `optional` **object?**: `unknown`

Defined in: [types/providers.ts:1872](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1872)
