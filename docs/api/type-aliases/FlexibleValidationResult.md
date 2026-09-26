[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / FlexibleValidationResult

# Type Alias: FlexibleValidationResult

> **FlexibleValidationResult** = `object`

Flexible validation result
Moved from src/lib/mcp/flexibleToolValidator.ts

## Properties

### isValid

> **isValid**: `boolean`

Whether validation passed

---

### error?

> `optional` **error?**: `string`

Validation error message (for simple cases)

---

### warnings?

> `optional` **warnings?**: `string`[]

Validation warnings

---

### normalizedParams?

> `optional` **normalizedParams?**: `Record`\<`string`, `unknown`\>

Normalized parameters (if valid)

---

### metadata?

> `optional` **metadata?**: `object`

Validation metadata

#### validationTime?

> `optional` **validationTime?**: `number`

#### validator?

> `optional` **validator?**: `string`

#### schema?

> `optional` **schema?**: `string`
