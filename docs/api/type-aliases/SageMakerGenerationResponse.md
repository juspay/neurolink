[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / SageMakerGenerationResponse

# Type Alias: SageMakerGenerationResponse

> **SageMakerGenerationResponse** = `object`

Defined in: [types/providers.ts:1773](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1773)

Generation response from SageMaker

## Properties

### text

> **text**: `string`

Defined in: [types/providers.ts:1775](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1775)

Generated text content

---

### usage

> **usage**: [`SageMakerUsage`](SageMakerUsage.md)

Defined in: [types/providers.ts:1777](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1777)

Token usage information

---

### finishReason

> **finishReason**: `"stop"` \| `"length"` \| `"tool-calls"` \| `"content-filter"` \| `"unknown"`

Defined in: [types/providers.ts:1779](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1779)

Finish reason for generation

---

### toolCalls?

> `optional` **toolCalls?**: [`SageMakerToolCall`](SageMakerToolCall.md)[]

Defined in: [types/providers.ts:1781](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1781)

Tool calls made during generation

---

### toolResults?

> `optional` **toolResults?**: [`SageMakerToolResult`](SageMakerToolResult.md)[]

Defined in: [types/providers.ts:1783](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1783)

Tool results if tools were executed

---

### metadata?

> `optional` **metadata?**: `Record`\<`string`, `unknown`\>

Defined in: [types/providers.ts:1785](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1785)

Additional metadata

---

### modelVersion?

> `optional` **modelVersion?**: `string`

Defined in: [types/providers.ts:1787](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1787)

Model version or identifier
