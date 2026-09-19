[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / SageMakerStreamingToolResult

# Type Alias: SageMakerStreamingToolResult

> **SageMakerStreamingToolResult** = `object`

Defined in: [types/providers.ts:1646](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1646)

Streaming tool result information (Phase 2.3)

## Properties

### toolCallId

> **toolCallId**: `string`

Defined in: [types/providers.ts:1648](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1648)

Tool call identifier

---

### toolName

> **toolName**: `string`

Defined in: [types/providers.ts:1650](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1650)

Tool name

---

### result?

> `optional` **result?**: `unknown`

Defined in: [types/providers.ts:1652](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1652)

Partial or complete result data

---

### resultDelta?

> `optional` **resultDelta?**: `string`

Defined in: [types/providers.ts:1654](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1654)

Result delta for incremental responses

---

### status

> **status**: `"pending"` \| `"running"` \| `"success"` \| `"error"`

Defined in: [types/providers.ts:1656](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1656)

Execution status

---

### error?

> `optional` **error?**: `string`

Defined in: [types/providers.ts:1658](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1658)

Error message if status is error

---

### complete?

> `optional` **complete?**: `boolean`

Defined in: [types/providers.ts:1660](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1660)

Indicates if this result is complete
