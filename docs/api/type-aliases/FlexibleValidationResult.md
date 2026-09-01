[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / FlexibleValidationResult

# Type Alias: FlexibleValidationResult

> **FlexibleValidationResult** = `object`

Defined in: [types/mcp.ts:831](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L831)

Flexible validation result
Moved from src/lib/mcp/flexibleToolValidator.ts

## Properties

### isValid

> **isValid**: `boolean`

Defined in: [types/mcp.ts:833](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L833)

Whether validation passed

---

### error?

> `optional` **error?**: `string`

Defined in: [types/mcp.ts:836](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L836)

Validation error message (for simple cases)

---

### warnings?

> `optional` **warnings?**: `string`[]

Defined in: [types/mcp.ts:839](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L839)

Validation warnings

---

### normalizedParams?

> `optional` **normalizedParams?**: `Record`\<`string`, `unknown`\>

Defined in: [types/mcp.ts:842](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L842)

Normalized parameters (if valid)

---

### metadata?

> `optional` **metadata?**: `object`

Defined in: [types/mcp.ts:845](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L845)

Validation metadata

#### validationTime?

> `optional` **validationTime?**: `number`

#### validator?

> `optional` **validator?**: `string`

#### schema?

> `optional` **schema?**: `string`
