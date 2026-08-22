[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / SageMakerGenerationResponse

# Type Alias: SageMakerGenerationResponse

> **SageMakerGenerationResponse** = `object`

Defined in: [types/providers.ts:1669](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1669)

Generation response from SageMaker

## Properties

### text

> **text**: `string`

Defined in: [types/providers.ts:1671](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1671)

Generated text content

---

### usage

> **usage**: [`SageMakerUsage`](SageMakerUsage.md)

Defined in: [types/providers.ts:1673](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1673)

Token usage information

---

### finishReason

> **finishReason**: `"stop"` \| `"length"` \| `"tool-calls"` \| `"content-filter"` \| `"unknown"`

Defined in: [types/providers.ts:1675](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1675)

Finish reason for generation

---

### toolCalls?

> `optional` **toolCalls?**: [`SageMakerToolCall`](SageMakerToolCall.md)[]

Defined in: [types/providers.ts:1677](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1677)

Tool calls made during generation

---

### toolResults?

> `optional` **toolResults?**: [`SageMakerToolResult`](SageMakerToolResult.md)[]

Defined in: [types/providers.ts:1679](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1679)

Tool results if tools were executed

---

### metadata?

> `optional` **metadata?**: `Record`\<`string`, `unknown`\>

Defined in: [types/providers.ts:1681](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1681)

Additional metadata

---

### modelVersion?

> `optional` **modelVersion?**: `string`

Defined in: [types/providers.ts:1683](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1683)

Model version or identifier
