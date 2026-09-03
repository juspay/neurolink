[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ToolEventPayload

# Type Alias: ToolEventPayload

> **ToolEventPayload** = `object`

Defined in: [types/tools.ts:418](https://github.com/juspay/neurolink/blob/release/src/lib/types/tools.ts#L418)

Payload emitted for tool:start and tool:end events.
Always includes both `tool` and `toolName` for backward compatibility.

## Properties

### tool

> **tool**: `string`

Defined in: [types/tools.ts:419](https://github.com/juspay/neurolink/blob/release/src/lib/types/tools.ts#L419)

---

### toolName

> **toolName**: `string`

Defined in: [types/tools.ts:420](https://github.com/juspay/neurolink/blob/release/src/lib/types/tools.ts#L420)

---

### input?

> `optional` **input?**: `unknown`

Defined in: [types/tools.ts:421](https://github.com/juspay/neurolink/blob/release/src/lib/types/tools.ts#L421)

---

### result?

> `optional` **result?**: `unknown`

Defined in: [types/tools.ts:422](https://github.com/juspay/neurolink/blob/release/src/lib/types/tools.ts#L422)

---

### error?

> `optional` **error?**: `string`

Defined in: [types/tools.ts:423](https://github.com/juspay/neurolink/blob/release/src/lib/types/tools.ts#L423)

---

### success?

> `optional` **success?**: `boolean`

Defined in: [types/tools.ts:424](https://github.com/juspay/neurolink/blob/release/src/lib/types/tools.ts#L424)

---

### responseTime?

> `optional` **responseTime?**: `number`

Defined in: [types/tools.ts:425](https://github.com/juspay/neurolink/blob/release/src/lib/types/tools.ts#L425)

---

### timestamp?

> `optional` **timestamp?**: `number`

Defined in: [types/tools.ts:426](https://github.com/juspay/neurolink/blob/release/src/lib/types/tools.ts#L426)

---

### duration?

> `optional` **duration?**: `number`

Defined in: [types/tools.ts:427](https://github.com/juspay/neurolink/blob/release/src/lib/types/tools.ts#L427)

---

### executionId?

> `optional` **executionId?**: `string`

Defined in: [types/tools.ts:428](https://github.com/juspay/neurolink/blob/release/src/lib/types/tools.ts#L428)
