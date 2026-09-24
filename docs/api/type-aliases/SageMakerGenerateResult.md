[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / SageMakerGenerateResult

# Type Alias: SageMakerGenerateResult

> **SageMakerGenerateResult** = `object`

Defined in: [types/providers.ts:1914](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1914)

SageMaker generation result type for better type safety

## Properties

### text?

> `optional` **text?**: `string`

Defined in: [types/providers.ts:1915](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1915)

---

### reasoning?

> `optional` **reasoning?**: `string` \| (\{ `type`: `"text"`; `text`: `string`; `signature?`: `string`; \} \| \{ `type`: `"redacted"`; `data`: `string`; \})[]

Defined in: [types/providers.ts:1916](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1916)

---

### files?

> `optional` **files?**: `object`[]

Defined in: [types/providers.ts:1922](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1922)

#### data

> **data**: `string` \| `Uint8Array`

#### mimeType

> **mimeType**: `string`

---

### logprobs?

> `optional` **logprobs?**: `object`[]

Defined in: [types/providers.ts:1923](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1923)

#### token

> **token**: `string`

#### logprob

> **logprob**: `number`

#### topLogprobs

> **topLogprobs**: `object`[]

---

### usage

> **usage**: `object`

Defined in: [types/providers.ts:1928](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1928)

#### promptTokens

> **promptTokens**: `number`

#### completionTokens

> **completionTokens**: `number`

#### totalTokens?

> `optional` **totalTokens?**: `number`

---

### finishReason

> **finishReason**: `"stop"` \| `"length"` \| `"content-filter"` \| `"tool-calls"` \| `"error"` \| `"unknown"`

Defined in: [types/providers.ts:1933](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1933)

---

### warnings?

> `optional` **warnings?**: `object`[]

Defined in: [types/providers.ts:1940](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1940)

#### type

> **type**: `"other"`

#### message

> **message**: `string`

---

### rawCall

> **rawCall**: `object`

Defined in: [types/providers.ts:1941](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1941)

#### rawPrompt

> **rawPrompt**: `unknown`

#### rawSettings

> **rawSettings**: `Record`\<`string`, `unknown`\>

---

### rawResponse?

> `optional` **rawResponse?**: `object`

Defined in: [types/providers.ts:1942](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1942)

#### headers?

> `optional` **headers?**: `Record`\<`string`, `string`\>

---

### request?

> `optional` **request?**: `object`

Defined in: [types/providers.ts:1943](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1943)

#### body?

> `optional` **body?**: `string`

---

### toolCalls?

> `optional` **toolCalls?**: [`SageMakerToolCall`](SageMakerToolCall.md)[]

Defined in: [types/providers.ts:1944](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1944)

---

### object?

> `optional` **object?**: `unknown`

Defined in: [types/providers.ts:1945](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1945)
