[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / SageMakerStreamingToolResult

# Type Alias: SageMakerStreamingToolResult

> **SageMakerStreamingToolResult** = `object`

Defined in: [types/providers.ts:1602](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1602)

Streaming tool result information (Phase 2.3)

## Properties

### toolCallId

> **toolCallId**: `string`

Defined in: [types/providers.ts:1604](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1604)

Tool call identifier

---

### toolName

> **toolName**: `string`

Defined in: [types/providers.ts:1606](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1606)

Tool name

---

### result?

> `optional` **result?**: `unknown`

Defined in: [types/providers.ts:1608](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1608)

Partial or complete result data

---

### resultDelta?

> `optional` **resultDelta?**: `string`

Defined in: [types/providers.ts:1610](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1610)

Result delta for incremental responses

---

### status

> **status**: `"pending"` \| `"running"` \| `"success"` \| `"error"`

Defined in: [types/providers.ts:1612](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1612)

Execution status

---

### error?

> `optional` **error?**: `string`

Defined in: [types/providers.ts:1614](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1614)

Error message if status is error

---

### complete?

> `optional` **complete?**: `boolean`

Defined in: [types/providers.ts:1616](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1616)

Indicates if this result is complete
