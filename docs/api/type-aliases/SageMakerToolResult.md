[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / SageMakerToolResult

# Type Alias: SageMakerToolResult

> **SageMakerToolResult** = `object`

Defined in: [types/providers.ts:1642](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1642)

Tool result information

## Properties

### toolCallId

> **toolCallId**: `string`

Defined in: [types/providers.ts:1644](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1644)

Tool call identifier

---

### toolName

> **toolName**: `string`

Defined in: [types/providers.ts:1646](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1646)

Tool name

---

### result

> **result**: `unknown`

Defined in: [types/providers.ts:1648](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1648)

Tool result data

---

### status

> **status**: `"success"` \| `"error"`

Defined in: [types/providers.ts:1650](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1650)

Execution status

---

### error?

> `optional` **error?**: `string`

Defined in: [types/providers.ts:1652](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1652)

Error message if status is error
