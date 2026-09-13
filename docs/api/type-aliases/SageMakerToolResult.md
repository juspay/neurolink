[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / SageMakerToolResult

# Type Alias: SageMakerToolResult

> **SageMakerToolResult** = `object`

Defined in: [types/providers.ts:1585](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1585)

Tool result information

## Properties

### toolCallId

> **toolCallId**: `string`

Defined in: [types/providers.ts:1587](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1587)

Tool call identifier

---

### toolName

> **toolName**: `string`

Defined in: [types/providers.ts:1589](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1589)

Tool name

---

### result

> **result**: `unknown`

Defined in: [types/providers.ts:1591](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1591)

Tool result data

---

### status

> **status**: `"success"` \| `"error"`

Defined in: [types/providers.ts:1593](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1593)

Execution status

---

### error?

> `optional` **error?**: `string`

Defined in: [types/providers.ts:1595](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1595)

Error message if status is error
