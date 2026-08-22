[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ToolValidationResult

# Type Alias: ToolValidationResult

> **ToolValidationResult** = `object`

Defined in: [types/mcp.ts:597](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L597)

Tool validation result
Moved from src/lib/mcp/toolDiscoveryService.ts

## Properties

### isValid

> **isValid**: `boolean`

Defined in: [types/mcp.ts:599](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L599)

Whether the tool is valid

---

### errors

> **errors**: `string`[]

Defined in: [types/mcp.ts:602](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L602)

Validation errors

---

### warnings

> **warnings**: `string`[]

Defined in: [types/mcp.ts:605](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L605)

Validation warnings

---

### metadata?

> `optional` **metadata?**: `object`

Defined in: [types/mcp.ts:608](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L608)

Tool metadata

#### category?

> `optional` **category?**: `string`

#### complexity?

> `optional` **complexity?**: `"simple"` \| `"moderate"` \| `"complex"`

#### requiresAuth?

> `optional` **requiresAuth?**: `boolean`

#### isDeprecated?

> `optional` **isDeprecated?**: `boolean`
