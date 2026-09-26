[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / SageMakerGenerateResult

# Type Alias: SageMakerGenerateResult

> **SageMakerGenerateResult** = `object`

Defined in: [types/providers.ts:1923](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1923)

SageMaker generation result type for better type safety

## Properties

### text?

> `optional` **text?**: `string`

Defined in: [types/providers.ts:1924](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1924)

---

### reasoning?

> `optional` **reasoning?**: `string` \| (\{ `type`: `"text"`; `text`: `string`; `signature?`: `string`; \} \| \{ `type`: `"redacted"`; `data`: `string`; \})[]

Defined in: [types/providers.ts:1925](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1925)

---

### files?

> `optional` **files?**: `object`[]

Defined in: [types/providers.ts:1931](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1931)

#### data

> **data**: `string` \| `Uint8Array`

#### mimeType

> **mimeType**: `string`

---

### logprobs?

> `optional` **logprobs?**: `object`[]

Defined in: [types/providers.ts:1932](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1932)

#### token

> **token**: `string`

#### logprob

> **logprob**: `number`

#### topLogprobs

> **topLogprobs**: `object`[]

---

### usage

> **usage**: `object`

Defined in: [types/providers.ts:1937](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1937)

#### promptTokens

> **promptTokens**: `number`

#### completionTokens

> **completionTokens**: `number`

#### totalTokens?

> `optional` **totalTokens?**: `number`

---

### finishReason

> **finishReason**: `"stop"` \| `"length"` \| `"content-filter"` \| `"tool-calls"` \| `"error"` \| `"unknown"`

Defined in: [types/providers.ts:1942](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1942)

---

### warnings?

> `optional` **warnings?**: `object`[]

Defined in: [types/providers.ts:1949](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1949)

#### type

> **type**: `"other"`

#### message

> **message**: `string`

---

### rawCall

> **rawCall**: `object`

Defined in: [types/providers.ts:1950](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1950)

#### rawPrompt

> **rawPrompt**: `unknown`

#### rawSettings

> **rawSettings**: `Record`\<`string`, `unknown`\>

---

### rawResponse?

> `optional` **rawResponse?**: `object`

Defined in: [types/providers.ts:1951](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1951)

#### headers?

> `optional` **headers?**: `Record`\<`string`, `string`\>

---

### request?

> `optional` **request?**: `object`

Defined in: [types/providers.ts:1952](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1952)

#### body?

> `optional` **body?**: `string`

---

### toolCalls?

> `optional` **toolCalls?**: [`SageMakerToolCall`](SageMakerToolCall.md)[]

Defined in: [types/providers.ts:1953](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1953)

---

### object?

> `optional` **object?**: `unknown`

Defined in: [types/providers.ts:1954](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1954)
