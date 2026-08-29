[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / SageMakerStreamingToolResult

# Type Alias: SageMakerStreamingToolResult

> **SageMakerStreamingToolResult** = `object`

Defined in: [types/providers.ts:1615](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1615)

Streaming tool result information (Phase 2.3)

## Properties

### toolCallId

> **toolCallId**: `string`

Defined in: [types/providers.ts:1617](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1617)

Tool call identifier

---

### toolName

> **toolName**: `string`

Defined in: [types/providers.ts:1619](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1619)

Tool name

---

### result?

> `optional` **result?**: `unknown`

Defined in: [types/providers.ts:1621](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1621)

Partial or complete result data

---

### resultDelta?

> `optional` **resultDelta?**: `string`

Defined in: [types/providers.ts:1623](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1623)

Result delta for incremental responses

---

### status

> **status**: `"pending"` \| `"running"` \| `"success"` \| `"error"`

Defined in: [types/providers.ts:1625](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1625)

Execution status

---

### error?

> `optional` **error?**: `string`

Defined in: [types/providers.ts:1627](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1627)

Error message if status is error

---

### complete?

> `optional` **complete?**: `boolean`

Defined in: [types/providers.ts:1629](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1629)

Indicates if this result is complete
