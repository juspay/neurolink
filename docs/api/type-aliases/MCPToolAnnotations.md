[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / MCPToolAnnotations

# Type Alias: MCPToolAnnotations

> **MCPToolAnnotations** = `object`

Defined in: [types/mcp.ts:1014](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/mcp.ts#L1014)

Tool annotation metadata for MCP tools.
Provides hints to AI models about tool behavior and safety.

## Properties

### title?

> `optional` **title?**: `string`

Defined in: [types/mcp.ts:1016](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/mcp.ts#L1016)

Human-readable title for the tool

---

### readOnlyHint?

> `optional` **readOnlyHint?**: `boolean`

Defined in: [types/mcp.ts:1018](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/mcp.ts#L1018)

Whether the tool only reads data without side effects

---

### destructiveHint?

> `optional` **destructiveHint?**: `boolean`

Defined in: [types/mcp.ts:1020](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/mcp.ts#L1020)

Whether the tool performs destructive operations

---

### idempotentHint?

> `optional` **idempotentHint?**: `boolean`

Defined in: [types/mcp.ts:1022](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/mcp.ts#L1022)

Whether the tool can be safely retried without side effects

---

### requiresConfirmation?

> `optional` **requiresConfirmation?**: `boolean`

Defined in: [types/mcp.ts:1024](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/mcp.ts#L1024)

Whether the tool requires user confirmation before execution

---

### openWorldHint?

> `optional` **openWorldHint?**: `boolean`

Defined in: [types/mcp.ts:1026](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/mcp.ts#L1026)

Whether the tool operates on an open world of resources

---

### tags?

> `optional` **tags?**: `string`[]

Defined in: [types/mcp.ts:1028](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/mcp.ts#L1028)

Custom tags for categorization and filtering

---

### estimatedDuration?

> `optional` **estimatedDuration?**: `number`

Defined in: [types/mcp.ts:1030](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/mcp.ts#L1030)

Estimated execution time in milliseconds

---

### rateLimitHint?

> `optional` **rateLimitHint?**: `number`

Defined in: [types/mcp.ts:1032](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/mcp.ts#L1032)

Rate limit hint (calls per minute)

---

### costHint?

> `optional` **costHint?**: `number`

Defined in: [types/mcp.ts:1034](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/mcp.ts#L1034)

Cost hint (arbitrary units for comparison)

---

### complexity?

> `optional` **complexity?**: `"simple"` \| `"medium"` \| `"complex"`

Defined in: [types/mcp.ts:1036](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/mcp.ts#L1036)

Complexity level for UI display

---

### auditRequired?

> `optional` **auditRequired?**: `boolean`

Defined in: [types/mcp.ts:1038](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/mcp.ts#L1038)

Whether tool execution should be audited/logged

---

### securityLevel?

> `optional` **securityLevel?**: `"public"` \| `"internal"` \| `"restricted"`

Defined in: [types/mcp.ts:1040](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/mcp.ts#L1040)

Security classification for the tool
