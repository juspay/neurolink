[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / SageMakerStreamChunk

# Type Alias: SageMakerStreamChunk

> **SageMakerStreamChunk** = `object`

Streaming response chunk from SageMaker

## Properties

### content?

> `optional` **content?**: `string`

Text content in the chunk

---

### done?

> `optional` **done?**: `boolean`

Indicates if this is the final chunk

---

### usage?

> `optional` **usage?**: [`SageMakerUsage`](SageMakerUsage.md)

Usage information (only in final chunk)

---

### error?

> `optional` **error?**: `string`

Error information if chunk contains error

---

### finishReason?

> `optional` **finishReason?**: `"stop"` \| `"length"` \| `"tool-calls"` \| `"content-filter"` \| `"unknown"`

Finish reason for generation

---

### toolCall?

> `optional` **toolCall?**: [`SageMakerStreamingToolCall`](SageMakerStreamingToolCall.md)

Tool call in progress (Phase 2.3)

---

### toolResult?

> `optional` **toolResult?**: [`SageMakerStreamingToolResult`](SageMakerStreamingToolResult.md)

Tool result chunk (Phase 2.3)

---

### structuredOutput?

> `optional` **structuredOutput?**: [`SageMakerStructuredOutput`](SageMakerStructuredOutput.md)

Structured output streaming (Phase 2.3)
