[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / SageMakerStreamingToolResult

# Type Alias: SageMakerStreamingToolResult

> **SageMakerStreamingToolResult** = `object`

Defined in: [types/providers.ts:1618](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1618)

Streaming tool result information (Phase 2.3)

## Properties

### toolCallId

> **toolCallId**: `string`

Defined in: [types/providers.ts:1620](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1620)

Tool call identifier

---

### toolName

> **toolName**: `string`

Defined in: [types/providers.ts:1622](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1622)

Tool name

---

### result?

> `optional` **result?**: `unknown`

Defined in: [types/providers.ts:1624](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1624)

Partial or complete result data

---

### resultDelta?

> `optional` **resultDelta?**: `string`

Defined in: [types/providers.ts:1626](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1626)

Result delta for incremental responses

---

### status

> **status**: `"pending"` \| `"running"` \| `"success"` \| `"error"`

Defined in: [types/providers.ts:1628](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1628)

Execution status

---

### error?

> `optional` **error?**: `string`

Defined in: [types/providers.ts:1630](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1630)

Error message if status is error

---

### complete?

> `optional` **complete?**: `boolean`

Defined in: [types/providers.ts:1632](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1632)

Indicates if this result is complete
