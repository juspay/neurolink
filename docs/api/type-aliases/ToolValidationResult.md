[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ToolValidationResult

# Type Alias: ToolValidationResult

> **ToolValidationResult** = `object`

Defined in: [types/mcp.ts:616](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L616)

Tool validation result
Moved from src/lib/mcp/toolDiscoveryService.ts

## Properties

### isValid

> **isValid**: `boolean`

Defined in: [types/mcp.ts:618](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L618)

Whether the tool is valid

---

### errors

> **errors**: `string`[]

Defined in: [types/mcp.ts:621](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L621)

Validation errors

---

### warnings

> **warnings**: `string`[]

Defined in: [types/mcp.ts:624](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L624)

Validation warnings

---

### metadata?

> `optional` **metadata?**: `object`

Defined in: [types/mcp.ts:627](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L627)

Tool metadata

#### category?

> `optional` **category?**: `string`

#### complexity?

> `optional` **complexity?**: `"simple"` \| `"moderate"` \| `"complex"`

#### requiresAuth?

> `optional` **requiresAuth?**: `boolean`

#### isDeprecated?

> `optional` **isDeprecated?**: `boolean`
