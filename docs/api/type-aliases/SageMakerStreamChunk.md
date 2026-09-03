[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / SageMakerStreamChunk

# Type Alias: SageMakerStreamChunk

> **SageMakerStreamChunk** = `object`

Defined in: [types/providers.ts:1548](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1548)

Streaming response chunk from SageMaker

## Properties

### content?

> `optional` **content?**: `string`

Defined in: [types/providers.ts:1550](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1550)

Text content in the chunk

---

### done?

> `optional` **done?**: `boolean`

Defined in: [types/providers.ts:1552](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1552)

Indicates if this is the final chunk

---

### usage?

> `optional` **usage?**: [`SageMakerUsage`](SageMakerUsage.md)

Defined in: [types/providers.ts:1554](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1554)

Usage information (only in final chunk)

---

### error?

> `optional` **error?**: `string`

Defined in: [types/providers.ts:1556](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1556)

Error information if chunk contains error

---

### finishReason?

> `optional` **finishReason?**: `"stop"` \| `"length"` \| `"tool-calls"` \| `"content-filter"` \| `"unknown"`

Defined in: [types/providers.ts:1558](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1558)

Finish reason for generation

---

### toolCall?

> `optional` **toolCall?**: [`SageMakerStreamingToolCall`](SageMakerStreamingToolCall.md)

Defined in: [types/providers.ts:1565](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1565)

Tool call in progress (Phase 2.3)

---

### toolResult?

> `optional` **toolResult?**: [`SageMakerStreamingToolResult`](SageMakerStreamingToolResult.md)

Defined in: [types/providers.ts:1567](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1567)

Tool result chunk (Phase 2.3)

---

### structuredOutput?

> `optional` **structuredOutput?**: [`SageMakerStructuredOutput`](SageMakerStructuredOutput.md)

Defined in: [types/providers.ts:1569](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1569)

Structured output streaming (Phase 2.3)
