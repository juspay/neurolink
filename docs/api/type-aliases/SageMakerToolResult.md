[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / SageMakerToolResult

# Type Alias: SageMakerToolResult

> **SageMakerToolResult** = `object`

Defined in: [types/providers.ts:1650](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1650)

Tool result information

## Properties

### toolCallId

> **toolCallId**: `string`

Defined in: [types/providers.ts:1652](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1652)

Tool call identifier

---

### toolName

> **toolName**: `string`

Defined in: [types/providers.ts:1654](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1654)

Tool name

---

### result

> **result**: `unknown`

Defined in: [types/providers.ts:1656](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1656)

Tool result data

---

### status

> **status**: `"success"` \| `"error"`

Defined in: [types/providers.ts:1658](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1658)

Execution status

---

### error?

> `optional` **error?**: `string`

Defined in: [types/providers.ts:1660](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1660)

Error message if status is error
