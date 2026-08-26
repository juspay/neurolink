[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / SageMakerToolResult

# Type Alias: SageMakerToolResult

> **SageMakerToolResult** = `object`

Defined in: [types/providers.ts:1568](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1568)

Tool result information

## Properties

### toolCallId

> **toolCallId**: `string`

Defined in: [types/providers.ts:1570](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1570)

Tool call identifier

---

### toolName

> **toolName**: `string`

Defined in: [types/providers.ts:1572](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1572)

Tool name

---

### result

> **result**: `unknown`

Defined in: [types/providers.ts:1574](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1574)

Tool result data

---

### status

> **status**: `"success"` \| `"error"`

Defined in: [types/providers.ts:1576](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1576)

Execution status

---

### error?

> `optional` **error?**: `string`

Defined in: [types/providers.ts:1578](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1578)

Error message if status is error
