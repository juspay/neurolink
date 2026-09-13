[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / SageMakerToolResult

# Type Alias: SageMakerToolResult

> **SageMakerToolResult** = `object`

Defined in: [types/providers.ts:1584](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1584)

Tool result information

## Properties

### toolCallId

> **toolCallId**: `string`

Defined in: [types/providers.ts:1586](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1586)

Tool call identifier

---

### toolName

> **toolName**: `string`

Defined in: [types/providers.ts:1588](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1588)

Tool name

---

### result

> **result**: `unknown`

Defined in: [types/providers.ts:1590](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1590)

Tool result data

---

### status

> **status**: `"success"` \| `"error"`

Defined in: [types/providers.ts:1592](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1592)

Execution status

---

### error?

> `optional` **error?**: `string`

Defined in: [types/providers.ts:1594](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1594)

Error message if status is error
