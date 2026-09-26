[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / SageMakerGenerateResult

# Type Alias: SageMakerGenerateResult

> **SageMakerGenerateResult** = `object`

Defined in: [types/providers.ts:1902](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1902)

SageMaker generation result type for better type safety

## Properties

### text?

> `optional` **text?**: `string`

Defined in: [types/providers.ts:1903](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1903)

---

### reasoning?

> `optional` **reasoning?**: `string` \| (\{ `type`: `"text"`; `text`: `string`; `signature?`: `string`; \} \| \{ `type`: `"redacted"`; `data`: `string`; \})[]

Defined in: [types/providers.ts:1904](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1904)

---

### files?

> `optional` **files?**: `object`[]

Defined in: [types/providers.ts:1910](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1910)

#### data

> **data**: `string` \| `Uint8Array`

#### mimeType

> **mimeType**: `string`

---

### logprobs?

> `optional` **logprobs?**: `object`[]

Defined in: [types/providers.ts:1911](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1911)

#### token

> **token**: `string`

#### logprob

> **logprob**: `number`

#### topLogprobs

> **topLogprobs**: `object`[]

---

### usage

> **usage**: `object`

Defined in: [types/providers.ts:1916](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1916)

#### promptTokens

> **promptTokens**: `number`

#### completionTokens

> **completionTokens**: `number`

#### totalTokens?

> `optional` **totalTokens?**: `number`

---

### finishReason

> **finishReason**: `"stop"` \| `"length"` \| `"content-filter"` \| `"tool-calls"` \| `"error"` \| `"unknown"`

Defined in: [types/providers.ts:1921](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1921)

---

### warnings?

> `optional` **warnings?**: `object`[]

Defined in: [types/providers.ts:1928](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1928)

#### type

> **type**: `"other"`

#### message

> **message**: `string`

---

### rawCall

> **rawCall**: `object`

Defined in: [types/providers.ts:1929](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1929)

#### rawPrompt

> **rawPrompt**: `unknown`

#### rawSettings

> **rawSettings**: `Record`\<`string`, `unknown`\>

---

### rawResponse?

> `optional` **rawResponse?**: `object`

Defined in: [types/providers.ts:1930](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1930)

#### headers?

> `optional` **headers?**: `Record`\<`string`, `string`\>

---

### request?

> `optional` **request?**: `object`

Defined in: [types/providers.ts:1931](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1931)

#### body?

> `optional` **body?**: `string`

---

### toolCalls?

> `optional` **toolCalls?**: [`SageMakerToolCall`](SageMakerToolCall.md)[]

Defined in: [types/providers.ts:1932](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1932)

---

### object?

> `optional` **object?**: `unknown`

Defined in: [types/providers.ts:1933](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1933)
