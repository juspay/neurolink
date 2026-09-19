[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / SageMakerStreamingToolResult

# Type Alias: SageMakerStreamingToolResult

> **SageMakerStreamingToolResult** = `object`

Defined in: [types/providers.ts:1677](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1677)

Streaming tool result information (Phase 2.3)

## Properties

### toolCallId

> **toolCallId**: `string`

Defined in: [types/providers.ts:1679](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1679)

Tool call identifier

---

### toolName

> **toolName**: `string`

Defined in: [types/providers.ts:1681](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1681)

Tool name

---

### result?

> `optional` **result?**: `unknown`

Defined in: [types/providers.ts:1683](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1683)

Partial or complete result data

---

### resultDelta?

> `optional` **resultDelta?**: `string`

Defined in: [types/providers.ts:1685](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1685)

Result delta for incremental responses

---

### status

> **status**: `"pending"` \| `"running"` \| `"success"` \| `"error"`

Defined in: [types/providers.ts:1687](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1687)

Execution status

---

### error?

> `optional` **error?**: `string`

Defined in: [types/providers.ts:1689](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1689)

Error message if status is error

---

### complete?

> `optional` **complete?**: `boolean`

Defined in: [types/providers.ts:1691](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1691)

Indicates if this result is complete
