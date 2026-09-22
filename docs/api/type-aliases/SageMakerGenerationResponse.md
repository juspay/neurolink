[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / SageMakerGenerationResponse

# Type Alias: SageMakerGenerationResponse

> **SageMakerGenerationResponse** = `object`

Defined in: [types/providers.ts:1749](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1749)

Generation response from SageMaker

## Properties

### text

> **text**: `string`

Defined in: [types/providers.ts:1751](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1751)

Generated text content

---

### usage

> **usage**: [`SageMakerUsage`](SageMakerUsage.md)

Defined in: [types/providers.ts:1753](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1753)

Token usage information

---

### finishReason

> **finishReason**: `"stop"` \| `"length"` \| `"tool-calls"` \| `"content-filter"` \| `"unknown"`

Defined in: [types/providers.ts:1755](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1755)

Finish reason for generation

---

### toolCalls?

> `optional` **toolCalls?**: [`SageMakerToolCall`](SageMakerToolCall.md)[]

Defined in: [types/providers.ts:1757](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1757)

Tool calls made during generation

---

### toolResults?

> `optional` **toolResults?**: [`SageMakerToolResult`](SageMakerToolResult.md)[]

Defined in: [types/providers.ts:1759](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1759)

Tool results if tools were executed

---

### metadata?

> `optional` **metadata?**: `Record`\<`string`, `unknown`\>

Defined in: [types/providers.ts:1761](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1761)

Additional metadata

---

### modelVersion?

> `optional` **modelVersion?**: `string`

Defined in: [types/providers.ts:1763](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1763)

Model version or identifier
