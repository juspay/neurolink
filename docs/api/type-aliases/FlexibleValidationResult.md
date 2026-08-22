[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / FlexibleValidationResult

# Type Alias: FlexibleValidationResult

> **FlexibleValidationResult** = `object`

Defined in: [types/mcp.ts:812](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/mcp.ts#L812)

Flexible validation result
Moved from src/lib/mcp/flexibleToolValidator.ts

## Properties

### isValid

> **isValid**: `boolean`

Defined in: [types/mcp.ts:814](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/mcp.ts#L814)

Whether validation passed

---

### error?

> `optional` **error?**: `string`

Defined in: [types/mcp.ts:817](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/mcp.ts#L817)

Validation error message (for simple cases)

---

### warnings?

> `optional` **warnings?**: `string`[]

Defined in: [types/mcp.ts:820](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/mcp.ts#L820)

Validation warnings

---

### normalizedParams?

> `optional` **normalizedParams?**: `Record`\<`string`, `unknown`\>

Defined in: [types/mcp.ts:823](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/mcp.ts#L823)

Normalized parameters (if valid)

---

### metadata?

> `optional` **metadata?**: `object`

Defined in: [types/mcp.ts:826](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/mcp.ts#L826)

Validation metadata

#### validationTime?

> `optional` **validationTime?**: `number`

#### validator?

> `optional` **validator?**: `string`

#### schema?

> `optional` **schema?**: `string`
