[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / SageMakerGenerationResponse

# Type Alias: SageMakerGenerationResponse

> **SageMakerGenerationResponse** = `object`

Defined in: [types/providers.ts:1670](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1670)

Generation response from SageMaker

## Properties

### text

> **text**: `string`

Defined in: [types/providers.ts:1672](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1672)

Generated text content

---

### usage

> **usage**: [`SageMakerUsage`](SageMakerUsage.md)

Defined in: [types/providers.ts:1674](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1674)

Token usage information

---

### finishReason

> **finishReason**: `"stop"` \| `"length"` \| `"tool-calls"` \| `"content-filter"` \| `"unknown"`

Defined in: [types/providers.ts:1676](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1676)

Finish reason for generation

---

### toolCalls?

> `optional` **toolCalls?**: [`SageMakerToolCall`](SageMakerToolCall.md)[]

Defined in: [types/providers.ts:1678](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1678)

Tool calls made during generation

---

### toolResults?

> `optional` **toolResults?**: [`SageMakerToolResult`](SageMakerToolResult.md)[]

Defined in: [types/providers.ts:1680](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1680)

Tool results if tools were executed

---

### metadata?

> `optional` **metadata?**: `Record`\<`string`, `unknown`\>

Defined in: [types/providers.ts:1682](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1682)

Additional metadata

---

### modelVersion?

> `optional` **modelVersion?**: `string`

Defined in: [types/providers.ts:1684](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1684)

Model version or identifier
