[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / SageMakerStreamChunk

# Type Alias: SageMakerStreamChunk

> **SageMakerStreamChunk** = `object`

Defined in: [types/providers.ts:1630](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1630)

Streaming response chunk from SageMaker

## Properties

### content?

> `optional` **content?**: `string`

Defined in: [types/providers.ts:1632](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1632)

Text content in the chunk

---

### done?

> `optional` **done?**: `boolean`

Defined in: [types/providers.ts:1634](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1634)

Indicates if this is the final chunk

---

### usage?

> `optional` **usage?**: [`SageMakerUsage`](SageMakerUsage.md)

Defined in: [types/providers.ts:1636](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1636)

Usage information (only in final chunk)

---

### error?

> `optional` **error?**: `string`

Defined in: [types/providers.ts:1638](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1638)

Error information if chunk contains error

---

### finishReason?

> `optional` **finishReason?**: `"stop"` \| `"length"` \| `"tool-calls"` \| `"content-filter"` \| `"unknown"`

Defined in: [types/providers.ts:1640](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1640)

Finish reason for generation

---

### toolCall?

> `optional` **toolCall?**: [`SageMakerStreamingToolCall`](SageMakerStreamingToolCall.md)

Defined in: [types/providers.ts:1647](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1647)

Tool call in progress (Phase 2.3)

---

### toolResult?

> `optional` **toolResult?**: [`SageMakerStreamingToolResult`](SageMakerStreamingToolResult.md)

Defined in: [types/providers.ts:1649](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1649)

Tool result chunk (Phase 2.3)

---

### structuredOutput?

> `optional` **structuredOutput?**: [`SageMakerStructuredOutput`](SageMakerStructuredOutput.md)

Defined in: [types/providers.ts:1651](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1651)

Structured output streaming (Phase 2.3)
