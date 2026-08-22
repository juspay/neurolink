[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / SageMakerToolResult

# Type Alias: SageMakerToolResult

> **SageMakerToolResult** = `object`

Defined in: [types/providers.ts:1567](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1567)

Tool result information

## Properties

### toolCallId

> **toolCallId**: `string`

Defined in: [types/providers.ts:1569](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1569)

Tool call identifier

---

### toolName

> **toolName**: `string`

Defined in: [types/providers.ts:1571](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1571)

Tool name

---

### result

> **result**: `unknown`

Defined in: [types/providers.ts:1573](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1573)

Tool result data

---

### status

> **status**: `"success"` \| `"error"`

Defined in: [types/providers.ts:1575](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1575)

Execution status

---

### error?

> `optional` **error?**: `string`

Defined in: [types/providers.ts:1577](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1577)

Error message if status is error
