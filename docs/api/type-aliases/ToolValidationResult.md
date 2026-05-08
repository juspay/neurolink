[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / ToolValidationResult

# Type Alias: ToolValidationResult

> **ToolValidationResult** = `object`

Defined in: [types/mcp.ts:597](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/mcp.ts#L597)

Tool validation result
Moved from src/lib/mcp/toolDiscoveryService.ts

## Properties

### isValid

> **isValid**: `boolean`

Defined in: [types/mcp.ts:599](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/mcp.ts#L599)

Whether the tool is valid

---

### errors

> **errors**: `string`[]

Defined in: [types/mcp.ts:602](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/mcp.ts#L602)

Validation errors

---

### warnings

> **warnings**: `string`[]

Defined in: [types/mcp.ts:605](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/mcp.ts#L605)

Validation warnings

---

### metadata?

> `optional` **metadata?**: `object`

Defined in: [types/mcp.ts:608](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/mcp.ts#L608)

Tool metadata

#### category?

> `optional` **category?**: `string`

#### complexity?

> `optional` **complexity?**: `"simple"` \| `"moderate"` \| `"complex"`

#### requiresAuth?

> `optional` **requiresAuth?**: `boolean`

#### isDeprecated?

> `optional` **isDeprecated?**: `boolean`
