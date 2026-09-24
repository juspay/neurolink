[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / SageMakerGenerationResponse

# Type Alias: SageMakerGenerationResponse

> **SageMakerGenerationResponse** = `object`

Defined in: [types/providers.ts:1764](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1764)

Generation response from SageMaker

## Properties

### text

> **text**: `string`

Defined in: [types/providers.ts:1766](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1766)

Generated text content

---

### usage

> **usage**: [`SageMakerUsage`](SageMakerUsage.md)

Defined in: [types/providers.ts:1768](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1768)

Token usage information

---

### finishReason

> **finishReason**: `"stop"` \| `"length"` \| `"tool-calls"` \| `"content-filter"` \| `"unknown"`

Defined in: [types/providers.ts:1770](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1770)

Finish reason for generation

---

### toolCalls?

> `optional` **toolCalls?**: [`SageMakerToolCall`](SageMakerToolCall.md)[]

Defined in: [types/providers.ts:1772](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1772)

Tool calls made during generation

---

### toolResults?

> `optional` **toolResults?**: [`SageMakerToolResult`](SageMakerToolResult.md)[]

Defined in: [types/providers.ts:1774](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1774)

Tool results if tools were executed

---

### metadata?

> `optional` **metadata?**: `Record`\<`string`, `unknown`\>

Defined in: [types/providers.ts:1776](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1776)

Additional metadata

---

### modelVersion?

> `optional` **modelVersion?**: `string`

Defined in: [types/providers.ts:1778](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1778)

Model version or identifier
