[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / SageMakerGenerationResponse

# Type Alias: SageMakerGenerationResponse

> **SageMakerGenerationResponse** = `object`

Defined in: [types/providers.ts:1710](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1710)

Generation response from SageMaker

## Properties

### text

> **text**: `string`

Defined in: [types/providers.ts:1712](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1712)

Generated text content

---

### usage

> **usage**: [`SageMakerUsage`](SageMakerUsage.md)

Defined in: [types/providers.ts:1714](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1714)

Token usage information

---

### finishReason

> **finishReason**: `"stop"` \| `"length"` \| `"tool-calls"` \| `"content-filter"` \| `"unknown"`

Defined in: [types/providers.ts:1716](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1716)

Finish reason for generation

---

### toolCalls?

> `optional` **toolCalls?**: [`SageMakerToolCall`](SageMakerToolCall.md)[]

Defined in: [types/providers.ts:1718](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1718)

Tool calls made during generation

---

### toolResults?

> `optional` **toolResults?**: [`SageMakerToolResult`](SageMakerToolResult.md)[]

Defined in: [types/providers.ts:1720](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1720)

Tool results if tools were executed

---

### metadata?

> `optional` **metadata?**: `Record`\<`string`, `unknown`\>

Defined in: [types/providers.ts:1722](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1722)

Additional metadata

---

### modelVersion?

> `optional` **modelVersion?**: `string`

Defined in: [types/providers.ts:1724](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1724)

Model version or identifier
