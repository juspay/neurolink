[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / SageMakerGenerateResult

# Type Alias: SageMakerGenerateResult

> **SageMakerGenerateResult** = `object`

Defined in: [types/providers.ts:1821](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1821)

SageMaker generation result type for better type safety

## Properties

### text?

> `optional` **text?**: `string`

Defined in: [types/providers.ts:1822](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1822)

---

### reasoning?

> `optional` **reasoning?**: `string` \| (\{ `type`: `"text"`; `text`: `string`; `signature?`: `string`; \} \| \{ `type`: `"redacted"`; `data`: `string`; \})[]

Defined in: [types/providers.ts:1823](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1823)

---

### files?

> `optional` **files?**: `object`[]

Defined in: [types/providers.ts:1829](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1829)

#### data

> **data**: `string` \| `Uint8Array`

#### mimeType

> **mimeType**: `string`

---

### logprobs?

> `optional` **logprobs?**: `object`[]

Defined in: [types/providers.ts:1830](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1830)

#### token

> **token**: `string`

#### logprob

> **logprob**: `number`

#### topLogprobs

> **topLogprobs**: `object`[]

---

### usage

> **usage**: `object`

Defined in: [types/providers.ts:1835](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1835)

#### promptTokens

> **promptTokens**: `number`

#### completionTokens

> **completionTokens**: `number`

#### totalTokens?

> `optional` **totalTokens?**: `number`

---

### finishReason

> **finishReason**: `"stop"` \| `"length"` \| `"content-filter"` \| `"tool-calls"` \| `"error"` \| `"unknown"`

Defined in: [types/providers.ts:1840](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1840)

---

### warnings?

> `optional` **warnings?**: `object`[]

Defined in: [types/providers.ts:1847](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1847)

#### type

> **type**: `"other"`

#### message

> **message**: `string`

---

### rawCall

> **rawCall**: `object`

Defined in: [types/providers.ts:1848](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1848)

#### rawPrompt

> **rawPrompt**: `unknown`

#### rawSettings

> **rawSettings**: `Record`\<`string`, `unknown`\>

---

### rawResponse?

> `optional` **rawResponse?**: `object`

Defined in: [types/providers.ts:1849](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1849)

#### headers?

> `optional` **headers?**: `Record`\<`string`, `string`\>

---

### request?

> `optional` **request?**: `object`

Defined in: [types/providers.ts:1850](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1850)

#### body?

> `optional` **body?**: `string`

---

### toolCalls?

> `optional` **toolCalls?**: [`SageMakerToolCall`](SageMakerToolCall.md)[]

Defined in: [types/providers.ts:1851](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1851)

---

### object?

> `optional` **object?**: `unknown`

Defined in: [types/providers.ts:1852](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1852)
