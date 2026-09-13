[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ToolValidationResult

# Type Alias: ToolValidationResult

> **ToolValidationResult** = `object`

Defined in: [types/mcp.ts:635](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L635)

Tool validation result
Moved from src/lib/mcp/toolDiscoveryService.ts

## Properties

### isValid

> **isValid**: `boolean`

Defined in: [types/mcp.ts:637](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L637)

Whether the tool is valid

---

### errors

> **errors**: `string`[]

Defined in: [types/mcp.ts:640](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L640)

Validation errors

---

### warnings

> **warnings**: `string`[]

Defined in: [types/mcp.ts:643](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L643)

Validation warnings

---

### metadata?

> `optional` **metadata?**: `object`

Defined in: [types/mcp.ts:646](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L646)

Tool metadata

#### category?

> `optional` **category?**: `string`

#### complexity?

> `optional` **complexity?**: `"simple"` \| `"moderate"` \| `"complex"`

#### requiresAuth?

> `optional` **requiresAuth?**: `boolean`

#### isDeprecated?

> `optional` **isDeprecated?**: `boolean`
