[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / FlexibleValidationResult

# Type Alias: FlexibleValidationResult

> **FlexibleValidationResult** = `object`

Defined in: [types/mcp.ts:850](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L850)

Flexible validation result
Moved from src/lib/mcp/flexibleToolValidator.ts

## Properties

### isValid

> **isValid**: `boolean`

Defined in: [types/mcp.ts:852](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L852)

Whether validation passed

---

### error?

> `optional` **error?**: `string`

Defined in: [types/mcp.ts:855](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L855)

Validation error message (for simple cases)

---

### warnings?

> `optional` **warnings?**: `string`[]

Defined in: [types/mcp.ts:858](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L858)

Validation warnings

---

### normalizedParams?

> `optional` **normalizedParams?**: `Record`\<`string`, `unknown`\>

Defined in: [types/mcp.ts:861](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L861)

Normalized parameters (if valid)

---

### metadata?

> `optional` **metadata?**: `object`

Defined in: [types/mcp.ts:864](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L864)

Validation metadata

#### validationTime?

> `optional` **validationTime?**: `number`

#### validator?

> `optional` **validator?**: `string`

#### schema?

> `optional` **schema?**: `string`
