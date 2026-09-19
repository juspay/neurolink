[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / SageMakerToolResult

# Type Alias: SageMakerToolResult

> **SageMakerToolResult** = `object`

Defined in: [types/providers.ts:1612](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1612)

Tool result information

## Properties

### toolCallId

> **toolCallId**: `string`

Defined in: [types/providers.ts:1614](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1614)

Tool call identifier

---

### toolName

> **toolName**: `string`

Defined in: [types/providers.ts:1616](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1616)

Tool name

---

### result

> **result**: `unknown`

Defined in: [types/providers.ts:1618](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1618)

Tool result data

---

### status

> **status**: `"success"` \| `"error"`

Defined in: [types/providers.ts:1620](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1620)

Execution status

---

### error?

> `optional` **error?**: `string`

Defined in: [types/providers.ts:1622](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1622)

Error message if status is error
