[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ToolValidationResult

# Type Alias: ToolValidationResult

> **ToolValidationResult** = `object`

Tool validation result
Moved from src/lib/mcp/toolDiscoveryService.ts

## Properties

### isValid

> **isValid**: `boolean`

Whether the tool is valid

---

### errors

> **errors**: `string`[]

Validation errors

---

### warnings

> **warnings**: `string`[]

Validation warnings

---

### metadata?

> `optional` **metadata?**: `object`

Tool metadata

#### category?

> `optional` **category?**: `string`

#### complexity?

> `optional` **complexity?**: `"simple"` \| `"moderate"` \| `"complex"`

#### requiresAuth?

> `optional` **requiresAuth?**: `boolean`

#### isDeprecated?

> `optional` **isDeprecated?**: `boolean`
