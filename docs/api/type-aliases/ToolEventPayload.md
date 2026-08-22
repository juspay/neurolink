[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / ToolEventPayload

# Type Alias: ToolEventPayload

> **ToolEventPayload** = `object`

Defined in: [types/tools.ts:384](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/tools.ts#L384)

Payload emitted for tool:start and tool:end events.
Always includes both `tool` and `toolName` for backward compatibility.

## Properties

### tool

> **tool**: `string`

Defined in: [types/tools.ts:385](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/tools.ts#L385)

---

### toolName

> **toolName**: `string`

Defined in: [types/tools.ts:386](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/tools.ts#L386)

---

### input?

> `optional` **input?**: `unknown`

Defined in: [types/tools.ts:387](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/tools.ts#L387)

---

### result?

> `optional` **result?**: `unknown`

Defined in: [types/tools.ts:388](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/tools.ts#L388)

---

### error?

> `optional` **error?**: `string`

Defined in: [types/tools.ts:389](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/tools.ts#L389)

---

### success?

> `optional` **success?**: `boolean`

Defined in: [types/tools.ts:390](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/tools.ts#L390)

---

### responseTime?

> `optional` **responseTime?**: `number`

Defined in: [types/tools.ts:391](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/tools.ts#L391)

---

### timestamp?

> `optional` **timestamp?**: `number`

Defined in: [types/tools.ts:392](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/tools.ts#L392)

---

### duration?

> `optional` **duration?**: `number`

Defined in: [types/tools.ts:393](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/tools.ts#L393)

---

### executionId?

> `optional` **executionId?**: `string`

Defined in: [types/tools.ts:394](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/tools.ts#L394)
