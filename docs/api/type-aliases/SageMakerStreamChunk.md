[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / SageMakerStreamChunk

# Type Alias: SageMakerStreamChunk

> **SageMakerStreamChunk** = `object`

Defined in: [types/providers.ts:1621](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1621)

Streaming response chunk from SageMaker

## Properties

### content?

> `optional` **content?**: `string`

Defined in: [types/providers.ts:1623](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1623)

Text content in the chunk

---

### done?

> `optional` **done?**: `boolean`

Defined in: [types/providers.ts:1625](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1625)

Indicates if this is the final chunk

---

### usage?

> `optional` **usage?**: [`SageMakerUsage`](SageMakerUsage.md)

Defined in: [types/providers.ts:1627](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1627)

Usage information (only in final chunk)

---

### error?

> `optional` **error?**: `string`

Defined in: [types/providers.ts:1629](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1629)

Error information if chunk contains error

---

### finishReason?

> `optional` **finishReason?**: `"stop"` \| `"length"` \| `"tool-calls"` \| `"content-filter"` \| `"unknown"`

Defined in: [types/providers.ts:1631](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1631)

Finish reason for generation

---

### toolCall?

> `optional` **toolCall?**: [`SageMakerStreamingToolCall`](SageMakerStreamingToolCall.md)

Defined in: [types/providers.ts:1638](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1638)

Tool call in progress (Phase 2.3)

---

### toolResult?

> `optional` **toolResult?**: [`SageMakerStreamingToolResult`](SageMakerStreamingToolResult.md)

Defined in: [types/providers.ts:1640](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1640)

Tool result chunk (Phase 2.3)

---

### structuredOutput?

> `optional` **structuredOutput?**: [`SageMakerStructuredOutput`](SageMakerStructuredOutput.md)

Defined in: [types/providers.ts:1642](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1642)

Structured output streaming (Phase 2.3)
