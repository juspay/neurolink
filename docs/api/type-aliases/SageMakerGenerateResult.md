[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / SageMakerGenerateResult

# Type Alias: SageMakerGenerateResult

> **SageMakerGenerateResult** = `object`

Defined in: [types/providers.ts:1838](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1838)

SageMaker generation result type for better type safety

## Properties

### text?

> `optional` **text?**: `string`

Defined in: [types/providers.ts:1839](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1839)

---

### reasoning?

> `optional` **reasoning?**: `string` \| (\{ `type`: `"text"`; `text`: `string`; `signature?`: `string`; \} \| \{ `type`: `"redacted"`; `data`: `string`; \})[]

Defined in: [types/providers.ts:1840](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1840)

---

### files?

> `optional` **files?**: `object`[]

Defined in: [types/providers.ts:1846](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1846)

#### data

> **data**: `string` \| `Uint8Array`

#### mimeType

> **mimeType**: `string`

---

### logprobs?

> `optional` **logprobs?**: `object`[]

Defined in: [types/providers.ts:1847](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1847)

#### token

> **token**: `string`

#### logprob

> **logprob**: `number`

#### topLogprobs

> **topLogprobs**: `object`[]

---

### usage

> **usage**: `object`

Defined in: [types/providers.ts:1852](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1852)

#### promptTokens

> **promptTokens**: `number`

#### completionTokens

> **completionTokens**: `number`

#### totalTokens?

> `optional` **totalTokens?**: `number`

---

### finishReason

> **finishReason**: `"stop"` \| `"length"` \| `"content-filter"` \| `"tool-calls"` \| `"error"` \| `"unknown"`

Defined in: [types/providers.ts:1857](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1857)

---

### warnings?

> `optional` **warnings?**: `object`[]

Defined in: [types/providers.ts:1864](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1864)

#### type

> **type**: `"other"`

#### message

> **message**: `string`

---

### rawCall

> **rawCall**: `object`

Defined in: [types/providers.ts:1865](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1865)

#### rawPrompt

> **rawPrompt**: `unknown`

#### rawSettings

> **rawSettings**: `Record`\<`string`, `unknown`\>

---

### rawResponse?

> `optional` **rawResponse?**: `object`

Defined in: [types/providers.ts:1866](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1866)

#### headers?

> `optional` **headers?**: `Record`\<`string`, `string`\>

---

### request?

> `optional` **request?**: `object`

Defined in: [types/providers.ts:1867](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1867)

#### body?

> `optional` **body?**: `string`

---

### toolCalls?

> `optional` **toolCalls?**: [`SageMakerToolCall`](SageMakerToolCall.md)[]

Defined in: [types/providers.ts:1868](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1868)

---

### object?

> `optional` **object?**: `unknown`

Defined in: [types/providers.ts:1869](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1869)
