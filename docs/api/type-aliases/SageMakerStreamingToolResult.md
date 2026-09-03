[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / SageMakerStreamingToolResult

# Type Alias: SageMakerStreamingToolResult

> **SageMakerStreamingToolResult** = `object`

Defined in: [types/providers.ts:1623](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1623)

Streaming tool result information (Phase 2.3)

## Properties

### toolCallId

> **toolCallId**: `string`

Defined in: [types/providers.ts:1625](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1625)

Tool call identifier

---

### toolName

> **toolName**: `string`

Defined in: [types/providers.ts:1627](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1627)

Tool name

---

### result?

> `optional` **result?**: `unknown`

Defined in: [types/providers.ts:1629](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1629)

Partial or complete result data

---

### resultDelta?

> `optional` **resultDelta?**: `string`

Defined in: [types/providers.ts:1631](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1631)

Result delta for incremental responses

---

### status

> **status**: `"pending"` \| `"running"` \| `"success"` \| `"error"`

Defined in: [types/providers.ts:1633](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1633)

Execution status

---

### error?

> `optional` **error?**: `string`

Defined in: [types/providers.ts:1635](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1635)

Error message if status is error

---

### complete?

> `optional` **complete?**: `boolean`

Defined in: [types/providers.ts:1637](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1637)

Indicates if this result is complete
