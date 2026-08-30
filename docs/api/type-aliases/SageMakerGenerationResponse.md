[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / SageMakerGenerationResponse

# Type Alias: SageMakerGenerationResponse

> **SageMakerGenerationResponse** = `object`

Defined in: [types/providers.ts:1686](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1686)

Generation response from SageMaker

## Properties

### text

> **text**: `string`

Defined in: [types/providers.ts:1688](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1688)

Generated text content

---

### usage

> **usage**: [`SageMakerUsage`](SageMakerUsage.md)

Defined in: [types/providers.ts:1690](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1690)

Token usage information

---

### finishReason

> **finishReason**: `"stop"` \| `"length"` \| `"tool-calls"` \| `"content-filter"` \| `"unknown"`

Defined in: [types/providers.ts:1692](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1692)

Finish reason for generation

---

### toolCalls?

> `optional` **toolCalls?**: [`SageMakerToolCall`](SageMakerToolCall.md)[]

Defined in: [types/providers.ts:1694](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1694)

Tool calls made during generation

---

### toolResults?

> `optional` **toolResults?**: [`SageMakerToolResult`](SageMakerToolResult.md)[]

Defined in: [types/providers.ts:1696](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1696)

Tool results if tools were executed

---

### metadata?

> `optional` **metadata?**: `Record`\<`string`, `unknown`\>

Defined in: [types/providers.ts:1698](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1698)

Additional metadata

---

### modelVersion?

> `optional` **modelVersion?**: `string`

Defined in: [types/providers.ts:1700](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1700)

Model version or identifier
