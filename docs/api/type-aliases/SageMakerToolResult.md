[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / SageMakerToolResult

# Type Alias: SageMakerToolResult

> **SageMakerToolResult** = `object`

Defined in: [types/providers.ts:1643](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1643)

Tool result information

## Properties

### toolCallId

> **toolCallId**: `string`

Defined in: [types/providers.ts:1645](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1645)

Tool call identifier

---

### toolName

> **toolName**: `string`

Defined in: [types/providers.ts:1647](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1647)

Tool name

---

### result

> **result**: `unknown`

Defined in: [types/providers.ts:1649](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1649)

Tool result data

---

### status

> **status**: `"success"` \| `"error"`

Defined in: [types/providers.ts:1651](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1651)

Execution status

---

### error?

> `optional` **error?**: `string`

Defined in: [types/providers.ts:1653](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1653)

Error message if status is error
