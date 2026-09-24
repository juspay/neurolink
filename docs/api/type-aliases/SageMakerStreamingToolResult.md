[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / SageMakerStreamingToolResult

# Type Alias: SageMakerStreamingToolResult

> **SageMakerStreamingToolResult** = `object`

Defined in: [types/providers.ts:1696](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1696)

Streaming tool result information (Phase 2.3)

## Properties

### toolCallId

> **toolCallId**: `string`

Defined in: [types/providers.ts:1698](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1698)

Tool call identifier

---

### toolName

> **toolName**: `string`

Defined in: [types/providers.ts:1700](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1700)

Tool name

---

### result?

> `optional` **result?**: `unknown`

Defined in: [types/providers.ts:1702](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1702)

Partial or complete result data

---

### resultDelta?

> `optional` **resultDelta?**: `string`

Defined in: [types/providers.ts:1704](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1704)

Result delta for incremental responses

---

### status

> **status**: `"pending"` \| `"running"` \| `"success"` \| `"error"`

Defined in: [types/providers.ts:1706](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1706)

Execution status

---

### error?

> `optional` **error?**: `string`

Defined in: [types/providers.ts:1708](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1708)

Error message if status is error

---

### complete?

> `optional` **complete?**: `boolean`

Defined in: [types/providers.ts:1710](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1710)

Indicates if this result is complete
