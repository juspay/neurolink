[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / SageMakerStreamChunk

# Type Alias: SageMakerStreamChunk

> **SageMakerStreamChunk** = `object`

Defined in: [types/providers.ts:1540](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1540)

Streaming response chunk from SageMaker

## Properties

### content?

> `optional` **content?**: `string`

Defined in: [types/providers.ts:1542](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1542)

Text content in the chunk

---

### done?

> `optional` **done?**: `boolean`

Defined in: [types/providers.ts:1544](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1544)

Indicates if this is the final chunk

---

### usage?

> `optional` **usage?**: [`SageMakerUsage`](SageMakerUsage.md)

Defined in: [types/providers.ts:1546](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1546)

Usage information (only in final chunk)

---

### error?

> `optional` **error?**: `string`

Defined in: [types/providers.ts:1548](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1548)

Error information if chunk contains error

---

### finishReason?

> `optional` **finishReason?**: `"stop"` \| `"length"` \| `"tool-calls"` \| `"content-filter"` \| `"unknown"`

Defined in: [types/providers.ts:1550](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1550)

Finish reason for generation

---

### toolCall?

> `optional` **toolCall?**: [`SageMakerStreamingToolCall`](SageMakerStreamingToolCall.md)

Defined in: [types/providers.ts:1557](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1557)

Tool call in progress (Phase 2.3)

---

### toolResult?

> `optional` **toolResult?**: [`SageMakerStreamingToolResult`](SageMakerStreamingToolResult.md)

Defined in: [types/providers.ts:1559](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1559)

Tool result chunk (Phase 2.3)

---

### structuredOutput?

> `optional` **structuredOutput?**: [`SageMakerStructuredOutput`](SageMakerStructuredOutput.md)

Defined in: [types/providers.ts:1561](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1561)

Structured output streaming (Phase 2.3)
