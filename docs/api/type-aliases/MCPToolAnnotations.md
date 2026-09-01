[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / MCPToolAnnotations

# Type Alias: MCPToolAnnotations

> **MCPToolAnnotations** = `object`

Defined in: [types/mcp.ts:1033](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L1033)

Tool annotation metadata for MCP tools.
Provides hints to AI models about tool behavior and safety.

## Properties

### title?

> `optional` **title?**: `string`

Defined in: [types/mcp.ts:1035](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L1035)

Human-readable title for the tool

---

### readOnlyHint?

> `optional` **readOnlyHint?**: `boolean`

Defined in: [types/mcp.ts:1037](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L1037)

Whether the tool only reads data without side effects

---

### destructiveHint?

> `optional` **destructiveHint?**: `boolean`

Defined in: [types/mcp.ts:1039](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L1039)

Whether the tool performs destructive operations

---

### idempotentHint?

> `optional` **idempotentHint?**: `boolean`

Defined in: [types/mcp.ts:1041](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L1041)

Whether the tool can be safely retried without side effects

---

### requiresConfirmation?

> `optional` **requiresConfirmation?**: `boolean`

Defined in: [types/mcp.ts:1043](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L1043)

Whether the tool requires user confirmation before execution

---

### openWorldHint?

> `optional` **openWorldHint?**: `boolean`

Defined in: [types/mcp.ts:1045](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L1045)

Whether the tool operates on an open world of resources

---

### tags?

> `optional` **tags?**: `string`[]

Defined in: [types/mcp.ts:1047](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L1047)

Custom tags for categorization and filtering

---

### estimatedDuration?

> `optional` **estimatedDuration?**: `number`

Defined in: [types/mcp.ts:1049](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L1049)

Estimated execution time in milliseconds

---

### rateLimitHint?

> `optional` **rateLimitHint?**: `number`

Defined in: [types/mcp.ts:1051](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L1051)

Rate limit hint (calls per minute)

---

### costHint?

> `optional` **costHint?**: `number`

Defined in: [types/mcp.ts:1053](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L1053)

Cost hint (arbitrary units for comparison)

---

### complexity?

> `optional` **complexity?**: `"simple"` \| `"medium"` \| `"complex"`

Defined in: [types/mcp.ts:1055](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L1055)

Complexity level for UI display

---

### auditRequired?

> `optional` **auditRequired?**: `boolean`

Defined in: [types/mcp.ts:1057](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L1057)

Whether tool execution should be audited/logged

---

### securityLevel?

> `optional` **securityLevel?**: `"public"` \| `"internal"` \| `"restricted"`

Defined in: [types/mcp.ts:1059](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L1059)

Security classification for the tool
