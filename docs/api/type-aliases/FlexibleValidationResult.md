[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / FlexibleValidationResult

# Type Alias: FlexibleValidationResult

> **FlexibleValidationResult** = `object`

Defined in: [types/mcp.ts:812](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/mcp.ts#L812)

Flexible validation result
Moved from src/lib/mcp/flexibleToolValidator.ts

## Properties

### isValid

> **isValid**: `boolean`

Defined in: [types/mcp.ts:814](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/mcp.ts#L814)

Whether validation passed

---

### error?

> `optional` **error?**: `string`

Defined in: [types/mcp.ts:817](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/mcp.ts#L817)

Validation error message (for simple cases)

---

### warnings?

> `optional` **warnings?**: `string`[]

Defined in: [types/mcp.ts:820](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/mcp.ts#L820)

Validation warnings

---

### normalizedParams?

> `optional` **normalizedParams?**: `Record`\<`string`, `unknown`\>

Defined in: [types/mcp.ts:823](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/mcp.ts#L823)

Normalized parameters (if valid)

---

### metadata?

> `optional` **metadata?**: `object`

Defined in: [types/mcp.ts:826](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/mcp.ts#L826)

Validation metadata

#### validationTime?

> `optional` **validationTime?**: `number`

#### validator?

> `optional` **validator?**: `string`

#### schema?

> `optional` **schema?**: `string`
