[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / SageMakerGenerateResult

# Type Alias: SageMakerGenerateResult

> **SageMakerGenerateResult** = `object`

Defined in: [types/providers.ts:1894](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1894)

SageMaker generation result type for better type safety

## Properties

### text?

> `optional` **text?**: `string`

Defined in: [types/providers.ts:1895](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1895)

---

### reasoning?

> `optional` **reasoning?**: `string` \| (\{ `type`: `"text"`; `text`: `string`; `signature?`: `string`; \} \| \{ `type`: `"redacted"`; `data`: `string`; \})[]

Defined in: [types/providers.ts:1896](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1896)

---

### files?

> `optional` **files?**: `object`[]

Defined in: [types/providers.ts:1902](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1902)

#### data

> **data**: `string` \| `Uint8Array`

#### mimeType

> **mimeType**: `string`

---

### logprobs?

> `optional` **logprobs?**: `object`[]

Defined in: [types/providers.ts:1903](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1903)

#### token

> **token**: `string`

#### logprob

> **logprob**: `number`

#### topLogprobs

> **topLogprobs**: `object`[]

---

### usage

> **usage**: `object`

Defined in: [types/providers.ts:1908](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1908)

#### promptTokens

> **promptTokens**: `number`

#### completionTokens

> **completionTokens**: `number`

#### totalTokens?

> `optional` **totalTokens?**: `number`

---

### finishReason

> **finishReason**: `"stop"` \| `"length"` \| `"content-filter"` \| `"tool-calls"` \| `"error"` \| `"unknown"`

Defined in: [types/providers.ts:1913](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1913)

---

### warnings?

> `optional` **warnings?**: `object`[]

Defined in: [types/providers.ts:1920](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1920)

#### type

> **type**: `"other"`

#### message

> **message**: `string`

---

### rawCall

> **rawCall**: `object`

Defined in: [types/providers.ts:1921](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1921)

#### rawPrompt

> **rawPrompt**: `unknown`

#### rawSettings

> **rawSettings**: `Record`\<`string`, `unknown`\>

---

### rawResponse?

> `optional` **rawResponse?**: `object`

Defined in: [types/providers.ts:1922](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1922)

#### headers?

> `optional` **headers?**: `Record`\<`string`, `string`\>

---

### request?

> `optional` **request?**: `object`

Defined in: [types/providers.ts:1923](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1923)

#### body?

> `optional` **body?**: `string`

---

### toolCalls?

> `optional` **toolCalls?**: [`SageMakerToolCall`](SageMakerToolCall.md)[]

Defined in: [types/providers.ts:1924](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1924)

---

### object?

> `optional` **object?**: `unknown`

Defined in: [types/providers.ts:1925](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1925)
