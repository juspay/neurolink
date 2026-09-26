[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / SageMakerStreamChunk

# Type Alias: SageMakerStreamChunk

> **SageMakerStreamChunk** = `object`

Defined in: [types/providers.ts:1609](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1609)

Streaming response chunk from SageMaker

## Properties

### content?

> `optional` **content?**: `string`

Defined in: [types/providers.ts:1611](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1611)

Text content in the chunk

---

### done?

> `optional` **done?**: `boolean`

Defined in: [types/providers.ts:1613](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1613)

Indicates if this is the final chunk

---

### usage?

> `optional` **usage?**: [`SageMakerUsage`](SageMakerUsage.md)

Defined in: [types/providers.ts:1615](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1615)

Usage information (only in final chunk)

---

### error?

> `optional` **error?**: `string`

Defined in: [types/providers.ts:1617](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1617)

Error information if chunk contains error

---

### finishReason?

> `optional` **finishReason?**: `"stop"` \| `"length"` \| `"tool-calls"` \| `"content-filter"` \| `"unknown"`

Defined in: [types/providers.ts:1619](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1619)

Finish reason for generation

---

### toolCall?

> `optional` **toolCall?**: [`SageMakerStreamingToolCall`](SageMakerStreamingToolCall.md)

Defined in: [types/providers.ts:1626](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1626)

Tool call in progress (Phase 2.3)

---

### toolResult?

> `optional` **toolResult?**: [`SageMakerStreamingToolResult`](SageMakerStreamingToolResult.md)

Defined in: [types/providers.ts:1628](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1628)

Tool result chunk (Phase 2.3)

---

### structuredOutput?

> `optional` **structuredOutput?**: [`SageMakerStructuredOutput`](SageMakerStructuredOutput.md)

Defined in: [types/providers.ts:1630](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1630)

Structured output streaming (Phase 2.3)
