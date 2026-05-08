[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / ToolEventPayload

# Type Alias: ToolEventPayload

> **ToolEventPayload** = `object`

Defined in: [types/tools.ts:367](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/tools.ts#L367)

Payload emitted for tool:start and tool:end events.
Always includes both `tool` and `toolName` for backward compatibility.

## Properties

### tool

> **tool**: `string`

Defined in: [types/tools.ts:368](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/tools.ts#L368)

---

### toolName

> **toolName**: `string`

Defined in: [types/tools.ts:369](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/tools.ts#L369)

---

### input?

> `optional` **input?**: `unknown`

Defined in: [types/tools.ts:370](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/tools.ts#L370)

---

### result?

> `optional` **result?**: `unknown`

Defined in: [types/tools.ts:371](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/tools.ts#L371)

---

### error?

> `optional` **error?**: `string`

Defined in: [types/tools.ts:372](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/tools.ts#L372)

---

### success?

> `optional` **success?**: `boolean`

Defined in: [types/tools.ts:373](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/tools.ts#L373)

---

### responseTime?

> `optional` **responseTime?**: `number`

Defined in: [types/tools.ts:374](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/tools.ts#L374)

---

### timestamp?

> `optional` **timestamp?**: `number`

Defined in: [types/tools.ts:375](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/tools.ts#L375)

---

### duration?

> `optional` **duration?**: `number`

Defined in: [types/tools.ts:376](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/tools.ts#L376)

---

### executionId?

> `optional` **executionId?**: `string`

Defined in: [types/tools.ts:377](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/tools.ts#L377)
