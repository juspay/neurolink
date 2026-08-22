[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / SageMakerStreamingToolResult

# Type Alias: SageMakerStreamingToolResult

> **SageMakerStreamingToolResult** = `object`

Defined in: [types/providers.ts:1601](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1601)

Streaming tool result information (Phase 2.3)

## Properties

### toolCallId

> **toolCallId**: `string`

Defined in: [types/providers.ts:1603](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1603)

Tool call identifier

---

### toolName

> **toolName**: `string`

Defined in: [types/providers.ts:1605](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1605)

Tool name

---

### result?

> `optional` **result?**: `unknown`

Defined in: [types/providers.ts:1607](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1607)

Partial or complete result data

---

### resultDelta?

> `optional` **resultDelta?**: `string`

Defined in: [types/providers.ts:1609](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1609)

Result delta for incremental responses

---

### status

> **status**: `"pending"` \| `"running"` \| `"success"` \| `"error"`

Defined in: [types/providers.ts:1611](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1611)

Execution status

---

### error?

> `optional` **error?**: `string`

Defined in: [types/providers.ts:1613](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1613)

Error message if status is error

---

### complete?

> `optional` **complete?**: `boolean`

Defined in: [types/providers.ts:1615](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1615)

Indicates if this result is complete
