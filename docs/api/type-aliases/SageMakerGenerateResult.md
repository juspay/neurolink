[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / SageMakerGenerateResult

# Type Alias: SageMakerGenerateResult

> **SageMakerGenerateResult** = `object`

Defined in: [types/providers.ts:1858](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1858)

SageMaker generation result type for better type safety

## Properties

### text?

> `optional` **text?**: `string`

Defined in: [types/providers.ts:1859](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1859)

---

### reasoning?

> `optional` **reasoning?**: `string` \| (\{ `type`: `"text"`; `text`: `string`; `signature?`: `string`; \} \| \{ `type`: `"redacted"`; `data`: `string`; \})[]

Defined in: [types/providers.ts:1860](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1860)

---

### files?

> `optional` **files?**: `object`[]

Defined in: [types/providers.ts:1866](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1866)

#### data

> **data**: `string` \| `Uint8Array`

#### mimeType

> **mimeType**: `string`

---

### logprobs?

> `optional` **logprobs?**: `object`[]

Defined in: [types/providers.ts:1867](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1867)

#### token

> **token**: `string`

#### logprob

> **logprob**: `number`

#### topLogprobs

> **topLogprobs**: `object`[]

---

### usage

> **usage**: `object`

Defined in: [types/providers.ts:1872](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1872)

#### promptTokens

> **promptTokens**: `number`

#### completionTokens

> **completionTokens**: `number`

#### totalTokens?

> `optional` **totalTokens?**: `number`

---

### finishReason

> **finishReason**: `"stop"` \| `"length"` \| `"content-filter"` \| `"tool-calls"` \| `"error"` \| `"unknown"`

Defined in: [types/providers.ts:1877](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1877)

---

### warnings?

> `optional` **warnings?**: `object`[]

Defined in: [types/providers.ts:1884](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1884)

#### type

> **type**: `"other"`

#### message

> **message**: `string`

---

### rawCall

> **rawCall**: `object`

Defined in: [types/providers.ts:1885](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1885)

#### rawPrompt

> **rawPrompt**: `unknown`

#### rawSettings

> **rawSettings**: `Record`\<`string`, `unknown`\>

---

### rawResponse?

> `optional` **rawResponse?**: `object`

Defined in: [types/providers.ts:1886](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1886)

#### headers?

> `optional` **headers?**: `Record`\<`string`, `string`\>

---

### request?

> `optional` **request?**: `object`

Defined in: [types/providers.ts:1887](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1887)

#### body?

> `optional` **body?**: `string`

---

### toolCalls?

> `optional` **toolCalls?**: [`SageMakerToolCall`](SageMakerToolCall.md)[]

Defined in: [types/providers.ts:1888](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1888)

---

### object?

> `optional` **object?**: `unknown`

Defined in: [types/providers.ts:1889](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1889)
