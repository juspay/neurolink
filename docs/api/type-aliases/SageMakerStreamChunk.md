[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / SageMakerStreamChunk

# Type Alias: SageMakerStreamChunk

> **SageMakerStreamChunk** = `object`

Defined in: [types/providers.ts:1601](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1601)

Streaming response chunk from SageMaker

## Properties

### content?

> `optional` **content?**: `string`

Defined in: [types/providers.ts:1603](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1603)

Text content in the chunk

---

### done?

> `optional` **done?**: `boolean`

Defined in: [types/providers.ts:1605](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1605)

Indicates if this is the final chunk

---

### usage?

> `optional` **usage?**: [`SageMakerUsage`](SageMakerUsage.md)

Defined in: [types/providers.ts:1607](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1607)

Usage information (only in final chunk)

---

### error?

> `optional` **error?**: `string`

Defined in: [types/providers.ts:1609](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1609)

Error information if chunk contains error

---

### finishReason?

> `optional` **finishReason?**: `"stop"` \| `"length"` \| `"tool-calls"` \| `"content-filter"` \| `"unknown"`

Defined in: [types/providers.ts:1611](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1611)

Finish reason for generation

---

### toolCall?

> `optional` **toolCall?**: [`SageMakerStreamingToolCall`](SageMakerStreamingToolCall.md)

Defined in: [types/providers.ts:1618](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1618)

Tool call in progress (Phase 2.3)

---

### toolResult?

> `optional` **toolResult?**: [`SageMakerStreamingToolResult`](SageMakerStreamingToolResult.md)

Defined in: [types/providers.ts:1620](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1620)

Tool result chunk (Phase 2.3)

---

### structuredOutput?

> `optional` **structuredOutput?**: [`SageMakerStructuredOutput`](SageMakerStructuredOutput.md)

Defined in: [types/providers.ts:1622](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1622)

Structured output streaming (Phase 2.3)
