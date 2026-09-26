[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / SageMakerStreamingToolResult

# Type Alias: SageMakerStreamingToolResult

> **SageMakerStreamingToolResult** = `object`

Defined in: [types/providers.ts:1705](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1705)

Streaming tool result information (Phase 2.3)

## Properties

### toolCallId

> **toolCallId**: `string`

Defined in: [types/providers.ts:1707](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1707)

Tool call identifier

---

### toolName

> **toolName**: `string`

Defined in: [types/providers.ts:1709](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1709)

Tool name

---

### result?

> `optional` **result?**: `unknown`

Defined in: [types/providers.ts:1711](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1711)

Partial or complete result data

---

### resultDelta?

> `optional` **resultDelta?**: `string`

Defined in: [types/providers.ts:1713](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1713)

Result delta for incremental responses

---

### status

> **status**: `"pending"` \| `"running"` \| `"success"` \| `"error"`

Defined in: [types/providers.ts:1715](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1715)

Execution status

---

### error?

> `optional` **error?**: `string`

Defined in: [types/providers.ts:1717](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1717)

Error message if status is error

---

### complete?

> `optional` **complete?**: `boolean`

Defined in: [types/providers.ts:1719](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1719)

Indicates if this result is complete
