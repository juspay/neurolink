[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / SageMakerStreamingToolResult

# Type Alias: SageMakerStreamingToolResult

> **SageMakerStreamingToolResult** = `object`

Defined in: [types/providers.ts:1676](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1676)

Streaming tool result information (Phase 2.3)

## Properties

### toolCallId

> **toolCallId**: `string`

Defined in: [types/providers.ts:1678](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1678)

Tool call identifier

---

### toolName

> **toolName**: `string`

Defined in: [types/providers.ts:1680](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1680)

Tool name

---

### result?

> `optional` **result?**: `unknown`

Defined in: [types/providers.ts:1682](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1682)

Partial or complete result data

---

### resultDelta?

> `optional` **resultDelta?**: `string`

Defined in: [types/providers.ts:1684](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1684)

Result delta for incremental responses

---

### status

> **status**: `"pending"` \| `"running"` \| `"success"` \| `"error"`

Defined in: [types/providers.ts:1686](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1686)

Execution status

---

### error?

> `optional` **error?**: `string`

Defined in: [types/providers.ts:1688](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1688)

Error message if status is error

---

### complete?

> `optional` **complete?**: `boolean`

Defined in: [types/providers.ts:1690](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1690)

Indicates if this result is complete
