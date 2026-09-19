[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / SageMakerStreamChunk

# Type Alias: SageMakerStreamChunk

> **SageMakerStreamChunk** = `object`

Defined in: [types/providers.ts:1602](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1602)

Streaming response chunk from SageMaker

## Properties

### content?

> `optional` **content?**: `string`

Defined in: [types/providers.ts:1604](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1604)

Text content in the chunk

---

### done?

> `optional` **done?**: `boolean`

Defined in: [types/providers.ts:1606](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1606)

Indicates if this is the final chunk

---

### usage?

> `optional` **usage?**: [`SageMakerUsage`](SageMakerUsage.md)

Defined in: [types/providers.ts:1608](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1608)

Usage information (only in final chunk)

---

### error?

> `optional` **error?**: `string`

Defined in: [types/providers.ts:1610](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1610)

Error information if chunk contains error

---

### finishReason?

> `optional` **finishReason?**: `"stop"` \| `"length"` \| `"tool-calls"` \| `"content-filter"` \| `"unknown"`

Defined in: [types/providers.ts:1612](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1612)

Finish reason for generation

---

### toolCall?

> `optional` **toolCall?**: [`SageMakerStreamingToolCall`](SageMakerStreamingToolCall.md)

Defined in: [types/providers.ts:1619](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1619)

Tool call in progress (Phase 2.3)

---

### toolResult?

> `optional` **toolResult?**: [`SageMakerStreamingToolResult`](SageMakerStreamingToolResult.md)

Defined in: [types/providers.ts:1621](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1621)

Tool result chunk (Phase 2.3)

---

### structuredOutput?

> `optional` **structuredOutput?**: [`SageMakerStructuredOutput`](SageMakerStructuredOutput.md)

Defined in: [types/providers.ts:1623](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1623)

Structured output streaming (Phase 2.3)
