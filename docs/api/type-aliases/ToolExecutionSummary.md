[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / ToolExecutionSummary

# Type Alias: ToolExecutionSummary

> **ToolExecutionSummary** = `object`

Defined in: [types/tools.ts:383](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/tools.ts#L383)

Tool execution summary for completed executions

## Properties

### tool

> **tool**: `string`

Defined in: [types/tools.ts:384](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/tools.ts#L384)

---

### startTime

> **startTime**: `number`

Defined in: [types/tools.ts:385](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/tools.ts#L385)

---

### endTime

> **endTime**: `number`

Defined in: [types/tools.ts:386](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/tools.ts#L386)

---

### duration

> **duration**: `number`

Defined in: [types/tools.ts:387](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/tools.ts#L387)

---

### success

> **success**: `boolean`

Defined in: [types/tools.ts:388](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/tools.ts#L388)

---

### result?

> `optional` **result?**: `unknown`

Defined in: [types/tools.ts:389](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/tools.ts#L389)

---

### error?

> `optional` **error?**: `string`

Defined in: [types/tools.ts:390](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/tools.ts#L390)

---

### executionId

> **executionId**: `string`

Defined in: [types/tools.ts:391](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/tools.ts#L391)

---

### metadata?

> `optional` **metadata?**: `object`

Defined in: [types/tools.ts:392](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/tools.ts#L392)

#### serverId?

> `optional` **serverId?**: `string`

#### toolCategory?

> `optional` **toolCategory?**: `"direct"` \| `"custom"` \| `"mcp"`

#### isExternal?

> `optional` **isExternal?**: `boolean`
