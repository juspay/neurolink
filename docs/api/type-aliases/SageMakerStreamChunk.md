[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / SageMakerStreamChunk

# Type Alias: SageMakerStreamChunk

> **SageMakerStreamChunk** = `object`

Defined in: [types/providers.ts:1528](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1528)

Streaming response chunk from SageMaker

## Properties

### content?

> `optional` **content?**: `string`

Defined in: [types/providers.ts:1530](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1530)

Text content in the chunk

---

### done?

> `optional` **done?**: `boolean`

Defined in: [types/providers.ts:1532](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1532)

Indicates if this is the final chunk

---

### usage?

> `optional` **usage?**: [`SageMakerUsage`](SageMakerUsage.md)

Defined in: [types/providers.ts:1534](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1534)

Usage information (only in final chunk)

---

### error?

> `optional` **error?**: `string`

Defined in: [types/providers.ts:1536](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1536)

Error information if chunk contains error

---

### finishReason?

> `optional` **finishReason?**: `"stop"` \| `"length"` \| `"tool-calls"` \| `"content-filter"` \| `"unknown"`

Defined in: [types/providers.ts:1538](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1538)

Finish reason for generation

---

### toolCall?

> `optional` **toolCall?**: [`SageMakerStreamingToolCall`](SageMakerStreamingToolCall.md)

Defined in: [types/providers.ts:1545](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1545)

Tool call in progress (Phase 2.3)

---

### toolResult?

> `optional` **toolResult?**: [`SageMakerStreamingToolResult`](SageMakerStreamingToolResult.md)

Defined in: [types/providers.ts:1547](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1547)

Tool result chunk (Phase 2.3)

---

### structuredOutput?

> `optional` **structuredOutput?**: [`SageMakerStructuredOutput`](SageMakerStructuredOutput.md)

Defined in: [types/providers.ts:1549](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1549)

Structured output streaming (Phase 2.3)
